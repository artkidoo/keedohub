import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { DeliverableForm } from "@/domains/production/deliverable-form";
import { JobControls, jobStatusLabels } from "@/domains/production/job-controls";
import { DeliverableCard, JobSummary, QaCard, RequestCard } from "@/domains/production/job-view";
import { listJobDeliverables, qaReadiness } from "@/domains/production/qa";
import { getJobRequest, getProductionJob, listActiveOperators } from "@/domains/production/queue";
import { listReviewsForDeliverable } from "@/domains/production/review";
import { VersionForm } from "@/domains/production/version-form";
import { listDeliverableVersions } from "@/domains/production/versions";
import { isValidUUIDv4 } from "@/lib/validation/id";

export const metadata = { title: "Production job" };

/** Why a new version cannot be produced right now, when it cannot. */
function versionBlocker(status: string): string | undefined {
  if (status === "customer_review") {
    return "This work is with the customer for review. A new version can only be produced after that review is decided.";
  }
  if (status === "delivered") {
    return "Delivered work is immutable. New work is a new job.";
  }
  return undefined;
}

/**
 * The production workspace for one job (Phase 3.1).
 *
 * Everything an operator needs to do the work, and nothing more: who the
 * customer is, what they asked for, which project it belongs to, what kind of
 * production this is, where the job stands, who is working on it, and every
 * deliverable with its full version history and review record.
 *
 * It is a production surface, not a design surface. There is no canvas, no
 * template browser and no creative engine here — and none of that belongs to the
 * customer either (spec §4.2, §7.4).
 */
export default async function ProductionJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  if (!isValidUUIDv4(jobId)) notFound();

  const access = await requireOperator();
  const job = await getProductionJob(access, jobId);
  if (!job) notFound();

  const [sourceRequest, operators, deliverables, readiness] = await Promise.all([
    getJobRequest(access, job.requestId),
    listActiveOperators(access),
    listJobDeliverables(access, job.id),
    qaReadiness(access, job.id),
  ]);

  const versionsByDeliverable = await Promise.all(
    deliverables.map((item) => listDeliverableVersions(access, item.id)),
  );
  const reviewsByDeliverable = await Promise.all(
    deliverables.map((item) => listReviewsForDeliverable(access, item.id)),
  );

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        breadcrumb={[{ label: "Production queue", href: "/studio/production" }]}
        title={job.title}
        eyebrow={`${job.workspaceSlug} · ${job.contextType}`}
        description={job.description ?? undefined}
        actions={
          <Badge variant="outline" className="shrink-0">
            {jobStatusLabels[job.status]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <JobSummary job={job} />
        <RequestCard source={sourceRequest} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment and next steps</CardTitle>
          <CardDescription>
            Only the moves this job&rsquo;s current state allows are offered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobControls
            jobId={job.id}
            status={job.status}
            operators={operators}
            assignedOperatorId={job.assignedOperatorId}
          />
        </CardContent>
      </Card>

      <QaCard ready={readiness.ready} findings={readiness.findings} />

      <section aria-labelledby="deliverables" className="flex min-w-0 flex-col gap-6">
        <h2 id="deliverables" className="text-section">
          Deliverables
        </h2>

        {deliverables.length ? (
          <ul className="flex flex-col gap-6">
            {deliverables.map((item, index) => {
              const versions = versionsByDeliverable[index];
              const nextVersion =
                versions.reduce(
                  (highest, entry) => Math.max(highest, entry.version),
                  0,
                ) + 1;

              return (
                <li key={item.id}>
                  <DeliverableCard
                    deliverable={item}
                    versions={versions}
                    reviews={reviewsByDeliverable[index]}
                  >
                    <VersionForm
                      deliverableId={item.id}
                      nextVersion={nextVersion}
                      disabledReason={versionBlocker(job.status)}
                    />
                  </DeliverableCard>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No deliverables on this job yet"
            description="Add the piece of work this job produces, then produce its first version."
          />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add a deliverable</CardTitle>
          <CardDescription>
            A deliverable is the piece of work the customer receives and reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliverableForm jobId={job.id} />
        </CardContent>
      </Card>
    </Container>
  );
}
