import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import {
  formatStudioAge,
  formatStudioTime,
  studioContextLabel,
  studioReviewStatusLabels,
} from "@/domains/studio/presentation";
import {
  getStudioReviewBoard,
  type ReviewBoardItem,
} from "@/domains/studio/review-board";

export const metadata = { title: "Review" };

/** One column of the board: what sits in that state right now. */
function BoardColumn({
  id,
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  id: string;
  title: string;
  description: string;
  items: ReviewBoardItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-section">
          {title}
        </h2>
        <p className="text-meta text-muted-foreground">{description}</p>
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-3">
          {items.map((entry) => (
            <li
              key={entry.deliverableId}
              className="flex flex-col gap-1 rounded-xl border border-border bg-surface-elevated p-4"
            >
              <Link
                href={`/studio/production/${entry.jobId}`}
                className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
              >
                {`${entry.deliverableName} · v${entry.version}`}
              </Link>
              <p className="text-meta break-words text-muted-foreground">
                {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)} · ${entry.projectName} · updated ${formatStudioAge(entry.updatedAt)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </section>
  );
}

/**
 * The review board (Phase 4.1, spec §14).
 *
 * Three columns and a history: what is with the customer, what they sent back,
 * and what is approved but not yet delivered. The decisions at the bottom are
 * the ones customers actually made, newest first, with who made them.
 *
 * This board observes review state; it never changes it. Decisions are made by
 * the customer on their own screen, and this surface is where the operator sees
 * the result (spec §14, §20).
 */
export default async function StudioReviewPage() {
  const access = await requireOperator();
  const board = await getStudioReviewBoard(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Review"
        description="Work with the customer, and the decisions they sent back. Every row is a real record of where the work stands."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <BoardColumn
          id="awaiting-customer"
          title="With the customer"
          description="Sent for review, no decision yet."
          items={board.awaitingCustomer}
          emptyTitle="Nothing is waiting on a customer"
          emptyDescription="Work appears here when it is sent for review and the customer has not answered."
        />
        <BoardColumn
          id="changes-requested"
          title="Changes requested"
          description="The customer sent it back with feedback."
          items={board.changesRequested}
          emptyTitle="No open change requests"
          emptyDescription="When a customer asks for changes, the job lands here for the team to pick up."
        />
        <BoardColumn
          id="awaiting-delivery"
          title="Approved, not delivered"
          description="The customer said yes; the handover has not happened."
          items={board.awaitingDelivery}
          emptyTitle="Nothing approved is waiting"
          emptyDescription="Approved work waiting to be handed over appears here and on Deliveries."
        />
      </div>
      <section aria-labelledby="history" className="flex min-w-0 flex-col gap-5">
        <h2 id="history" className="text-section">
          Decisions customers made
        </h2>
        {board.history.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {board.history.map((entry) => (
              <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      entry.status === "approved" ? "success" : "warning"
                    }
                  >
                    {`${studioReviewStatusLabels[entry.status]} · v${entry.version}`}
                  </Badge>
                  <span className="font-medium break-words">
                    {`${entry.deliverableName} · ${entry.workspaceSlug}`}
                  </span>
                </div>
                <p className="text-meta break-words text-muted-foreground">
                  {`Decided by ${entry.reviewerName ?? "the customer account"} · ${formatStudioTime(entry.createdAt)} · ${studioContextLabel(entry.contextType)}`}
                </p>
                {entry.feedback ? (
                  <p className="break-words text-sm">
                    {entry.feedback}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No decisions yet"
            description="Every approval and change request a customer sends is recorded here with the version they decided on."
          />
        )}
      </section>
    </Container>
  );
}
