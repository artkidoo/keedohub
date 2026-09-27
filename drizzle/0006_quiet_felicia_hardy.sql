-- Phase 3.1 — production + review workflow.
--
-- Additive only. Nothing is dropped, truncated or rewritten: the `review` row
-- becomes an explicit, scoped, stateful record of a customer's decision on a
-- specific deliverable version (spec §13).
--
-- The one relaxation below (action may now be NULL) widens what may be stored:
-- a review exists from the moment a version is released to the customer, and it
-- carries no decision until the customer makes one.

CREATE TYPE "public"."review_status" AS ENUM('pending', 'changes_requested', 'approved', 'superseded');
--> statement-breakpoint
ALTER TABLE "review" ALTER COLUMN "action" DROP NOT NULL;
--> statement-breakpoint
-- Phase 3.1 backfill: existing reviews predate the context column. It is
-- inherited from the production job that owns the reviewed deliverable (never
-- invented) and only then made NOT NULL, exactly as Phase 3.0 backfilled
-- production_job — so this runs safely against a database that already has
-- review history.
ALTER TABLE "review" ADD COLUMN "context_type" "context_type";
--> statement-breakpoint
UPDATE "review" r
   SET "context_type" = j."context_type"
  FROM "deliverable" d
  JOIN "production_job" j ON j."id" = d."job_id"
 WHERE d."id" = r."deliverable_id";
--> statement-breakpoint
ALTER TABLE "review" ALTER COLUMN "context_type" SET NOT NULL;
--> statement-breakpoint
-- A decision that was already recorded stays a decision: historical reviews are
-- carried across as `approved` / `changes_requested` rather than being reset.
ALTER TABLE "review" ADD COLUMN "status" "review_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
UPDATE "review"
   SET "status" = CASE "action"
        WHEN 'approve' THEN 'approved'::"review_status"
        WHEN 'request_changes' THEN 'changes_requested'::"review_status"
        ELSE "status"
      END;
--> statement-breakpoint
ALTER TABLE "review" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
-- "Who decided" must be a real account. Any attribution that never pointed at
-- a real user is cleared before the key is added; no review row is removed and
-- no decision is altered.
UPDATE "review" r
   SET "reviewed_by" = NULL
 WHERE r."reviewed_by" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = r."reviewed_by");
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "review_deliverable_version_idx" ON "review" USING btree ("deliverable_id","version");
--> statement-breakpoint
-- At most one open review per deliverable, so a conflicting second active
-- review is refused by the database as well as in application code.
CREATE UNIQUE INDEX "review_pending_unique" ON "review" USING btree ("deliverable_id") WHERE "review"."status" = 'pending';
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_status_changes_need_feedback" CHECK ("review"."status" <> 'changes_requested' or "review"."feedback" is not null);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_decision_consistent" CHECK (("review"."status" = 'approved' and "review"."action" = 'approve')
        or ("review"."status" = 'changes_requested' and "review"."action" = 'request_changes')
        or ("review"."status" in ('pending', 'superseded') and "review"."action" is null));