CREATE TYPE "public"."operator_role" AS ENUM('operator', 'owner');--> statement-breakpoint
CREATE TABLE "deliverable_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"asset_id" uuid,
	"note" text,
	"created_by_operator_id" uuid,
	"is_current" boolean DEFAULT true NOT NULL,
	"superseded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deliverable_version_positive" CHECK ("deliverable_version"."version" > 0),
	CONSTRAINT "deliverable_version_current_state" CHECK (("deliverable_version"."is_current" and "deliverable_version"."superseded_at" is null)
       or (not "deliverable_version"."is_current" and "deliverable_version"."superseded_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "operator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" "operator_role" DEFAULT 'operator' NOT NULL,
	"display_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "context_type" "context_type";--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "brand_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "artist_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "production_type" text;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "priority" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "assigned_operator_id" uuid;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "production_job" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "deliverable_version" ADD CONSTRAINT "deliverable_version_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_version" ADD CONSTRAINT "deliverable_version_deliverable_id_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_version" ADD CONSTRAINT "deliverable_version_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_version" ADD CONSTRAINT "deliverable_version_created_by_operator_id_operator_id_fk" FOREIGN KEY ("created_by_operator_id") REFERENCES "public"."operator"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator" ADD CONSTRAINT "operator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_version_deliverable_version_unique" ON "deliverable_version" USING btree ("deliverable_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_version_current_unique" ON "deliverable_version" USING btree ("deliverable_id") WHERE "deliverable_version"."is_current";--> statement-breakpoint
CREATE INDEX "deliverable_version_workspace_id_idx" ON "deliverable_version" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deliverable_version_asset_id_idx" ON "deliverable_version" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operator_user_id_unique" ON "operator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "operator_active_idx" ON "operator" USING btree ("active");--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_artist_profile_id_artist_profile_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_assigned_operator_id_operator_id_fk" FOREIGN KEY ("assigned_operator_id") REFERENCES "public"."operator"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_job_queue_idx" ON "production_job" USING btree ("context_type","status","priority","created_at");--> statement-breakpoint
CREATE INDEX "production_job_assigned_operator_id_idx" ON "production_job" USING btree ("assigned_operator_id");--> statement-breakpoint
CREATE INDEX "production_job_request_id_idx" ON "production_job" USING btree ("request_id");--> statement-breakpoint
-- Phase 3.0 backfill: existing jobs predate the context, title and type
-- columns. They are filled from the project each job already belongs to
-- (never invented), and only then are the columns made NOT NULL — so this
-- migration is additive and safe to run against a database that already has
-- production data.
UPDATE "production_job" j
   SET "context_type" = p."context_type",
       "brand_profile_id" = p."brand_profile_id",
       "artist_profile_id" = p."artist_profile_id",
       "request_id" = p."request_id",
       "title" = p."name",
       "description" = COALESCE(j."description", p."description"),
       "production_type" = COALESCE(
         (SELECT r."category" FROM "request" r WHERE r."id" = p."request_id"),
         'general'
       )
  FROM "project" p
 WHERE p."id" = j."project_id";--> statement-breakpoint
ALTER TABLE "production_job" ALTER COLUMN "context_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "production_job" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "production_job" ALTER COLUMN "production_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_context_exclusive" CHECK (("production_job"."brand_profile_id" is null) <> ("production_job"."artist_profile_id" is null));--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_context_matches" CHECK (("production_job"."context_type" = 'brand' and "production_job"."brand_profile_id" is not null)
       or ("production_job"."context_type" = 'artist' and "production_job"."artist_profile_id" is not null));--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_priority_range" CHECK ("production_job"."priority" >= 0
       and "production_job"."priority" <= 100);