/**
 * Profile field definitions for the two contexts of the one KeedoHub
 * workspace (spec §5, §6.1, §7.1).
 *
 * The groups below are the single source of truth for three things at once:
 *   - what the customer sees and edits (the form),
 *   - what the server validates (see `validation.ts`),
 *   - which column each value is written to.
 *
 * Names are the FormData keys. A dotted name belongs to a JSON column, e.g.
 * `socialLinks.instagram` is written to `brand_profile.social_links`.
 */

import type {
  ArtistProfile,
  BrandColors,
  BrandProfile,
  SocialLinks,
  StreamingLinks,
  Typography,
} from "@/lib/db/schema";

/**
 * Everything the customer can edit on a Brand profile: the profile columns
 * minus the identifiers and timestamps the server owns.
 */
export type BrandProfileWrite = Omit<
  BrandProfile,
  "id" | "workspaceId" | "createdAt" | "updatedAt"
>;

/** Everything the customer can edit on an Artist profile. */
export type ArtistProfileWrite = Omit<
  ArtistProfile,
  "id" | "workspaceId" | "createdAt" | "updatedAt"
>;

export type ProfileFieldKind =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "color";

export type ProfileFieldDef = {
  /** FormData key. Dotted when the value lives inside a JSON column. */
  name: string;
  label: string;
  kind: ProfileFieldKind;
  placeholder?: string;
  /** One line of guidance shown under the label. */
  help?: string;
  autoComplete?: string;
  /** Upper bound, applied by validation and by the control itself. */
  maxLength?: number;
};

export type ProfileFieldGroup = {
  id: string;
  title: string;
  description: string;
  fields: ProfileFieldDef[];
};

/** Social platforms a profile can list (keys of `SocialLinks`). */
export const socialPlatforms = [
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourname",
  },
  { id: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourname" },
  {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/yourname",
  },
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourname",
  },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
] as const satisfies readonly {
  id: keyof SocialLinks;
  label: string;
  placeholder: string;
}[];

/** Streaming platforms an artist profile can list (keys of `StreamingLinks`). */
export const streamingPlatforms = [
  {
    id: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/yourname",
  },
  {
    id: "appleMusic",
    label: "Apple Music",
    placeholder: "https://music.apple.com/artist/yourname",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    placeholder: "https://soundcloud.com/yourname",
  },
  {
    id: "bandcamp",
    label: "Bandcamp",
    placeholder: "https://yourname.bandcamp.com",
  },
  {
    id: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourname",
  },
] as const satisfies readonly {
  id: keyof StreamingLinks;
  label: string;
  placeholder: string;
}[];

/** Palette keys of `BrandColors`. */
const colourKeys = [
  { id: "primary", label: "Primary colour" },
  { id: "secondary", label: "Secondary colour" },
  { id: "accent", label: "Accent colour" },
  { id: "background", label: "Background colour" },
] as const satisfies readonly { id: keyof BrandColors; label: string }[];

/** Keys of `Typography`. */
const typographyKeys = [
  {
    id: "headingFont",
    label: "Heading font",
    placeholder: "e.g. Inter, Söhne",
    kind: "text",
  },
  {
    id: "bodyFont",
    label: "Body font",
    placeholder: "e.g. Inter, Söhne",
    kind: "text",
  },
  {
    id: "notes",
    label: "Typography notes",
    placeholder: "Weights, spacing or usage rules.",
    kind: "textarea",
  },
] as const satisfies readonly {
  id: keyof Typography;
  label: string;
  placeholder: string;
  kind: ProfileFieldKind;
}[];

/** Field name suffixes of a JSON column, derived from the keys above. */
export const socialLinkKeys: readonly (keyof SocialLinks)[] = socialPlatforms.map(
  (platform) => platform.id,
);
export const streamingLinkKeys: readonly (keyof StreamingLinks)[] =
  streamingPlatforms.map((platform) => platform.id);
export const colourKeysInOrder: readonly (keyof BrandColors)[] = colourKeys.map(
  (colour) => colour.id,
);
export const typographyKeysInOrder: readonly (keyof Typography)[] =
  typographyKeys.map((entry) => entry.id);

function socialFields(): ProfileFieldDef[] {
  return socialPlatforms.map((platform) => ({
    name: `socialLinks.${platform.id}`,
    label: platform.label,
    kind: "url" as const,
    placeholder: platform.placeholder,
  }));
}

function streamingFields(): ProfileFieldDef[] {
  return streamingPlatforms.map((platform) => ({
    name: `streamingLinks.${platform.id}`,
    label: platform.label,
    kind: "url" as const,
    placeholder: platform.placeholder,
  }));
}

function colourFields(): ProfileFieldDef[] {
  return colourKeys.map((colour) => ({
    name: `colors.${colour.id}`,
    label: colour.label,
    kind: "color" as const,
    placeholder: "#C0392B",
  }));
}

function typographyFields(): ProfileFieldDef[] {
  return typographyKeys.map((entry) => ({
    name: `typography.${entry.id}`,
    label: entry.label,
    kind: entry.kind,
    placeholder: entry.placeholder,
    maxLength: 600,
  }));
}

/** Brand profile, grouped as the specification describes it (spec §6.1). */
export const brandProfileGroups: ProfileFieldGroup[] = [
  {
    id: "identity",
    title: "Identity",
    description: "Who the brand is, in its own words.",
    fields: [
      {
        name: "name",
        label: "Brand name",
        kind: "text",
        placeholder: "Your brand name",
        autoComplete: "organization",
        maxLength: 160,
      },
      {
        name: "legalName",
        label: "Legal or business name",
        kind: "text",
        placeholder: "Registered name, if it differs",
        maxLength: 200,
        help: "Used on documents and contracts that need a legal entity.",
      },
      {
        name: "description",
        label: "About the brand",
        kind: "textarea",
        placeholder: "What the brand is, who it serves and what it stands for.",
        maxLength: 1200,
      },
    ],
  },
  {
    id: "classification",
    title: "Classification",
    description: "Where the brand sits in the market.",
    fields: [
      {
        name: "industry",
        label: "Industry or category",
        kind: "text",
        placeholder: "e.g. Hospitality, Fashion, Music technology",
        maxLength: 160,
      },
    ],
  },
  {
    id: "location",
    title: "Location",
    description: "Where the brand is based.",
    fields: [
      {
        name: "location",
        label: "Location",
        kind: "text",
        placeholder: "City, country",
        maxLength: 160,
      },
      {
        name: "address",
        label: "Address",
        kind: "textarea",
        placeholder: "Street, city, postal code, country",
        maxLength: 400,
        help: "Only needed when documents and letterheads carry a postal address.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    description: "How KeedoHub and customers reach the brand.",
    fields: [
      {
        name: "contactEmail",
        label: "Email",
        kind: "email",
        placeholder: "name@company.com",
        autoComplete: "email",
        maxLength: 200,
      },
      {
        name: "contactPhone",
        label: "Phone",
        kind: "tel",
        placeholder: "+27 21 000 0000",
        autoComplete: "tel",
        maxLength: 40,
      },
      {
        name: "website",
        label: "Website",
        kind: "url",
        placeholder: "https://yourbrand.com",
        autoComplete: "url",
      },
      ...socialFields(),
    ],
  },
  {
    id: "visual",
    title: "Visual identity",
    description: "Logo, colour, type and imagery direction.",
    fields: [
      {
        name: "primaryLogo",
        label: "Primary logo",
        kind: "url",
        placeholder: "https://…",
        help: "A link to the logo file, or a reference to where it is kept. Uploading files is not part of your workspace yet.",
      },
      {
        name: "secondaryLogo",
        label: "Secondary logo",
        kind: "url",
        placeholder: "https://…",
        help: "A variation used where the primary logo does not fit.",
      },
      ...colourFields(),
      ...typographyFields(),
      {
        name: "visualStyle",
        label: "Visual style",
        kind: "textarea",
        placeholder: "The overall look the brand should have.",
        maxLength: 1200,
      },
      {
        name: "imageryStyle",
        label: "Imagery style",
        kind: "textarea",
        placeholder:
          "The kind of photography, illustration or texture the brand uses.",
        maxLength: 1200,
      },
      {
        name: "preferredLayouts",
        label: "Preferred layouts",
        kind: "textarea",
        placeholder: "Layouts that work well for the brand.",
        maxLength: 600,
      },
    ],
  },
  {
    id: "expression",
    title: "Expression",
    description: "How the brand sounds when it speaks.",
    fields: [
      {
        name: "personality",
        label: "Personality",
        kind: "textarea",
        placeholder: "e.g. Warm, direct, quietly confident.",
        maxLength: 800,
      },
      {
        name: "voice",
        label: "Voice",
        kind: "textarea",
        placeholder: "How the brand writes and speaks.",
        maxLength: 800,
      },
      {
        name: "tone",
        label: "Tone",
        kind: "textarea",
        placeholder: "How the tone shifts by audience or occasion.",
        maxLength: 800,
      },
    ],
  },
  {
    id: "references",
    title: "References",
    description: "Work and material the brand likes.",
    fields: [
      {
        name: "references",
        label: "References and inspiration",
        kind: "textarea",
        placeholder: "Examples, links or descriptions of work the brand admires.",
        maxLength: 2000,
      },
    ],
  },
  {
    id: "offering",
    title: "Offering",
    description: "What the brand sells and why it matters.",
    fields: [
      {
        name: "productsServices",
        label: "Products and services",
        kind: "textarea",
        placeholder: "What the brand offers.",
        maxLength: 1200,
      },
      {
        name: "valueProposition",
        label: "Value proposition",
        kind: "textarea",
        placeholder: "Why customers choose this brand.",
        maxLength: 1200,
      },
    ],
  },
  {
    id: "audience",
    title: "Audience",
    description: "Who the brand speaks to.",
    fields: [
      {
        name: "targetAudience",
        label: "Target audience",
        kind: "textarea",
        placeholder: "The people the brand is for.",
        maxLength: 1200,
      },
    ],
  },
  {
    id: "extra",
    title: "Extra information",
    description: "Anything else that helps KeedoHub create for the brand.",
    fields: [
      {
        name: "otherInfo",
        label: "Other information",
        kind: "textarea",
        placeholder: "Anything not covered above.",
        maxLength: 2000,
      },
    ],
  },
];

/** Artist profile, grouped as the specification describes it (spec §7.1). */
export const artistProfileGroups: ProfileFieldGroup[] = [
  {
    id: "identity",
    title: "Identity",
    description: "The name and story the artist releases under.",
    fields: [
      {
        name: "name",
        label: "Artist name",
        kind: "text",
        placeholder: "Stage or release name",
        autoComplete: "nickname",
        maxLength: 160,
      },
      {
        name: "bio",
        label: "Biography",
        kind: "textarea",
        placeholder: "The artist's story, in their own words.",
        maxLength: 2000,
      },
    ],
  },
  {
    id: "classification",
    title: "Classification",
    description: "Where the music sits.",
    fields: [
      {
        name: "genre",
        label: "Genre",
        kind: "text",
        placeholder: "e.g. Amapiano, Alt-pop, Hip hop",
        maxLength: 160,
      },
    ],
  },
  {
    id: "location",
    title: "Location",
    description: "Where the artist is based.",
    fields: [
      {
        name: "location",
        label: "Location",
        kind: "text",
        placeholder: "City, country",
        maxLength: 160,
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    description: "How KeedoHub reaches the artist and their team.",
    fields: [
      {
        name: "contactEmail",
        label: "Email",
        kind: "email",
        placeholder: "name@example.com",
        autoComplete: "email",
        maxLength: 200,
      },
      {
        name: "contactPhone",
        label: "Phone",
        kind: "tel",
        placeholder: "+27 21 000 0000",
        autoComplete: "tel",
        maxLength: 40,
      },
      {
        name: "website",
        label: "Website or press kit",
        kind: "url",
        placeholder: "https://…",
        autoComplete: "url",
      },
      ...socialFields(),
    ],
  },
  {
    id: "listening",
    title: "Listening",
    description: "Where the music lives.",
    fields: [...streamingFields()],
  },
  {
    id: "visual",
    title: "Visual identity",
    description: "The look that goes with the sound.",
    fields: [
      {
        name: "visualIdentity",
        label: "Visual identity",
        kind: "textarea",
        placeholder: "How the artist should look across artwork and visuals.",
        maxLength: 1200,
      },
      ...colourFields(),
    ],
  },
  {
    id: "creative",
    title: "Creative preference",
    description: "What the artist wants the work to feel like.",
    fields: [
      {
        name: "creativePreferences",
        label: "Creative preferences",
        kind: "textarea",
        placeholder: "Styles, references, moods, and anything to avoid.",
        maxLength: 1200,
      },
    ],
  },
  {
    id: "extra",
    title: "Extra information",
    description: "Anything else that helps KeedoHub create for the artist.",
    fields: [
      {
        name: "otherInfo",
        label: "Other information",
        kind: "textarea",
        placeholder: "Anything not covered above.",
        maxLength: 2000,
      },
    ],
  },
];
/** Every field of a profile, in the order it is presented. */
export function profileFields(groups: ProfileFieldGroup[]): ProfileFieldDef[] {
  return groups.flatMap((group) => group.fields);
}

/** The groups that describe a given context of the workspace. */
export function profileGroupsFor(context: "brand" | "artist"): ProfileFieldGroup[] {
  return context === "brand" ? brandProfileGroups : artistProfileGroups;
}

/**
 * Read one field's current value as a string.
 *
 * Database rows are plain objects, so a value is looked up by column name;
 * dotted names reach into a JSON column. Anything that is not a string —
 * including a key that was never set — reads as an empty field.
 */
function readField(row: object, name: string): string {
  const source = row as Record<string, unknown>;
  const [head, tail] = name.split(".");

  if (tail === undefined) {
    const value = source[head];
    return typeof value === "string" ? value : "";
  }

  const group = source[head];
  if (!group || typeof group !== "object") {
    return "";
  }

  const nested = (group as Record<string, unknown>)[tail];
  return typeof nested === "string" ? nested : "";
}

function toFormValues(
  groups: ProfileFieldGroup[],
  row: object,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of profileFields(groups)) {
    values[field.name] = readField(row, field.name);
  }
  return values;
}

/** Stored Brand values, keyed by field name, ready for the profile form. */
export function brandProfileToFormValues(
  profile: BrandProfile,
): Record<string, string> {
  return toFormValues(brandProfileGroups, profile);
}

/** Stored Artist values, keyed by field name, ready for the profile form. */
export function artistProfileToFormValues(
  profile: ArtistProfile,
): Record<string, string> {
  return toFormValues(artistProfileGroups, profile);
}