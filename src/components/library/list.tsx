/**
 * Customer Library rows (Checkpoint 2.7).
 *
 * Editorial hairline list rather than a card grid: one delivered file per
 * row, title first, metadata second, download last. Rows stack on narrow
 * screens and sit inline from `sm` up; every filename wraps instead of
 * clipping, and the download target keeps a 44px tap area.
 */

import Link from "next/link";

import {
  formatLibraryDate,
  libraryCategoryLabel,
  libraryFileMeta,
  libraryWorkKindLabel,
} from "@/domains/library/presentation";
import type { LibraryItem } from "@/domains/library/data";
import type { WorkspaceContext } from "@/lib/navigation";

/** Secure download href — the existing verified file route, never a path. */
function downloadHref(context: WorkspaceContext, item: LibraryItem) {
  return `/workspace/${context}/work/${item.deliverableId}/files/${item.id}`;
}

function LibraryRow({
  context,
  item,
}: {
  context: WorkspaceContext;
  item: LibraryItem;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-meta text-muted-foreground">
          {libraryCategoryLabel(item.category)} · {libraryWorkKindLabel(item.workType)}
        </p>
        <h3 className="text-heading font-semibold text-balance [overflow-wrap:anywhere]">
          <Link
            href={`/workspace/${context}/library/${item.id}`}
            className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            {item.filename}
          </Link>
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {item.projectName}
        </p>
        <p className="text-meta text-muted-foreground">
          Delivered {formatLibraryDate(item.deliveredAt)} ·{" "}
          {libraryFileMeta(item)}
        </p>
      </div>
      <a
        href={downloadHref(context, item)}
        className="inline-flex min-h-11 shrink-0 items-center self-start text-sm font-medium text-primary underline underline-offset-4 sm:self-auto"
      >
        Download<span className="sr-only"> {item.filename}</span>
      </a>
    </li>
  );
}

/** Delivered files for the current context, most recent delivery first. */
export function LibraryRows({
  context,
  items,
}: {
  context: WorkspaceContext;
  items: LibraryItem[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {items.map((item) => (
        <LibraryRow key={item.id} context={context} item={item} />
      ))}
    </ul>
  );
}

/** Loading placeholder mirroring the row layout (no data is invented). */
export function LibraryRowsSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-3/4 max-w-full animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-48 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
        </li>
      ))}
    </ul>
  );
}
