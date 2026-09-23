/**
 * Request form validation.
 *
 * A request is created once and read many times, so this module rejects
 * malformed input before anything is written and explains itself in plain
 * language (spec §24). It is the only place that reads raw form input for
 * requests: the server action hands it the submitted `FormData` and receives
 * either the columns to write or the messages to show.
 *
 * The category is validated against the list for the *submitted* context, so
 * a value belonging to the other context — or invented by a client — can
 * never be stored.
 */

import { z } from "zod";

import type { WorkspaceContext } from "@/lib/navigation";
import { isRequestCategory } from "./categories";

/** Longest values accepted, per field. */
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 4000;
const MAX_REQUIREMENTS = 2000;
const MAX_LINK_LENGTH = 2048;
const MAX_LINKS = 10;

/** What the form submitted, before validation. All values are strings. */
export type RawRequestValues = Record<string, string>;

/** Columns to write once validation passes. */
export type RequestWrite = {
  title: string;
  category: string;
  description: string;
  /** One requirement per line; null when the customer left it empty. */
  requirements: string[] | null;
  /** Normalized links; null when the customer left it empty. */
  referenceLinks: string[] | null;
};

export type RequestParseResult =
  | { ok: true; values: RequestWrite; raw: RawRequestValues }
  | { ok: false; fieldErrors: Record<string, string>; raw: RawRequestValues };

/**
 * Accept a link the way people type it (same rule as profile validation):
 * `example.com/page` becomes `https://example.com/page`. Anything with
 * another scheme is left alone so the validator can reject it.
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

/** Read one form entry as a string; anything else is treated as empty. */
function readValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Split a textarea into trimmed, non-empty lines. */
function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** First message per field, keyed so the form can show it in place. */
function messagesFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Validate a submitted request for one context.
 *
 * Returns the columns to write when every entry is well formed, or the
 * messages to show (with the entries the customer typed, so nothing is
 * lost).
 */
export function parseRequestForm(
  context: WorkspaceContext,
  formData: FormData,
): RequestParseResult {
  const raw: RawRequestValues = {
    title: readValue(formData, "title"),
    category: readValue(formData, "category"),
    description: readValue(formData, "description"),
    requirements: readValue(formData, "requirements"),
    referenceLinks: readValue(formData, "referenceLinks"),
  };

  const schema = z.object({
    title: z
      .string()
      .trim()
      .min(3, "Give your request a title of at least 3 characters.")
      .max(MAX_TITLE, `Please keep the title to ${MAX_TITLE} characters or fewer.`),
    category: z
      .string()
      .refine(
        (value) => isRequestCategory(context, value),
        "Choose what kind of request this is.",
      ),
    description: z
      .string()
      .trim()
      .min(10, "Tell us what you need — a sentence or two is enough.")
      .max(
        MAX_DESCRIPTION,
        `Please keep the description to ${MAX_DESCRIPTION} characters or fewer.`,
      ),
    requirements: z
      .string()
      .max(
        MAX_REQUIREMENTS,
        `Please keep requirements to ${MAX_REQUIREMENTS} characters or fewer.`,
      ),
    referenceLinks: z.string(),
  });

  const result = schema.safeParse(raw);

  if (!result.success) {
    return { ok: false, fieldErrors: messagesFrom(result.error), raw };
  }

  const referenceLines = lines(result.data.referenceLinks);

  if (referenceLines.length > MAX_LINKS) {
    return {
      ok: false,
      fieldErrors: {
        referenceLinks: `Please add no more than ${MAX_LINKS} reference links.`,
      },
      raw,
    };
  }

  const referenceLinks: string[] = [];
  for (const line of referenceLines) {
    const normalized = normalizeLink(line);

    if (!isLink(normalized)) {
      return {
        ok: false,
        fieldErrors: {
          referenceLinks:
            "Each reference needs to be a full web address — example.com works fine.",
        },
        raw,
      };
    }

    if (normalized.length > MAX_LINK_LENGTH) {
      return {
        ok: false,
        fieldErrors: {
          referenceLinks: `One of your links is too long — please keep each under ${MAX_LINK_LENGTH} characters.`,
        },
        raw,
      };
    }

    referenceLinks.push(normalized);
  }

  const requirements = lines(result.data.requirements);

  return {
    ok: true,
    values: {
      title: result.data.title,
      category: result.data.category,
      description: result.data.description,
      requirements: requirements.length > 0 ? requirements : null,
      referenceLinks: referenceLinks.length > 0 ? referenceLinks : null,
    },
    raw,
  };
}

