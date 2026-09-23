import { Send } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { deliverableStatusLabels } from "@/domains/production/status";
import { deliverableStatusBadgeVariants } from "@/domains/outputs/presentation";
import { formatProjectDate } from "@/domains/projects/presentation";
import { listArtistAssets } from "@/domains/releases/data";
import type { ArtistAreaIcon } from "@/domains/releases/presentation";
import {
  artistAreaCopy,
  artistAssetCategoryLabel,
} from "@/domains/releases/taxonomy";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Rows of "My Assets" (Checkpoint 2.6) — the artist's own library of files
 * KeedoHub has made for them.
 *
 * Every row is one customer-visible `asset` in the artist context, read
 * through the verified `visibleFileScope` predicate: nothing internal, nothing
 * belonging to another workspace, another context, another version, or an
 * unfinished deliverable can appear. Downloads use the existing secure route.
 */
export async function AssetRows({
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
  const copy = artistAreaCopy.assets;
  const items = await listArtistAssets(access, context);

  if (!items.length) {
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
      {items.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-meta text-muted-foreground">
              {artistAssetCategoryLabel(entry.deliverableType)}
            </span>
            <Link
              href={`${listPath}/${entry.id}`}
              className="min-w-0 text-heading font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35 [overflow-wrap:anywhere]"
            >
              {entry.filename}
            </Link>
            <span className="text-meta text-muted-foreground [overflow-wrap:anywhere]">
              {`Part of ${entry.projectName}`}
            </span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
            <span className="text-meta text-muted-foreground">
              {`Updated ${formatProjectDate(entry.updatedAt)}`}
            </span>
            <Badge variant={deliverableStatusBadgeVariants[entry.deliverableStatus]}>
              {deliverableStatusLabels[entry.deliverableStatus]}
            </Badge>
            <a
              href={`/workspace/${context}/work/${entry.deliverableId}/files/${entry.id}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
            >
              Download<span className="sr-only"> {entry.filename}</span>
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Row-shaped skeleton; mirrors the list layout so nothing jumps (spec §23.2). */
export function AssetListSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-60 max-w-full" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </span>
          <span className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20" />
          </span>
        </li>
      ))}
    </ul>
  );
}
