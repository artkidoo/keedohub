import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { deliveryReadinessFor, listDeliveriesForJob } from "@/domains/production/delivery";
import { DeliverableForm } from "@/domains/production/deliverable-form";
import { JobControls, jobStatusLabels } from "@/domains/production/job-controls";
import {
  CustomerContextCard,
  DeliverableCard,
  DeliveryCard,
  JobSummary,
  QaCard,
  RequestCard,
} from "@/domains/production/job-view";
import { getProductionContext } from "@/domains/production/customer-context";
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
    return "This work has been delivered. Delivered work is final, so new work is a new job.";
  }
  return undefined;
}

/**
 * The approval facts the delivery panel shows, taken from the same loaded
 * context the gate used (Phase 3.2) — never re-queried and never taken from the
 * form.
 */
function deliveryContextOf(entry: {
  context: {
    reviewStatus: string | null;
    reviewedVersion: number | null;
    version: { assetId: string | null } | null;
  } | null;
}) {
  if (!entry.context) return null;
  return {
    approved: entry.context.reviewStatus === "approved",
    reviewStatus: entry.context.reviewStatus,
    reviewedVersion: entry.context.reviewedVersion,
    assetId: entry.context.version?.assetId ?? null,
  };
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

  const [
    sourceRequest,
    operators,
    deliverables,
    readiness,
    customerContext,
  ] = await Promise.all([
    getJobRequest(access, job.requestId),
    listActiveOperators(access),
    listJobDeliverables(access, job.id),
    qaReadiness(access, job.id),
    getProductionContext(access, job),
  ]);

  // Resolve the assigned operator's name from the active-operator list the
  // page already loads, so the header reflects who is doing the work today.
  const assignedOperatorName =
    operators.find((entry) => entry.id === job.assignedOperatorId)?.displayName ??
    null;

  const versionsByDeliverable = await Promise.all(
    deliverables.map((item) => listDeliverableVersions(access, item.id)),
  );
  const reviewsByDeliverable = await Promise.all(
    deliverables.map((item) => listReviewsForDeliverable(access, item.id)),
  );

  // Phase 3.2: the delivery facts for each deliverable, read through the same
  // gate the delivery action itself uses, so the operator sees the real reason
  // before pressing the button rather than after failing.
  const deliveryByDeliverable = await Promise.all(
    deliverables.map((item) => deliveryReadinessFor(access, item.id)),
  );
  const deliveriesByDeliverable = await listDeliveriesForJob(access, job.id);

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        breadcrumb={[{ label: "Production queue", href: "/studio/production" }]}
        title={job.title}
        eyebrow={`${job.workspaceSlug} · ${job.contextType} · priority ${job.priority}`}
        description={job.description ?? undefined}
        actions={
          <Badge variant="outline" className="shrink-0">
            {jobStatusLabels[job.status]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <JobSummary job={{ ...job, assignedOperatorName }} />
        <RequestCard source={sourceRequest} />
      </div>

      <CustomerContextCard context={customerContext} />

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
                    <DeliveryCard
                      deliverableId={item.id}
                      version={item.currentVersion}
                      readiness={deliveryByDeliverable[index].readiness}
                      context={deliveryContextOf(deliveryByDeliverable[index])}
                      delivery={
                        deliveriesByDeliverable.find(
                          (entry) => entry.deliverableId === item.id,
                        ) ?? null
                      }
                    />
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
