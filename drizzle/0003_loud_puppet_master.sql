ALTER TABLE "project" ADD COLUMN "release_type" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "release_date" date;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_release_artist_only" CHECK (("project"."release_type" is null and "project"."release_date" is null)
       or "project"."context_type" = 'artist');