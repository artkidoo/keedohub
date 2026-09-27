/**
 * The customer's review surface (Phase 3.1).
 *
 * Everything a customer needs to make a decision, and nothing else: which work
 * this is, which version they are looking at, the project and request behind it,
 * the state of their review in plain words, the two actions they can take, and
 * what they said before — kept alongside the version it was said about.
 *
 * What it deliberately does not show: who produced it, which internal state it
 * is in, what quality checking happened, or any other customer's anything. The
 * vocabulary lives in `./presentation` so it can be checked in one place
 * (spec §24).
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReviewableWork } from "./data";
import { ReviewActions } from "./review-actions";
import {
  formatReviewTime,
  reviewPanelBody,
  reviewPanelTitle,
} from "./presentation";
import type { ReviewStatus } from "@/lib/db/schema";
import type { WorkspaceContext } from "@/lib/navigation";

/** Which badge tone suits a review state, without inventing a status. */
function badgeVariant(status: ReviewStatus) {
  if (status === "approved") return "success" as const;
  if (status === "changes_requested") return "warning" as const;
  return "brand" as const;
}

export function ReviewPanel({
  work,
  context,
}: {
  work: ReviewableWork;
  context: WorkspaceContext;
}) {
  const reviewStatus = work.currentReview?.status ?? null;
  // A review that exists is always described in the customer's own words —
  // including the open one, which is the most important state of all: this
  // version is with them, waiting for their decision. Only work with no review
  // at all falls back to the "not yet" wording.
  const decided =
    reviewStatus === "approved" || reviewStatus === "changes_requested";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>
                {reviewPanelTitle(reviewStatus)}
              </CardTitle>
              <CardDescription>
                {`You are reviewing version ${work.version}.`}
              </CardDescription>
            </div>
            {work.currentReview ? (
              <Badge variant={badgeVariant(work.currentReview.status)} className="shrink-0">
                {`Version ${work.currentReview.version}`}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {reviewPanelBody(reviewStatus)}
          </p>

          {work.canReview ? (
            <ReviewActions context={context} workId={work.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {decided
                ? "Your decision on this version is recorded below. There is nothing more to do on this version."
                : "There is nothing for you to decide yet. We will let you know here when this work is ready to look over."}
            </p>
          )}
        </CardContent>
      </Card>

      <WorkContextCard work={work} />
      <FeedbackHistory work={work} />
    </div>
  );
}

/** The project and the customer's own request, so the work is never a mystery. */
function WorkContextCard({ work }: { work: ReviewableWork }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What this work is</CardTitle>
        <CardDescription>
          The project and the request behind this version.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-eyebrow text-muted-foreground uppercase">
              Project
            </dt>
            <dd className="break-words text-sm text-foreground">
              {work.projectName}
            </dd>
          </div>
          {work.projectDescription ? (
            <div className="flex flex-col gap-1">
              <dt className="text-eyebrow text-muted-foreground uppercase">
                About this project
              </dt>
              <dd className="text-sm break-words text-muted-foreground">
                {work.projectDescription}
              </dd>
            </div>
          ) : null}
          {work.request ? (
            <div className="flex flex-col gap-1">
              <dt className="text-eyebrow text-muted-foreground uppercase">
                Your original request
              </dt>
              <dd className="text-sm break-words text-foreground">
                {work.request.title}
              </dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Everything the customer has said about this work, newest first.
 *
 * Feedback is never edited or removed, and it is always shown against the
 * version it was given about (spec §13.3 rule 4).
 */
function FeedbackHistory({ work }: { work: ReviewableWork }) {
  if (!work.history.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your feedback so far</CardTitle>
        <CardDescription>
          Kept with the version it was given about, exactly as you wrote it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border border-y border-border">
          {work.history.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 py-4">
              <p className="text-sm text-foreground">
                {`Version ${entry.version} — ${formatReviewTime(entry.createdAt)}`}
              </p>
              {entry.feedback ? (
                <p className="text-sm break-words text-muted-foreground">
                  {entry.feedback}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {entry.status === "approved"
                    ? "You approved this version."
                    : entry.status === "changes_requested"
                      ? "You asked for changes on this version."
                      : "This version is no longer the one under review."}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
