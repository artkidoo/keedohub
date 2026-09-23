import { Send } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { projectStatusLabels } from "@/domains/production/status";
import {
  formatProjectDate,
  projectStatusBadgeVariants,
} from "@/domains/projects/presentation";
import { listReleases } from "@/domains/releases/data";
import { formatReleaseDate } from "@/domains/releases/presentation";
import type { ArtistAreaIcon } from "@/domains/releases/presentation";
import { artistAreaCopy, releaseTypeLabel } from "@/domains/releases/taxonomy";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Rows of "My Releases" (Checkpoint 2.6).
 *
 * A suspended server component so the shell paints immediately while the
 * scoped query runs — the established 2.3–2.5 pattern. No segment
 * `loading.tsx` exists anywhere under this route. A release is an artist
 * project carrying release metadata, so every row is real project data and the
 * file count is the real number of customer-visible files.
 */
export async function ReleaseRows({
  access,
  context,
  listPath,
  icon,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  listPath: string;
  icon: ArtistAreaIcon;
}) {
  const copy = artistAreaCopy.releases;
  const releases = await listReleases(access, context);

  if (!releases.length) {
    return (
      <EmptyState
        icon={icon}
        title={copy.emptyTitle}
        description={`${copy.emptyDescription} You can also ask us to create something new.`}
        action={
          <Link
            href={`/workspace/${context}/requests/new`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            <Send aria-hidden />
            Request creative work
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {releases.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`${listPath}/${entry.id}`}
            className="group flex min-h-11 flex-col gap-3 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-muted-foreground">
                {entry.releaseType
                  ? releaseTypeLabel(entry.releaseType)
                  : copy.title}
              </span>
              <span className="text-heading font-semibold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
                {entry.name}
              </span>
              {entry.releaseDate ? (
                <span className="text-meta text-muted-foreground">
                  {`Released ${formatReleaseDate(entry.releaseDate)}`}
                </span>
              ) : null}
            </span>
            <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              {entry.fileCount > 0 ? (
                <span className="text-meta text-primary">
                  {entry.fileCount === 1 ? "1 file" : `${entry.fileCount} files`}
                </span>
              ) : null}
              <span className="text-meta text-muted-foreground">
                {`Updated ${formatProjectDate(entry.updatedAt)}`}
              </span>
              <Badge variant={projectStatusBadgeVariants[entry.status]}>
                {projectStatusLabels[entry.status]}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Row-shaped skeleton; mirrors the list layout so nothing jumps (spec §23.2). */
export function ReleaseListSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-3 w-36 max-w-full" />
          </span>
          <span className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </span>
        </li>
      ))}
    </ul>
  );
}
