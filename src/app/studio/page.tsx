import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { getCommandCenter } from "@/domains/studio/command-center";
import {
  formatStudioAge,
  formatStudioTime,
  studioContextLabel,
  studioJobStatusLabels,
  studioRequestStatusLabels,
} from "@/domains/studio/presentation";

export const metadata = { title: "Command Center" };

/** One number on the attention strip, always pointing at the screen behind it. */
function CountLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 flex-col gap-1 rounded-xl border border-border bg-surface-elevated px-4 py-3 hover:border-primary"
      >
        <span className="text-heading font-semibold text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-meta text-muted-foreground">{label}</span>
      </Link>
    </li>
  );
}

/**
 * The Command Center (Phase 4.1, spec §6).
 *
 * The first screen an operator opens, and it answers exactly one question: what
 * needs attention now. Every number is a count of rows that exist and every row
 * links to the real screen where the work is done, so this surface never becomes
 * a second place where state is kept — or a second place where it can be wrong.
 *
 * Nothing is estimated, projected or summarised from a sample. An empty section
 * says there is nothing there.
 */
export default async function CommandCenterPage() {
  const access = await requireOperator();
  const board = await getCommandCenter(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Command Center"
        description="What needs attention across every customer. Internal to KeedoHub."
      />

      <section aria-labelledby="attention-counts" className="flex min-w-0 flex-col gap-4">
        <h2 id="attention-counts" className="text-section">
          Waiting now
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <CountLink href="/studio/requests" label="New requests" value={board.counts.newRequests} />
          <CountLink href="/studio/production" label="In production" value={board.counts.inProduction} />
          <CountLink href="/studio/production" label="In internal QA" value={board.counts.awaitingInternalQa} />
          <CountLink href="/studio/review" label="With the customer" value={board.counts.awaitingCustomer} />
          <CountLink href="/studio/review" label="Changes requested" value={board.counts.changesRequested} />
          <CountLink href="/studio/deliveries" label="Approved, not delivered" value={board.counts.awaitingDelivery} />
        </ul>
      </section>
      <section aria-labelledby="attention" className="flex min-w-0 flex-col gap-5">
        <h2 id="attention" className="text-section">
          Needs an operator next
        </h2>
        {board.attention.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {board.attention.map((job) => (
              <li key={job.id} className="py-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/studio/production/${job.id}`}
                      className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                    >
                      {job.title}
                    </Link>
                    <p className="text-meta break-words text-muted-foreground">
                      {`${job.workspaceSlug} · ${studioContextLabel(job.contextType)} · ${job.productionType} · ${job.projectName} · updated ${formatStudioAge(job.updatedAt)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {studioJobStatusLabels[job.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No jobs are waiting on an operator"
            description="Every job is either with the customer or finished. New work appears here the moment a request is picked up."
          />
        )}
      </section>

      <section aria-labelledby="new-requests" className="flex min-w-0 flex-col gap-5">
        <h2 id="new-requests" className="text-section">
          Requests nobody has started
        </h2>
        {board.newRequests.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {board.newRequests.map((entry) => (
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
                      {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)} · ${entry.category} · sent ${formatStudioAge(entry.createdAt)}`}
                    </p>
                  </div>
                  <Badge variant="brand" className="shrink-0">
                    {studioRequestStatusLabels[entry.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Every request has been started"
            description="Requests a customer has sent that have no project yet appear here so nothing sits unread."
          />
        )}
      </section>

      <section aria-labelledby="recent-deliveries" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent-deliveries" className="text-section">
            Recently delivered
          </h2>
          <p className="text-meta text-muted-foreground">
            {`${board.counts.deliveredTotal} delivered in total`}
          </p>
        </div>
        {board.recentDeliveries.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {board.recentDeliveries.map((entry) => (
              <li key={entry.id} className="flex min-w-0 flex-col gap-1 py-4">
                <p className="font-medium break-words">
                  {`${entry.deliverableName} · v${entry.version}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)} · ${entry.projectName} · ${entry.filename ?? "no file recorded"} · ${formatStudioTime(entry.createdAt)}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing has been delivered yet"
            description="Approved work that an operator delivers to a customer is recorded here with the exact file."
          />
        )}
      </section>
    </Container>
  );
}
