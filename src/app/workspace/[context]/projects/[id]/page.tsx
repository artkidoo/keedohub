import { Images } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  projectStatusLabels,
  projectStatusSummaries,
} from "@/domains/production/status";
import { getProject, listProjectFiles } from "@/domains/projects/data";
import {
  formatProjectDate,
  projectStatusBadgeVariants,
  projectTimeline,
} from "@/domains/projects/presentation";
import { requestCategoryLabel } from "@/domains/requests/categories";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";
import { isValidUUIDv4 } from "@/lib/validation/id";
import { cn } from "@/lib/utils";

type ProjectDetailPageProps = {
  params: Promise<{ context: string; id: string }>;
};

/**
 * Hard-404 architecture (verified Checkpoint 2.3): notFound() is decided
 * during generateMetadata and at the TOP of the page component, before any
 * Suspense boundary exists in the rendered tree, so foreign, malformed and
 * missing project ids stream a real 404. No loading.tsx exists anywhere
 * under this route — do not add one above `[id]`.
 */
export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { context, id } = await params;
  if (isWorkspaceContext(context) && isValidUUIDv4(id)) {
    const access = await requireWorkspaceContext(context);
    const entry = await getProject(access, context, id);
    if (entry) return { title: entry.name };
  }
  notFound();
}

/**
 * Customer-facing project detail (Checkpoint 2.4): title, customer status,
 * what is happening, the origin request when one exists, real timeline
 * events, and customer-visible files — all scope-first through
 * `requireWorkspaceContext` + `dashboardScope`/`visibleFileScope`. The
 * files section streams inside Suspense AFTER the 404 gates, so the shell
 * only commits for projects that genuinely exist (spec §5, §19, §20).
 * Customers view projects only: no editing, no creation, no internal
 * production metadata (§24).
 */
export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { context, id } = await params;
  if (!isWorkspaceContext(context) || !isValidUUIDv4(id)) notFound();
  const listPath = `/workspace/${context}/projects`;
  const access = await requireWorkspaceContext(context, `${listPath}/${id}`);
  const entry = await getProject(access, context, id);
  if (!entry) notFound();
  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "projects");
  if (!meta || !item) notFound();

  const timeline = projectTimeline(entry);

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label, href: listPath },
          { label: entry.name },
        ]}
        eyebrow={
          entry.request
            ? requestCategoryLabel(context, entry.request.category)
            : `${meta.label} project`
        }
        title={entry.name}
        description={`Created ${formatProjectDate(entry.createdAt)}. Last updated ${formatProjectDate(entry.updatedAt)}.`}
        actions={
          <Badge variant={projectStatusBadgeVariants[entry.status]}>
            {projectStatusLabels[entry.status]}
          </Badge>
        }
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
      >
        Back to My Projects
      </Link>

      <p
        role="status"
        className={cn(
          "max-w-prose rounded-xl border px-4 py-3 text-sm leading-relaxed",
          entry.status === "in_review"
            ? "border-warning/30 bg-warning/10 text-warning-foreground"
            : "border-border bg-surface/60 text-muted-foreground",
        )}
      >
        {projectStatusSummaries[entry.status]}
      </p>

      {entry.description ? (
        <section aria-labelledby="project-about" className="flex min-w-0 flex-col gap-4">
          <h2 id="project-about" className="text-section text-balance">
            About this project
          </h2>
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {entry.description}
          </p>
        </section>
      ) : null}

      {entry.request ? (
        <section aria-labelledby="project-requested" className="flex min-w-0 flex-col gap-2">
          <h2 id="project-requested" className="text-section text-balance">
            Requested work
          </h2>
          <p className="text-meta text-muted-foreground">Created from your request</p>
          <Link
            href={`/workspace/${context}/requests/${entry.request.id}`}
            className="inline-flex min-h-11 min-w-0 max-w-full items-center text-heading font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
          >
            {entry.request.title}
          </Link>
          {!entry.description && entry.request.description ? (
            <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {entry.request.description}
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="project-files" className="flex min-w-0 flex-col gap-5">
        <h2 id="project-files" className="text-section text-balance">
          Creative work
        </h2>
        {/* Streams after the 404 gates above; visibility enforced by the
            same scope predicate that guards the secure download route. */}
        <Suspense fallback={<ProjectFilesSkeleton />}>
          <ProjectFiles access={access} context={context} projectId={entry.id} />
        </Suspense>
      </section>

      <section aria-labelledby="project-timeline" className="flex min-w-0 flex-col gap-4">
        <h2 id="project-timeline" className="text-section text-balance">
          Timeline
        </h2>
        <ol className="flex flex-col gap-3">
          {timeline.map((event) => (
            <li key={event.label} className="flex min-w-0 gap-3 text-base text-muted-foreground">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {event.date ? (
                  <span className="font-medium text-foreground">
                    {formatProjectDate(event.date)}:{" "}
                  </span>
                ) : null}
                {event.label}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </Container>
  );
}

async function ProjectFiles({
  access,
  context,
  projectId,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  projectId: string;
}) {
  const files = await listProjectFiles(access, context, projectId);

  if (!files.length) {
    return (
      <EmptyState
        icon={Images}
        title="No files shared yet"
        description="Nothing has been shared for this project yet. When work is ready for you to see, the files appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="min-w-0">
            <span className="block text-base font-medium text-foreground [overflow-wrap:anywhere]">
              {file.filename}
            </span>
            <span className="mt-0.5 block text-meta text-muted-foreground">
              {file.workName}
            </span>
          </span>
          <a
            href={`/workspace/${context}/work/${file.deliverableId}/files/${file.id}`}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Download<span className="sr-only"> {file.filename}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** File-row skeleton mirroring the download row layout (spec §23.2). */
function ProjectFilesSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </span>
          <Skeleton className="h-4 w-24" />
        </li>
      ))}
    </ul>
  );
}