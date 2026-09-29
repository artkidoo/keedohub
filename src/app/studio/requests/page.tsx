import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import {
  countStudioRequestsByStatus,
  listStudioRequests,
} from "@/domains/studio/requests";
import {
  formatStudioTime,
  studioContextLabel,
  studioRequestStatusLabels,
} from "@/domains/studio/presentation";
import type { RequestStatus } from "@/lib/db/schema";

export const metadata = { title: "Requests" };

/** Intake states, in the order an operator works through them. */
const intakeStates: readonly RequestStatus[] = [
  "submitted",
  "in_validation",
  "changes_needed",
  "accepted",
  "declined",
];

/**
 * The request intake list (Phase 4.1, spec §10).
 *
 * One row per request, with what has been started from it — the project and job
 * columns come from the same left joins the query builds, so "nothing has been
 * started from this yet" is a fact rather than an absence of rows.
 *
 * No actions here: starting work from a request is done on the Production
 * queue, where the rest of the production controls live (Phase 3.1).
 */
export default async function StudioRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const unstartedOnly = params.unstarted === "1";
  const context = params.context === "brand" || params.context === "artist"
    ? params.context
    : undefined;

  const access = await requireOperator();

  const [counts, requests] = await Promise.all([
    countStudioRequestsByStatus(access),
    listStudioRequests(access, {
      unstartedOnly,
      contexts: context ? [context] : undefined,
      limit: 200,
    }),
  ]);

  const queryFor = (next: {
    unstarted?: boolean;
    context?: "brand" | "artist" | undefined;
  }) => {
    const search = new URLSearchParams();
    const wantsUnstarted = next.unstarted ?? unstartedOnly;
    const wantsContext = "context" in next ? next.context : context;
    if (wantsUnstarted) search.set("unstarted", "1");
    if (wantsContext) search.set("context", wantsContext);
    const query = search.toString();
    return query ? `?${query}` : "";
  };

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Requests"
        description="What customers have asked for, and what has been started from each one."
      />

      <section aria-labelledby="request-counts" className="flex min-w-0 flex-col gap-4">
        <h2 id="request-counts" className="text-section">
          By state
        </h2>
        <ul className="flex flex-wrap gap-2">
          {intakeStates.map((status) => (
            <li key={status}>
              <Badge variant={counts[status] ? "brand" : "neutral"}>
                {`${studioRequestStatusLabels[status]}: ${counts[status]}`}
              </Badge>
            </li>
          ))}
        </ul>
        <nav aria-label="Filter requests" className="flex flex-wrap gap-4 text-sm">
          <Link
            href={queryFor({ unstarted: false, context: undefined })}
            className="min-h-11 items-center underline underline-offset-4"
          >
            All requests
          </Link>
          <Link
            href={queryFor({ unstarted: true })}
            className="min-h-11 items-center underline underline-offset-4"
          >
            Nothing started yet
          </Link>
          <Link
            href={queryFor({ context: "brand" })}
            className="min-h-11 items-center underline underline-offset-4"
          >
            Brand
          </Link>
          <Link
            href={queryFor({ context: "artist" })}
            className="min-h-11 items-center underline underline-offset-4"
          >
            Artist
          </Link>
        </nav>
      </section>
      {requests.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {requests.map((entry) => (
            <li key={entry.id} className="py-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/studio/requests/${entry.id}`}
                    className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                  >
                    {entry.title}
                  </Link>
                  <p className="text-meta break-words text-muted-foreground">
                    {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)} · ${entry.category} · ${formatStudioTime(entry.createdAt)}`}
                  </p>
                  <p className="text-meta break-words text-muted-foreground">
                    {entry.projectId
                      ? `Started as ${entry.projectName} (${entry.projectStatus})${entry.jobId ? ` · job is ${entry.jobStatus}` : " · no job yet"}`
                      : "Nothing started from this request yet"}
                  </p>
                </div>
                <Badge
                  variant={entry.projectId ? "neutral" : "brand"}
                  className="shrink-0"
                >
                  {studioRequestStatusLabels[entry.status]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={unstartedOnly ? "Every request has been started" : "No requests match this filter"}
          description={
            unstartedOnly
              ? "Nothing is waiting to be picked up. Clear the filter to see every request this customer has sent."
              : "Clear the filter, or wait for the next request a customer sends."
          }
          action={
            <Link
              href="/studio/requests"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Show all requests
            </Link>
          }
        />
      )}
    </Container>
  );
}
