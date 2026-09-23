import { Send } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { deliverableStatusLabels } from "@/domains/production/status";
import { listOutputs } from "@/domains/outputs/data";
import {
  deliverableStatusBadgeVariants,
  type OutputIcon,
} from "@/domains/outputs/presentation";
import { outputCategoryLabel, outputFamilies } from "@/domains/outputs/taxonomy";
import type { OutputFamily } from "@/domains/outputs/taxonomy";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { formatProjectDate } from "@/domains/projects/presentation";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type OutputListProps = {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  family: OutputFamily;
  listPath: string;
  /** Lucide icon used by the empty state, e.g. `FileText`. */
  icon: OutputIcon;
};

/**
 * Rows of "My Documents" / "My Marketing" (Checkpoint 2.5).
 *
 * A suspended server component so the page shell paints immediately while the
 * scoped query runs (the established 2.3/2.4 list pattern — no segment
 * `loading.tsx` exists anywhere under these routes). Every row is a real
 * record with a real file count; the empty state is honest and offers the
 * request route, because requests remain the one way customers ask for work.
 */
export async function OutputRows({
  access,
  context,
  family,
  listPath,
  icon,
}: OutputListProps) {
  const meta = outputFamilies[family];
  const items = await listOutputs(access, context, family);

  if (!items.length) {
    return (
      <EmptyState
        icon={icon}
        title={meta.emptyTitle}
        description={`${meta.emptyDescription} You can also ask us to make something new.`}
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
        <li key={entry.id}>
          <Link
            href={`${listPath}/${entry.id}`}
            className="group flex min-h-11 flex-col gap-3 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-muted-foreground">
                {outputCategoryLabel(entry.type)}
              </span>
              <span className="text-heading font-semibold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
                {entry.name}
              </span>
              <span className="text-meta text-muted-foreground [overflow-wrap:anywhere]">
                Part of {entry.projectName}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              <span className="text-meta text-primary">
                {entry.fileCount === 1 ? "1 file" : `${entry.fileCount} files`}
              </span>
              <span className="text-meta text-muted-foreground">
                Updated {formatProjectDate(entry.updatedAt)}
              </span>
              <Badge variant={deliverableStatusBadgeVariants[entry.status]}>
                {deliverableStatusLabels[entry.status]}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Row-shaped skeleton; mirrors the list layout so nothing jumps (spec §23.2). */
export function OutputListSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-3 w-40 max-w-full" />
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
