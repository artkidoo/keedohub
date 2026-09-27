import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { IntakeRow } from "@/domains/production/intake-row";
import { jobStatusLabels } from "@/domains/production/job-controls";
import { jobLifecycle } from "@/domains/production/lifecycle";
import {
  countProductionQueueByStatus,
  listOpenRequests,
  listProductionQueue,
} from "@/domains/production/queue";
import { requestStatusLabels } from "@/domains/production/status";

export const metadata = { title: "Production queue" };

/**
 * The private production queue (Phase 3.1).
 *
 * Two lists, because that is what an operator needs to start work: the customer
 * requests waiting to be picked up, and the jobs in flight. Internal vocabulary
 * is used deliberately and correctly here — this surface is never reachable by a
 * customer (spec §19, §24).
 *
 * Everything shown is real: the counts come from the same query the rows do, and
 * an empty queue says so rather than inventing work.
 */
export default async function ProductionQueuePage() {
  const access = await requireOperator();

  const [counts, jobs, openRequests] = await Promise.all([
    countProductionQueueByStatus(access),
    listProductionQueue(access, { limit: 100 }),
    listOpenRequests(access),
  ]);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Production queue"
        description="Requests waiting to be started, and the work in flight. Everything here is internal to KeedoHub."
      />

      <section aria-labelledby="queue-counts" className="flex min-w-0 flex-col gap-4">
        <h2 id="queue-counts" className="text-section">
          Jobs by state
        </h2>
        <ul className="flex flex-wrap gap-2">
          {jobLifecycle.map((status) => (
            <li key={status}>
              <Badge variant={counts[status] ? "brand" : "neutral"}>
                {`${jobStatusLabels[status]}: ${counts[status]}`}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="intake" className="flex min-w-0 flex-col gap-5">
        <h2 id="intake" className="text-section">
          Requests waiting to be started
        </h2>
        {openRequests.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {openRequests.map((entry) => (
              <IntakeRow
                key={entry.id}
                requestId={entry.id}
                title={entry.title}
                meta={`${entry.workspaceSlug} · ${entry.contextType} · ${entry.category} · ${requestStatusLabels[entry.status]}`}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No requests are waiting"
            description="When a customer sends a request, it appears here with everything needed to start production for it."
          />
        )}
      </section>

      <section aria-labelledby="jobs" className="flex min-w-0 flex-col gap-5">
        <h2 id="jobs" className="text-section">
          Jobs in production
        </h2>
        {jobs.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {jobs.map((job) => (
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
                      {`${job.workspaceSlug} · ${job.contextType} · ${job.productionType} · ${job.projectName} · priority ${job.priority}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {jobStatusLabels[job.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No jobs in production"
            description="Start work from a request above and the job will appear here with its own workspace."
          />
        )}
      </section>
    </Container>
  );
}
