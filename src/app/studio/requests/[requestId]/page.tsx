import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import {
  formatStudioSize,
  formatStudioTime,
  studioContextLabel,
  studioDeliverableStatusLabels,
  studioJobStatusLabels,
  studioRequestStatusLabels,
} from "@/domains/studio/presentation";
import { getStudioRequest } from "@/domains/studio/requests";
import { isValidUUIDv4 } from "@/lib/validation/id";

export const metadata = { title: "Request" };

/**
 * One request in full (Phase 4.1, spec §10.1).
 *
 * The intake question answered on one screen: what did they ask for, and what
 * has been started from it? Project, jobs, deliverables and files are shown as
 * the same records the Production queue and the customer's own screens read, so
 * this page can never disagree with either of them.
 */
export default async function StudioRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  if (!isValidUUIDv4(requestId)) notFound();

  const access = await requireOperator();
  const entry = await getStudioRequest(access, requestId);
  if (!entry) notFound();

  const { request: record, project: made } = entry;

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title={record.title}
        description={`${entry.workspaceSlug}${entry.profileName ? ` · ${entry.profileName}` : ""} · ${studioContextLabel(record.contextType)} · ${record.category} · sent ${formatStudioTime(record.createdAt)}`}
        actions={
          <Badge variant="outline">{studioRequestStatusLabels[record.status]}</Badge>
        }
      />

      <section aria-labelledby="brief" className="flex min-w-0 flex-col gap-4">
        <h2 id="brief" className="text-section">
          What they asked for
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Brief</CardTitle>
            <CardDescription>
              In the customer&apos;s own words. The Studio works from this text
              rather than a summary of it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words">
              {record.description ?? "The customer sent no description with this request."}
            </p>
          </CardContent>
        </Card>
      </section>
      <section aria-labelledby="started" className="flex min-w-0 flex-col gap-5">
        <h2 id="started" className="text-section">
          What has been started from it
        </h2>
        {made ? (
          <ul className="divide-y divide-border border-y border-border">
            <li className="py-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/studio/projects/${made.id}`}
                    className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                  >
                    {made.name}
                  </Link>
                  <p className="text-meta break-words text-muted-foreground">
                    {`Project started ${formatStudioTime(made.createdAt)}`}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {made.status}
                </Badge>
              </div>
            </li>
          </ul>
        ) : (
          <EmptyState
            title="No project from this request yet"
            description="Accepting the request on the Production queue creates the project, and it appears here with its jobs."
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

      <section aria-labelledby="jobs" className="flex min-w-0 flex-col gap-5">
        <h2 id="jobs" className="text-section">
          Jobs
        </h2>
        {entry.jobs.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {entry.jobs.map((job) => (
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
                      {job.productionType}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {studioJobStatusLabels[job.status as keyof typeof studioJobStatusLabels]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No jobs yet"
            description="A job is created when production starts for this request."
          />
        )}
      </section>

      <section aria-labelledby="deliverables" className="flex min-w-0 flex-col gap-5">
        <h2 id="deliverables" className="text-section">
          Deliverables
        </h2>
        {entry.deliverables.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {entry.deliverables.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium break-words">{item.name}</p>
                    <p className="text-meta break-words text-muted-foreground">
                      {`Current version v${item.currentVersion}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {studioDeliverableStatusLabels[item.status as keyof typeof studioDeliverableStatusLabels]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No deliverables yet"
            description="Deliverables appear as production defines what will be handed over."
          />
        )}
      </section>

      <section aria-labelledby="files" className="flex min-w-0 flex-col gap-5">
        <h2 id="files" className="text-section">
          Files in the chain
        </h2>
        {entry.files.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {entry.files.map((file) => (
              <li key={file.id} className="flex min-w-0 flex-col gap-1 py-4">
                <p className="font-medium break-words">
                  {`${file.filename} · v${file.version}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {`${file.category} · ${formatStudioSize(file.sizeBytes)} · ${
                    file.customerVisible
                      ? "the customer can see this file"
                      : "not visible to the customer"
                  }`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No files yet"
            description="Files recorded against deliverables of this request appear here, with whether the customer can see them."
          />
        )}
      </section>
    </Container>
  );
}
