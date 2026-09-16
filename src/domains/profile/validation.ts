/**
 * Profile input validation.
 *
 * Every field of a Brand or Artist profile is optional (spec §6.1), so
 * validation rejects malformed values rather than missing ones, and explains
 * itself in plain language. Validators are generated from the field
 * definitions in `fields.ts`, so a form field can never arrive unvalidated.
 *
 * This module is the only place that reads raw form input for profiles: the
 * server action hands it the submitted `FormData` and receives either the
 * values to write or the messages to show.
 */

import { z } from "zod";

import {
  artistProfileGroups,
  brandProfileGroups,
  colourKeysInOrder,
  profileFields,
  profileGroupsFor,
  socialLinkKeys,
  streamingLinkKeys,
  typographyKeysInOrder,
  type ArtistProfileWrite,
  type BrandProfileWrite,
  type ProfileFieldDef,
  type ProfileFieldGroup,
} from "./fields";
import type { BrandColors, StreamingLinks, SocialLinks, Typography } from "@/lib/db/schema";

/** Longest value accepted for a single field. */
const MAX_LINK_LENGTH = 2048;

/** A hex colour with 3, 4, 6 or 8 digits. */
const HEX_COLOUR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

/** Deliberately conservative: something@something.tld. */
const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits, spaces, and the punctuation phone numbers actually use. */
const PHONE_CHARACTERS = /^[+()\d][\d\s()+.-]*$/;

/**
 * Accept a link the way people type it: `example.com/page` becomes
 * `https://example.com/page`. Anything with another scheme is left alone so
 * the validator can reject it.
 */
function normalizeLink(value: string): string {
  if (value === "") return "";
  return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
}

/** Whether a normalized value is an http(s) link with a real host. */
function isLink(value: string): boolean {
  if (value === "") return true;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  return parsed.hostname === "localhost" || parsed.hostname.includes(".");
}

/** Expand `abc` to `#aabbcc`; `null` when the value is not a hex colour. */
function hexColour(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!HEX_COLOUR.test(prefixed)) {
    return null;
  }

  if (prefixed.length === 4 || prefixed.length === 5) {
    // Expand shorthand (#abc / #abcd) so the stored value is unambiguous.
    return `#${prefixed
      .slice(1)
      .split("")
      .map((digit) => `${digit}${digit}`)
      .join("")}`;
  }

  return prefixed;
}

/** Compress a colour to its stored form; empty stays empty. */
export function normalizeColour(value: string): string {
  if (value.trim() === "") return "";
  return hexColour(value) ?? "";
}

type StringValidator = z.ZodType<string, z.ZodTypeDef, string>;

function maxFor(field: ProfileFieldDef): number {
  return field.maxLength ?? 600;
}

function textValidator(field: ProfileFieldDef): StringValidator {
  const max = maxFor(field);
  return z
    .string()
    .trim()
    .max(max, `Please keep this to ${max} characters or fewer.`);
}

function urlValidator(field: ProfileFieldDef): StringValidator {
  const max = Math.min(maxFor(field), MAX_LINK_LENGTH);
  const example = field.placeholder ?? "https://example.com";
  return z
    .string()
    .trim()
    .max(max, `Please keep this link to ${max} characters or fewer.`)
    .transform(normalizeLink)
    .refine(isLink, {
      message: `Enter a full link, for example ${example}.`,
    });
}

function emailValidator(field: ProfileFieldDef): StringValidator {
  const max = maxFor(field);
  return z
    .string()
    .trim()
    .max(max, `Please keep this to ${max} characters or fewer.`)
    .refine((value) => value === "" || EMAIL_ADDRESS.test(value), {
      message: "Enter a valid email address, for example name@company.com.",
    });
}

function phoneValidator(field: ProfileFieldDef): StringValidator {
  const max = maxFor(field);
  return z
    .string()
    .trim()
    .max(max, `Please keep this to ${max} characters or fewer.`)
    .refine((value) => value === "" || PHONE_CHARACTERS.test(value), {
      message: "Use digits, spaces and + ( ) - only.",
    })
    .refine(
      (value) => {
        if (value === "") return true;
        const digits = value.replace(/\D/g, "").length;
        return digits >= 6 && digits <= 20;
      },
      { message: "Enter a phone number with between 6 and 20 digits." },
    );
}

function colourValidator(field: ProfileFieldDef): StringValidator {
  const max = maxFor(field);
  return z
    .string()
    .trim()
    .max(max, `Please keep this to ${max} characters or fewer.`)
    .refine((value) => value === "" || hexColour(value) !== null, {
      message: "Use a hex colour, for example #C0392B.",
    })
    .transform(normalizeColour);
}

function validatorFor(field: ProfileFieldDef): StringValidator {
  switch (field.kind) {
    case "url":
      return urlValidator(field);
    case "email":
      return emailValidator(field);
    case "tel":
      return phoneValidator(field);
    case "color":
      return colourValidator(field);
    case "textarea":
    case "text":
      return textValidator(field);
  }
}

/** One validator per field of the profile, keyed by field name. */
function schemaFor(groups: ProfileFieldGroup[]) {
  const shape: Record<string, StringValidator> = {};
  for (const field of profileFields(groups)) {
    shape[field.name] = validatorFor(field);
  }
  return z.object(shape);
}

const brandSchema = schemaFor(brandProfileGroups);
const artistSchema = schemaFor(artistProfileGroups);

/** A submitted value, keyed by field name, exactly as the customer typed it. */
export type RawProfileValues = Record<string, string>;

export type ProfileParseResult<T> =
  | { ok: true; values: T; raw: RawProfileValues }
  | { ok: false; fieldErrors: Record<string, string>; raw: RawProfileValues };

function readSubmittedValues(
  groups: ProfileFieldGroup[],
  formData: FormData,
): RawProfileValues {
  const raw: RawProfileValues = {};
  for (const field of profileFields(groups)) {
    const value = formData.get(field.name);
    raw[field.name] = typeof value === "string" ? value : "";
  }
  return raw;
}

/** First message per field, keyed so the form can show it in place. */
function messagesFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join(".");
    if (!(name in fieldErrors)) {
      fieldErrors[name] = issue.message;
    }
  }
  return fieldErrors;
}

/** A field the customer left blank is stored as absent, not as "". */
function orNull(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/** Collect the filled members of a JSON column, or null when none are filled. */
function jsonGroup<T extends object>(
  values: RawProfileValues,
  column: string,
  keys: readonly string[],
): T | null {
  const entries = keys
    .map((key) => [key, values[`${column}.${key}`] ?? ""] as const)
    .filter(([, value]) => value !== "");

  if (entries.length === 0) {
    return null;
  }

  // The entries are the validated keys of this JSON column.
  return Object.fromEntries(entries) as T;
}

/** Brand columns to write, in the shape the database stores them. */
function buildBrandWrite(values: RawProfileValues): BrandProfileWrite {
  return {
    name: orNull(values.name),
    legalName: orNull(values.legalName),
    description: orNull(values.description),
    industry: orNull(values.industry),
    productsServices: orNull(values.productsServices),
    location: orNull(values.location),
    address: orNull(values.address),
    contactEmail: orNull(values.contactEmail),
    contactPhone: orNull(values.contactPhone),
    website: orNull(values.website),
    socialLinks: jsonGroup<SocialLinks>(values, "socialLinks", socialLinkKeys),
    primaryLogo: orNull(values.primaryLogo),
    secondaryLogo: orNull(values.secondaryLogo),
    colors: jsonGroup<BrandColors>(values, "colors", colourKeysInOrder),
    typography: jsonGroup<Typography>(
      values,
      "typography",
      typographyKeysInOrder,
    ),
    visualStyle: orNull(values.visualStyle),
    imageryStyle: orNull(values.imageryStyle),
    preferredLayouts: orNull(values.preferredLayouts),
    references: orNull(values.references),
    personality: orNull(values.personality),
    voice: orNull(values.voice),
    tone: orNull(values.tone),
    targetAudience: orNull(values.targetAudience),
    valueProposition: orNull(values.valueProposition),
    otherInfo: orNull(values.otherInfo),
  };
}

/** Artist columns to write, in the shape the database stores them. */
function buildArtistWrite(values: RawProfileValues): ArtistProfileWrite {
  return {
    name: orNull(values.name),
    bio: orNull(values.bio),
    genre: orNull(values.genre),
    location: orNull(values.location),
    contactEmail: orNull(values.contactEmail),
    contactPhone: orNull(values.contactPhone),
    website: orNull(values.website),
    socialLinks: jsonGroup<SocialLinks>(values, "socialLinks", socialLinkKeys),
    streamingLinks: jsonGroup<StreamingLinks>(
      values,
      "streamingLinks",
      streamingLinkKeys,
    ),
    visualIdentity: orNull(values.visualIdentity),
    colors: jsonGroup<BrandColors>(values, "colors", colourKeysInOrder),
    creativePreferences: orNull(values.creativePreferences),
    otherInfo: orNull(values.otherInfo),
  };
}

/**
 * Validate a submitted Brand profile.
 *
 * Returns the columns to write when every entry is well formed, or the
 * messages to show (with the entries the customer typed, so nothing is lost).
 */
export function parseBrandProfileForm(
  formData: FormData,
): ProfileParseResult<BrandProfileWrite> {
  const groups = profileGroupsFor("brand");
  const raw = readSubmittedValues(groups, formData);
  const result = brandSchema.safeParse(raw);

  if (!result.success) {
    return { ok: false, fieldErrors: messagesFrom(result.error), raw };
  }

  return { ok: true, values: buildBrandWrite(result.data), raw };
}

/** Validate a submitted Artist profile. Same contract as the Brand profile. */
export function parseArtistProfileForm(
  formData: FormData,
): ProfileParseResult<ArtistProfileWrite> {
  const groups = profileGroupsFor("artist");
  const raw = readSubmittedValues(groups, formData);
  const result = artistSchema.safeParse(raw);

  if (!result.success) {
    return { ok: false, fieldErrors: messagesFrom(result.error), raw };
  }

  return { ok: true, values: buildArtistWrite(result.data), raw };
}