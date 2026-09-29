import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import {
  formatStudioTime,
  studioContextLabel,
  studioJobStatusLabels,
  studioProjectStatusLabels,
  studioReviewStatusLabels,
} from "@/domains/studio/presentation";
import { getStudioProject } from "@/domains/studio/projects";
import type { ProjectStatus } from "@/lib/db/schema";
import { isValidUUIDv4 } from "@/lib/validation/id";

export const metadata = { title: "Project" };

/** Why the internal QA gate says a job is not ready, in operator words. */
const qaReasons: Record<string, string> = {
  no_current_version: "has no current version yet",
  no_file: "has no file recorded on its current version",
  not_shared: "has a file the customer cannot see",
};

/**
 * One project in full (Phase 4.1, spec §11, §12).
 *
 * The accepted work, read top to bottom: the request that asked for it, then
 * every job with its QA readiness, every deliverable with its whole version and
 * review history, and everything that has been delivered from it.
 *
 * Every nested read is the same function the Production workspace uses, so this
 * screen shows the workflow rather than a retelling of it — and there are no
 * controls here: production changes are made where they are made (Phase 3).
 */
export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!isValidUUIDv4(projectId)) notFound();

  const access = await requireOperator();
  const detail = await getStudioProject(access, projectId);
  if (!detail) notFound();

  const { project: record, request: source, jobs } = detail;

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title={record.name}
        description={`${detail.workspaceSlug}${detail.profileName ? ` · ${detail.profileName}` : ""} · ${studioContextLabel(record.contextType)} · created ${formatStudioTime(record.createdAt)} · updated ${formatStudioTime(record.updatedAt)}`}
        actions={
          <Badge variant="outline">
            {studioProjectStatusLabels[record.status as ProjectStatus] ?? record.status}
          </Badge>
        }
      />

      <section aria-labelledby="source" className="flex min-w-0 flex-col gap-4">
        <h2 id="source" className="text-section">
          Where it came from
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>
              {source ? source.title : "Not started from a request"}
            </CardTitle>
            <CardDescription>
              {source
                ? `${source.category} · sent ${formatStudioTime(source.createdAt)}`
                : "This project has no linked request."}
            </CardDescription>
          </CardHeader>
          {source ? (
            <CardContent className="flex flex-col gap-3">
              <p className="whitespace-pre-wrap break-words">
                {source.description ??
                  "The customer sent no description with the request."}
              </p>
              <Link
                href={`/studio/requests/${source.id}`}
                className="inline-flex min-h-11 items-center break-words text-primary underline underline-offset-4"
              >
                Open the request
              </Link>
            </CardContent>
          ) : null}
        </Card>
      </section>
      <section aria-labelledby="jobs" className="flex min-w-0 flex-col gap-5">
        <h2 id="jobs" className="text-section">
          Jobs
        </h2>
        {jobs.length ? (
          <div className="flex flex-col gap-6">
            {jobs.map(({ job, readiness, deliverables, deliveries }) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>
                        <Link
                          href={`/studio/production/${job.id}`}
                          className="break-words text-primary underline underline-offset-4"
                        >
                          {job.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {`${job.productionType} · priority ${job.priority} · updated ${formatStudioTime(job.updatedAt)}`}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {studioJobStatusLabels[job.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-eyebrow uppercase text-muted-foreground">
                      Internal QA
                    </p>
                    <p className="break-words">
                      {readiness.ready
                        ? "Every deliverable has a current version with a file the customer can see."
                        : "Not ready for QA:"}
                    </p>
                    {readiness.ready ? null : (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {readiness.findings.map((finding) => (
                          <li
                            key={`${finding.deliverableId}-${finding.reason}`}
                            className="break-words"
                          >
                            {`${finding.deliverableName} ${qaReasons[finding.reason] ?? finding.reason}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="text-eyebrow uppercase text-muted-foreground">
                      Deliverables
                    </p>
                    {deliverables.length ? (
                      <ul className="flex flex-col gap-4">
                        {deliverables.map((entry) => (
                          <li key={entry.deliverable.id} className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="font-medium break-words">
                                {entry.deliverable.name}
                              </p>
                              <Badge variant="neutral" className="shrink-0">
                                {`v${entry.deliverable.currentVersion}`}
                              </Badge>
                            </div>

                            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                              {entry.versions.map((version) => (
                                <li key={version.id} className="break-words">
                                  {`v${version.version}${version.isCurrent ? " (current)" : ""} · ${formatStudioTime(version.createdAt)}${version.note ? ` · ${version.note}` : ""}`}
                                </li>
                              ))}
                              {!entry.versions.length ? (
                                <li className="break-words">
                                  No versions produced yet.
                                </li>
                              ) : null}
                            </ul>

                            <ul className="flex flex-col gap-2 text-sm">
                              {entry.reviews.map((review) => (
                                <li key={review.id} className="break-words">
                                  <Badge
                                    variant={
                                      review.status === "approved"
                                        ? "success"
                                        : review.status === "changes_requested"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {`v${review.version} · ${studioReviewStatusLabels[review.status]}`}
                                  </Badge>
                                  {review.feedback ? (
                                    <span className="ml-2 text-muted-foreground">
                                      {review.feedback}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                              {!entry.reviews.length ? (
                                <li className="break-words text-muted-foreground">
                                  No review decisions yet.
                                </li>
                              ) : null}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No deliverables defined for this job yet.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-eyebrow uppercase text-muted-foreground">
                      Delivered from this job
                    </p>
                    {deliveries.length ? (
                      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                        {deliveries.map((entry) => (
                          <li key={entry.id} className="break-words">
                            {`v${entry.version} · delivered ${formatStudioTime(entry.createdAt)}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nothing has been delivered from this job yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No jobs on this project"
            description="Production jobs appear here once work starts for this project."
            action={
              <Link
                href="/studio/production"
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                Open the Production queue
              </Link>
            }
          />
        )}
      </section>
    </Container>
  );
}
