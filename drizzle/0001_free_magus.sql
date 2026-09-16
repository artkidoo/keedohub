CREATE TYPE "public"."asset_category" AS ENUM('reference', 'identity', 'source', 'delivered', 'library');--> statement-breakpoint
CREATE TYPE "public"."context_type" AS ENUM('brand', 'artist');--> statement-breakpoint
CREATE TYPE "public"."deliverable_status" AS ENUM('in_production', 'internal_qa', 'customer_review', 'changes_requested', 'approved', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('incoming', 'briefing', 'in_production', 'internal_qa', 'customer_review', 'changes_requested', 'approved', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('requested', 'in_production', 'in_review', 'changes_requested', 'approved', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'in_validation', 'changes_needed', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."review_action" AS ENUM('approve', 'request_changes');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_profile_id" uuid,
	"artist_profile_id" uuid,
	"project_id" uuid,
	"job_id" uuid,
	"deliverable_id" uuid,
	"category" "asset_category" NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"storage_key" text,
	"storage_provider" text DEFAULT 's3' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_visible" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" "deliverable_status" DEFAULT 'in_production' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'incoming' NOT NULL,
	"brief" jsonb,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"context_type" "context_type" NOT NULL,
	"brand_profile_id" uuid,
	"artist_profile_id" uuid,
	"request_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_context_exclusive" CHECK (("project"."brand_profile_id" is null) <> ("project"."artist_profile_id" is null))
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"context_type" "context_type" NOT NULL,
	"brand_profile_id" uuid,
	"artist_profile_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"requirements" jsonb,
	"reference_links" jsonb,
	"requested_date" text,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"status_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "request_context_exclusive" CHECK (("request"."brand_profile_id" is null) <> ("request"."artist_profile_id" is null)),
	CONSTRAINT "request_context_matches" CHECK (("request"."context_type" = 'brand' and "request"."brand_profile_id" is not null)
       or ("request"."context_type" = 'artist' and "request"."artist_profile_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" "review_action" NOT NULL,
	"feedback" text,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_changes_need_feedback" CHECK ("review"."action" <> 'request_changes' or "review"."feedback" is not null)
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_artist_profile_id_artist_profile_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_job_id_production_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."production_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_deliverable_id_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_job_id_production_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."production_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_deliverable_id_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_job" ADD CONSTRAINT "production_job_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_artist_profile_id_artist_profile_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_artist_profile_id_artist_profile_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_deliverable_id_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_workspace_id_idx" ON "asset" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_deliverable_id_idx" ON "asset" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "asset_project_id_idx" ON "asset" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "asset_category_idx" ON "asset" USING btree ("category");--> statement-breakpoint
CREATE INDEX "deliverable_workspace_id_idx" ON "deliverable" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deliverable_project_id_idx" ON "deliverable" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "deliverable_job_id_idx" ON "deliverable" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "deliverable_status_idx" ON "deliverable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_workspace_id_idx" ON "delivery" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "delivery_project_id_idx" ON "delivery" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "delivery_deliverable_id_idx" ON "delivery" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "production_job_workspace_id_idx" ON "production_job" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "production_job_project_id_idx" ON "production_job" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "production_job_status_idx" ON "production_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_workspace_id_idx" ON "project" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_workspace_id_idx" ON "request" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "request_status_idx" ON "request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "review_workspace_id_idx" ON "review" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_deliverable_id_idx" ON "review" USING btree ("deliverable_id");