ALTER TABLE "user" ADD COLUMN "account_type" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "account_type" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_account_type_valid" CHECK ("workspace"."account_type" is null or "workspace"."account_type" in ('brand', 'artist'));