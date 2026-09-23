import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { deliverableStatusBadgeVariants } from "@/domains/outputs/presentation";
import {
  deliverableStatusLabels,
  projectStatusLabels,
} from "@/domains/production/status";
import {
  formatProjectDate,
  projectStatusBadgeVariants,
} from "@/domains/projects/presentation";
import { listReleaseWork } from "@/domains/releases/data";
import type { ReleaseEntry } from "@/domains/releases/data";
import { formatFileSize, formatReleaseDate } from "@/domains/releases/presentation";
import {
  artistAreaCopy,
  artistAssetCategoryLabel,
  releaseTypeLabel,
} from "@/domains/releases/taxonomy";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
} from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Customer-facing detail view for one release (Checkpoint 2.6).
 *
 * Authorization, navigation validation and the hard 404 all happen in the
 * route file BEFORE this view renders — it receives a release that already
 * resolved inside the caller's scoped artist context, as a release rather than
 * an ordinary project. Files stream inside Suspense beneath those gates and
 * bytes come from the existing secure route. Read-only by design.
 */
export function ReleaseDetailView({
  access,
  context,
  release,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  release: ReleaseEntry;
}) {
  const meta = getContextMeta(context);
  const navItem = findNavItemBySlug(context, artistAreaCopy.releases.slug);
  const listPath = `/workspace/${context}/releases`;
  const copy = artistAreaCopy.releases;
  const typeLabel = release.releaseType
    ? releaseTypeLabel(release.releaseType)
    : copy.title;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta?.label ?? ""} workspace`, href: meta?.href },
          { label: navItem?.label ?? copy.title, href: listPath },
          { label: release.name },
        ]}
        eyebrow={typeLabel}
        title={release.name}
        description={
          release.releaseDate
            ? `${projectStatusLabels[release.status]} · Released ${formatReleaseDate(release.releaseDate)}`
            : projectStatusLabels[release.status]
        }
        actions={
          <Badge variant={projectStatusBadgeVariants[release.status]}>
            {projectStatusLabels[release.status]}
          </Badge>
        }
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
      >
        {`Back to ${navItem?.label ?? copy.title}`}
      </Link>

      {release.description ? (
        <section
          aria-labelledby="release-about"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="release-about" className="text-section text-balance">
            About this release
          </h2>
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {release.description}
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="release-files"
        className="flex min-w-0 flex-col gap-5"
      >
        <h2 id="release-files" className="text-section text-balance">
          Your files
        </h2>
        {/* Streams after the 404 gates above. */}
        <Suspense fallback={<ReleaseWorkSkeleton />}>
          <ReleaseWork access={access} context={context} projectId={release.id} />
        </Suspense>
      </section>

      <section
        aria-labelledby="release-progress"
        className="flex min-w-0 flex-col gap-2"
      >
        <h2 id="release-progress" className="text-section text-balance">
          Project progress
        </h2>
        <Link
          href={`/workspace/${context}/projects/${release.id}`}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center text-base font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          See where this release stands
        </Link>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {`Last updated ${formatProjectDate(release.updatedAt)}.`}
        </p>
      </section>
    </Container>
  );
}

/**
 * The release's customer-visible deliverables and their files, grouped by the
 * deliverable that produced them. One scoped query over customer-visible
 * records only.
 */
async function ReleaseWork({
  access,
  context,
  projectId,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  projectId: string;
}) {
  const work = await listReleaseWork(access, context, projectId);

  if (!work.length) {
    return (
      <EmptyState
        title="No files shared yet"
        description="Nothing has been shared for this release yet. As soon as work is ready for you, it appears here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-8">
      {work.map((group) => (
        <li key={group.id} className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-muted-foreground">
                {artistAssetCategoryLabel(group.type)}
              </span>
              <span className="text-heading font-semibold text-foreground [overflow-wrap:anywhere]">
                {group.name}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-meta text-muted-foreground">
                {`Version ${group.version}`}
              </span>
              <Badge variant={deliverableStatusBadgeVariants[group.status]}>
                {deliverableStatusLabels[group.status]}
              </Badge>
            </span>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {group.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="min-w-0">
                  <span className="block text-base font-medium text-foreground [overflow-wrap:anywhere]">
                    {file.filename}
                  </span>
                  {formatFileSize(file.sizeBytes) ? (
                    <span className="mt-0.5 block text-meta text-muted-foreground">
                      {formatFileSize(file.sizeBytes)}
                    </span>
                  ) : null}
                </span>
                <a
                  href={`/workspace/${context}/work/${group.id}/files/${file.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary underline underline-offset-4"
                >
                  Download<span className="sr-only"> {file.filename}</span>
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/** Deliverable/file skeleton mirroring the grouped layout (spec §23.2). */
function ReleaseWorkSkeleton() {
  return (
    <ul className="flex flex-col gap-8">
      {[0, 1].map((i) => (
        <li key={i} className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </li>
      ))}
    </ul>
  );
}
