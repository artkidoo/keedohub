-- Phase 3.2 — approval, delivery and final QA.
--
-- Additive only: no DROP, no TRUNCATE, no destructive change. The `delivery` row
-- becomes the single, self-contained record of "this exact version of this exact
-- file was handed to this customer" (spec §14).
--
-- Every column is added as nullable first, filled from the records the delivery
-- already points at (its deliverable, that deliverable's job, and the version
-- row the delivery names) and only then made NOT NULL — the same additive
-- backfill pattern Phase 3.0 used for `production_job` and Phase 3.1 used for
-- `review`, so this runs safely against a database that already has deliveries.

ALTER TABLE "delivery" ADD COLUMN "context_type" "context_type";
--> statement-breakpoint
-- Inherited from the production job that owns the deliverable — never invented.
UPDATE "delivery" d
   SET "context_type" = j."context_type"
  FROM "deliverable" dv
  JOIN "production_job" j ON j."id" = dv."job_id"
 WHERE dv."id" = d."deliverable_id";
--> statement-breakpoint
ALTER TABLE "delivery" ALTER COLUMN "context_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "job_id" uuid;
--> statement-breakpoint
-- The job is the deliverable's own job; the workspace and project are already
-- the deliverable's, so the whole row now agrees with the chain by construction.
UPDATE "delivery" d
   SET "job_id" = dv."job_id"
  FROM "deliverable" dv
 WHERE dv."id" = d."deliverable_id";
--> statement-breakpoint
ALTER TABLE "delivery" ALTER COLUMN "job_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "asset_id" uuid;
--> statement-breakpoint
-- The file the delivery names, taken from the version row it already recorded.
-- A delivery whose version row is missing keeps a NULL asset: the file is then
-- unknown rather than guessed, and the row still records what was delivered.
UPDATE "delivery" d
   SET "asset_id" = v."asset_id"
  FROM "deliverable_version" v
 WHERE v."deliverable_id" = d."deliverable_id"
   AND v."version" = d."version";
--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "delivered_by_operator_id" uuid;
--> statement-breakpoint
-- Attribution is internal and new work is performed by a live operator; a
-- delivery made before operators were recorded simply has no operator recorded.
UPDATE "delivery" d
   SET "delivered_by_operator_id" = (SELECT o."id" FROM "operator" o ORDER BY o."created_at" LIMIT 1)
 WHERE d."delivered_by_operator_id" IS NULL
   AND EXISTS (SELECT 1 FROM "operator" o);
--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_job_id_production_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."production_job"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_delivered_by_operator_id_operator_id_fk" FOREIGN KEY ("delivered_by_operator_id") REFERENCES "public"."operator"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "delivery_workspace_context_idx" ON "delivery" USING btree ("workspace_id","context_type");
--> statement-breakpoint
CREATE INDEX "delivery_job_id_idx" ON "delivery" USING btree ("job_id");
--> statement-breakpoint
CREATE INDEX "delivery_asset_id_idx" ON "delivery" USING btree ("asset_id");
--> statement-breakpoint
-- Exactly one delivery per deliverable, enforced by the database. This is the
-- idempotency guarantee for repeated or concurrent submissions: a second
-- attempt is refused here rather than creating a second record, a second
-- Library entry or a second customer notification. If a legacy database were to
-- contain duplicates this index creation fails loudly, which is the correct
-- outcome — a duplicate must never be resolved by silently discarding a record.
CREATE UNIQUE INDEX "delivery_deliverable_unique" ON "delivery" USING btree ("deliverable_id");
--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_version_positive" CHECK ("delivery"."version" > 0);