import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ==========================================================================
   Authentication tables (Better Auth core schema)
   Field names follow Better Auth's expected core schema; see
   https://www.better-auth.com/docs/concepts/database
   ========================================================================== */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .notNull()
    .default(false)
    .$type<boolean>(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ==========================================================================
   KeedoHub domain foundation
   user → workspace → brand/artist context. Every future query resolves
   through this chain (spec §8, §20).
   ========================================================================== */

export const workspace = pgTable(
  "workspace",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** The customer who owns this workspace. One owner per workspace. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Stable, URL-safe identifier. */
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workspace_user_id_idx").on(table.userId)],
);

/**
 * Social media handles/URLs keyed by platform. Empty object when unset.
 */
export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
};

/**
 * Streaming-platform links keyed by platform. Empty object when unset.
 */
export type StreamingLinks = {
  spotify?: string;
  appleMusic?: string;
  soundcloud?: string;
  bandcamp?: string;
  youtube?: string;
};

/**
 * Palette of brand / artist colours. Values are hex codes or CSS color
 * strings (e.g. "#1a1a1a", "hsl(0 0% 0%)").
 */
export type BrandColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
};

/**
 * Typography preferences for a brand or artist profile.
 */
export type Typography = {
  headingFont?: string;
  bodyFont?: string;
  notes?: string;
};

/**
 * Brand context of a workspace. A workspace may have one Brand profile and
 * one Artist profile — both, either, or neither over time (spec §5).
 */
export const brandProfile = pgTable(
  "brand_profile",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Display name of the brand. */
    name: text("name"),
    /** Legal entity name (for contracts / invoices). */
    legalName: text("legal_name"),
    /** Short description of what the brand is or does. */
    description: text("description"),
    /** Industry or category the brand operates in. */
    industry: text("industry"),
    /** Core products or services offered. */
    productsServices: text("products_services"),
    /** City and country, or general region. */
    location: text("location"),
    /** Full postal address (multi-line). */
    address: text("address"),
    /** Primary contact email. */
    contactEmail: text("contact_email"),
    /** Primary contact phone number. */
    contactPhone: text("contact_phone"),
    /** Website URL. */
    website: text("website"),
    /** Social media links (platform -> URL). */
    socialLinks: jsonb("social_links").$type<SocialLinks | null>(),
    /** Identifier / path for the primary logo asset. */
    primaryLogo: text("primary_logo"),
    /** Identifier / path for a secondary logo, if applicable. */
    secondaryLogo: text("secondary_logo"),
    /** Brand colour palette. */
    colors: jsonb("colors").$type<BrandColors | null>(),
    /** Typography preferences (heading, body, notes). */
    typography: jsonb("typography").$type<Typography | null>(),
    /** Narrative description of the visual style direction. */
    visualStyle: text("visual_style"),
    /** Narrative description of the imagery style direction. */
    imageryStyle: text("imagery_style"),
    /** Preferred layout direction for documents and assets. */
    preferredLayouts: text("preferred_layouts"),
    /** Inspiration and reference material the brand has supplied. */
    references: text("references"),
    /** Core personality traits of the brand. */
    personality: text("personality"),
    /** Brand voice description. */
    voice: text("voice"),
    /** Brand tone guidance. */
    tone: text("tone"),
    /** Who the brand speaks to. */
    targetAudience: text("target_audience"),
    /** The brand's core value proposition. */
    valueProposition: text("value_proposition"),
    /** Other useful brand detail. */
    otherInfo: text("other_info"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brand_profile_workspace_id_idx").on(table.workspaceId)],
);

/**
 * Artist context of a workspace. A workspace may have one Brand profile and
 * one Artist profile — both, either, or neither over time (spec §5).
 */
export const artistProfile = pgTable(
  "artist_profile",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Stage / artist name. */
    name: text("name"),
    /** Artist biography / story. */
    bio: text("bio"),
    /** Musical genre(s). */
    genre: text("genre"),
    /** City and country, or general region. */
    location: text("location"),
    /** Primary contact email. */
    contactEmail: text("contact_email"),
    /** Primary contact phone number. */
    contactPhone: text("contact_phone"),
    /** Website or press kit URL. */
    website: text("website"),
    /** Social media links (platform -> URL). */
    socialLinks: jsonb("social_links").$type<SocialLinks | null>(),
    /** Streaming-platform links (platform -> URL). */
    streamingLinks: jsonb("streaming_links").$type<StreamingLinks | null>(),
    /** Narrative description of the visual identity direction. */
    visualIdentity: text("visual_identity"),
    /** Artist colour palette. */
    colors: jsonb("colors").$type<BrandColors | null>(),
    /** Creative preferences (inspiration, references, constraints). */
    creativePreferences: text("creative_preferences"),
    /** Other useful artist identity information. */
    otherInfo: text("other_info"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("artist_profile_workspace_id_idx").on(table.workspaceId)],
);

/* Relations */

export const userRelations = relations(user, ({ one }) => ({
  workspace: one(workspace, {
    fields: [user.id],
    references: [workspace.userId],
  }),
}));

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  owner: one(user, {
    fields: [workspace.userId],
    references: [user.id],
  }),
  brandProfiles: many(brandProfile),
  artistProfiles: many(artistProfile),
}));

export const brandProfileRelations = relations(brandProfile, ({ one }) => ({
  workspace: one(workspace, {
    fields: [brandProfile.workspaceId],
    references: [workspace.id],
  }),
}));

export const artistProfileRelations = relations(artistProfile, ({ one }) => ({
  workspace: one(workspace, {
    fields: [artistProfile.workspaceId],
    references: [workspace.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type Workspace = typeof workspace.$inferSelect;
export type BrandProfile = typeof brandProfile.$inferSelect;
export type ArtistProfile = typeof artistProfile.$inferSelect;

/* ==========================================================================
   Production domain (spec §8–§14)
   request → project → production job → deliverable → review/delivery
   Every entity carries a workspace FK: customer isolation is enforced by
   resolving the workspace from the authenticated session only (spec §19–§20).
   ========================================================================== */

/** Which experience of the one workspace an entity belongs to (spec §5). */
export const contextTypeEnum = pgEnum("context_type", ["brand", "artist"]);

/** Request lifecycle (spec §8.3). Terminal: accepted → project, or declined. */
export const requestStatusEnum = pgEnum("request_status", [
  "submitted",
  "in_validation",
  "changes_needed",
  "accepted",
  "declined",
]);

/** Customer-visible project status (spec §9.3). Derived, server-maintained. */
export const projectStatusEnum = pgEnum("project_status", [
  "requested",
  "in_production",
  "in_review",
  "changes_requested",
  "approved",
  "delivered",
]);

/** Internal production queue states (spec §10.3). Never shown to customers. */
export const jobStatusEnum = pgEnum("job_status", [
  "incoming",
  "briefing",
  "in_production",
  "internal_qa",
  "customer_review",
  "changes_requested",
  "approved",
  "delivered",
]);

/** Deliverable status, derived from its job (spec §11.2). */
export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "in_production",
  "internal_qa",
  "customer_review",
  "changes_requested",
  "approved",
  "delivered",
]);

/** Asset categories (spec §12.2). */
export const assetCategoryEnum = pgEnum("asset_category", [
  "reference",
  "identity",
  "source",
  "delivered",
  "library",
]);

/** Exactly two review actions exist (spec §13.3). */
export const reviewActionEnum = pgEnum("review_action", [
  "approve",
  "request_changes",
]);

/* -- Request (§8): the customer's expressed intent, before any production -- */

export const request = pgTable(
  "request",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Exactly one context: brand or artist. */
    contextType: contextTypeEnum("context_type").notNull(),
    brandProfileId: uuid("brand_profile_id").references(() => brandProfile.id, {
      onDelete: "cascade",
    }),
    artistProfileId: uuid("artist_profile_id").references(
      () => artistProfile.id,
      { onDelete: "cascade" },
    ),
    /** What the customer wants, in their words (spec §8.2). */
    title: text("title").notNull(),
    description: text("description"),
    /** Extensible category, e.g. "document", "cover_artwork", "social_content". */
    category: text("category").notNull(),
    /** Structured requirements (sizes, formats, platforms, quantities). */
    requirements: jsonb("requirements"),
    /** Links/examples the customer likes; files arrive later as assets. */
    referenceLinks: jsonb("reference_links"),
    /** Requested date where genuinely needed. Never implies scheduling. */
    requestedDate: text("requested_date"),
    status: requestStatusEnum("status").notNull().default("submitted"),
    /** Reason for changes_needed / declined; shown to the customer. */
    statusReason: text("status_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("request_workspace_id_idx").on(table.workspaceId),
    index("request_status_idx").on(table.status),
    // Exactly one context reference must be set, matching contextType.
    check(
      "request_context_exclusive",
      sql`(${table.brandProfileId} is null) <> (${table.artistProfileId} is null)`,
    ),
    check(
      "request_context_matches",
      sql`(${table.contextType} = 'brand' and ${table.brandProfileId} is not null)
       or (${table.contextType} = 'artist' and ${table.artistProfileId} is not null)`,
    ),
  ],
);

/* -- Project (§9): groups related creative work; may originate from a request */

export const project = pgTable(
  "project",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    contextType: contextTypeEnum("context_type").notNull(),
    brandProfileId: uuid("brand_profile_id").references(() => brandProfile.id, {
      onDelete: "cascade",
    }),
    artistProfileId: uuid("artist_profile_id").references(
      () => artistProfile.id,
      { onDelete: "cascade" },
    ),
    /** The accepted request this project fulfils, when one exists. */
    requestId: uuid("request_id").references(() => request.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * Derived from jobs/reviews by server transitions (spec §9.4 rule 2);
     * never written by ad-hoc client input.
     */
    status: projectStatusEnum("status").notNull().default("requested"),
    /**
     * Artist release metadata (Checkpoint 2.6).
     *
     * A release IS a project: the spec's artist project types are New Single /
     * EP Launch / Album Release, so no separate release entity is introduced
     * and nothing is duplicated. A non-null `releaseType` marks the project as
     * a release for the Artist release surfaces; null means an ordinary artist
     * project (EPK, brand refresh, …). Values stay extensible text — adding a
     * release type must never require structural change.
     */
    releaseType: text("release_type"),
    /** The release's own date, when the artist has one. Never a schedule. */
    releaseDate: date("release_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_workspace_id_idx").on(table.workspaceId),
    index("project_status_idx").on(table.status),
    check(
      "project_context_exclusive",
      sql`(${table.brandProfileId} is null) <> (${table.artistProfileId} is null)`,
    ),
    // Release metadata belongs to the Artist context only.
    check(
      "project_release_artist_only",
      sql`(${table.releaseType} is null and ${table.releaseDate} is null)
       or ${table.contextType} = 'artist'`,
    ),
  ],
);

/* -- Production job (§10): the internal unit of Studio work ---------------- */

export const productionJob = pgTable(
  "production_job",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** Internal queue state (spec §10.3). Internal vocabulary only. */
    status: jobStatusEnum("status").notNull().default("incoming"),
    /** Structured production instructions assembled during briefing. */
    brief: jsonb("brief"),
    /** Operator attribution (PLANNED). Not a customer concept. */
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("production_job_workspace_id_idx").on(table.workspaceId),
    index("production_job_project_id_idx").on(table.projectId),
    index("production_job_status_idx").on(table.status),
  ],
);

/* -- Deliverable (§11): the piece of work the customer receives ------------ */

export const deliverable = pgTable(
  "deliverable",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => productionJob.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Extensible type/purpose, e.g. "cover_artwork", "social_kit", "pdf". */
    type: text("type").notNull(),
    /** Derived from the job (spec §11.2). */
    status: deliverableStatusEnum("status").notNull().default("in_production"),
    /** Current version number; history is preserved, never overwritten. */
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("deliverable_workspace_id_idx").on(table.workspaceId),
    index("deliverable_project_id_idx").on(table.projectId),
    index("deliverable_job_id_idx").on(table.jobId),
    index("deliverable_status_idx").on(table.status),
  ],
);

/* -- Asset (§12): a stored file/resource, prepared for object storage ------ */

export const asset = pgTable(
  "asset",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    brandProfileId: uuid("brand_profile_id").references(() => brandProfile.id, {
      onDelete: "cascade",
    }),
    artistProfileId: uuid("artist_profile_id").references(
      () => artistProfile.id,
      { onDelete: "cascade" },
    ),
    projectId: uuid("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    jobId: uuid("job_id").references(() => productionJob.id, {
      onDelete: "set null",
    }),
    deliverableId: uuid("deliverable_id").references(() => deliverable.id, {
      onDelete: "set null",
    }),
    category: assetCategoryEnum("category").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    /** Object-storage key/location. Real storage integration is PLANNED. */
    storageKey: text("storage_key"),
    storageProvider: text("storage_provider").notNull().default("s3"),
    /** Versions are preserved; overwriting in place is not permitted (§12.3). */
    version: integer("version").notNull().default(1),
    /** Customer-facing visibility. Source/working files are internal by default. */
    customerVisible: boolean("customer_visible").notNull().default(false),
    /** Flexible metadata (dimensions, duration, platform requirements). */
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("asset_workspace_id_idx").on(table.workspaceId),
    index("asset_deliverable_id_idx").on(table.deliverableId),
    index("asset_project_id_idx").on(table.projectId),
    index("asset_category_idx").on(table.category),
  ],
);

/* -- Review (§13): immutable approval/change-request event ------------------ */

export const review = pgTable(
  "review",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverable.id, { onDelete: "cascade" }),
    /** Approval applies to a specific version, never in the abstract (§13.3). */
    version: integer("version").notNull(),
    action: reviewActionEnum("action").notNull(),
    /** Required when action = request_changes; retained permanently. */
    feedback: text("feedback"),
    /** Customer user id (PLANNED attribution once auth data is linked). */
    reviewedBy: text("reviewed_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("review_workspace_id_idx").on(table.workspaceId),
    index("review_deliverable_id_idx").on(table.deliverableId),
    check(
      "review_changes_need_feedback",
      sql`${table.action} <> 'request_changes' or ${table.feedback} is not null`,
    ),
  ],
);

/* -- Delivery (§14): finalises approved work into the customer's library --- */

export const delivery = pgTable(
  "delivery",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverable.id, { onDelete: "cascade" }),
    /** The version that was delivered; delivered work is immutable (§14.2). */
    version: integer("version").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("delivery_workspace_id_idx").on(table.workspaceId),
    index("delivery_project_id_idx").on(table.projectId),
    index("delivery_deliverable_id_idx").on(table.deliverableId),
  ],
);

/* -- Notification (Checkpoint 2.8): customer-facing in-app updates ----------- */

/**
 * Customer notification types.
 *
 * Customer vocabulary only — each value is a sentence the customer can read.
 * Adding a new kind of customer update is additive and never requires an
 * existing value to change meaning.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "request_received",
  "ready_for_review",
  "changes_requested",
  "approved",
  "work_delivered",
  "new_files_available",
  "update",
]);

/**
 * One in-app customer notification.
 *
 * A notification is a *record of a real event*, never generated to populate a
 * surface. It is written by the server-side code that performs the customer-
 * visible event, and is scoped three ways so a customer can never see another
 * customer's updates:
 *   - `userId`      — the customer it belongs to
 *   - `workspaceId` — the workspace that owns the customer (defence in depth:
 *                     the owner is unique, but the row still carries the FK)
 *   - `contextType` — Brand or Artist, so context switches never mix them
 *
 * `href` is a *customer* route (validated at write time against the context);
 * it is not a database reference and exposes no internal identifier semantics.
 * `readAt` is the whole read model: NULL is unread, a timestamp is read. There
 * is no separate read table, so a read state can never drift from its row.
 */
export const notification = pgTable(
  "notification",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Brand or Artist — notifications never cross the context switch. */
    contextType: contextTypeEnum("context_type").notNull(),
    type: notificationTypeEnum("type").notNull(),
    /** Short, customer-readable headline, e.g. "Your request has been received". */
    title: text("title").notNull(),
    /** One or two sentences of plain context. No internal terminology. */
    message: text("message").notNull(),
    /** Where the customer goes to see it. NULL when nothing to open yet. */
    href: text("href"),
    /** NULL until the customer reads it. */
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Serves the notifications list, ordered newest first.
    index("notification_user_context_created_idx").on(
      table.userId,
      table.contextType,
      table.createdAt,
    ),
    // Serves the unread count shown in navigation.
    index("notification_unread_idx").on(table.userId, table.readAt),
  ],
);

/* -- Relations -------------------------------------------------------------- */

export const requestRelations = relations(request, ({ one }) => ({
  workspace: one(workspace, {
    fields: [request.workspaceId],
    references: [workspace.id],
  }),
  brandProfile: one(brandProfile, {
    fields: [request.brandProfileId],
    references: [brandProfile.id],
  }),
  artistProfile: one(artistProfile, {
    fields: [request.artistProfileId],
    references: [artistProfile.id],
  }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [project.workspaceId],
    references: [workspace.id],
  }),
  request: one(request, {
    fields: [project.requestId],
    references: [request.id],
  }),
  jobs: many(productionJob),
  deliverables: many(deliverable),
}));

export const productionJobRelations = relations(
  productionJob,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [productionJob.workspaceId],
      references: [workspace.id],
    }),
    project: one(project, {
      fields: [productionJob.projectId],
      references: [project.id],
    }),
    deliverables: many(deliverable),
  }),
);

export const deliverableRelations = relations(deliverable, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [deliverable.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [deliverable.projectId],
    references: [project.id],
  }),
  job: one(productionJob, {
    fields: [deliverable.jobId],
    references: [productionJob.id],
  }),
  reviews: many(review),
  deliveries: many(delivery),
  assets: many(asset),
}));

export const assetRelations = relations(asset, ({ one }) => ({
  workspace: one(workspace, {
    fields: [asset.workspaceId],
    references: [workspace.id],
  }),
  deliverable: one(deliverable, {
    fields: [asset.deliverableId],
    references: [deliverable.id],
  }),
  job: one(productionJob, {
    fields: [asset.jobId],
    references: [productionJob.id],
  }),
}));

export const reviewRelations = relations(review, ({ one }) => ({
  workspace: one(workspace, {
    fields: [review.workspaceId],
    references: [workspace.id],
  }),
  deliverable: one(deliverable, {
    fields: [review.deliverableId],
    references: [deliverable.id],
  }),
}));

export const deliveryRelations = relations(delivery, ({ one }) => ({
  workspace: one(workspace, {
    fields: [delivery.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [delivery.projectId],
    references: [project.id],
  }),
  deliverable: one(deliverable, {
    fields: [delivery.deliverableId],
    references: [deliverable.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  owner: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [notification.workspaceId],
    references: [workspace.id],
  }),
}));

/* -- Domain types (database-derived; no duplicate definitions) -------------- */

export type Request = typeof request.$inferSelect;
export type NewRequest = typeof request.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type ProductionJob = typeof productionJob.$inferSelect;
export type NewProductionJob = typeof productionJob.$inferInsert;
export type Deliverable = typeof deliverable.$inferSelect;
export type NewDeliverable = typeof deliverable.$inferInsert;
export type Asset = typeof asset.$inferSelect;
export type NewAsset = typeof asset.$inferInsert;
export type Review = typeof review.$inferSelect;
export type NewReview = typeof review.$inferInsert;
export type Delivery = typeof delivery.$inferSelect;
export type NewDelivery = typeof delivery.$inferInsert;
export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;

export type RequestContextType = (typeof contextTypeEnum.enumValues)[number];
export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
export type DeliverableStatus = (typeof deliverableStatusEnum.enumValues)[number];
export type AssetCategory = (typeof assetCategoryEnum.enumValues)[number];
export type ReviewAction = (typeof reviewActionEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
