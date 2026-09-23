import { FileText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listWorkFiles } from "@/domains/dashboard/queries";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Files shared for one output (Checkpoint 2.5).
 *
 * Reads through `listWorkFiles`, whose predicate is the verified
 * `visibleFileScope` — the same one guarding the secure byte route — so this
 * component can only ever see files the signed-in customer may open. Bytes are
 * served by the existing route `/workspace/[context]/work/[id]/files/[fileId]`;
 * no second storage path exists. The section streams inside Suspense beneath
 * the page's authorization gates.
 */
export async function OutputFiles({
  access,
  context,
  outputId,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  outputId: string;
}) {
  const files = await listWorkFiles(access, context, outputId);

  if (!files.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No files shared yet"
        description="Nothing has been shared for this item yet. When the files are ready for you, they appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {files.map((file) => (
        <li key={file.id} className="py-4">
          <a
            href={`/workspace/${context}/work/${outputId}/files/${file.id}`}
            className="inline-flex min-h-11 max-w-full items-center text-base font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
          >
            Download
            <span className="sr-only"> </span>
            <span className="font-normal text-muted-foreground [overflow-wrap:anywhere]">
              {file.filename}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** File-row skeleton mirroring the download rows (spec §23.2). */
export function OutputFilesSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1].map((i) => (
        <li key={i} className="py-4">
          <Skeleton className="h-4 w-64 max-w-full" />
        </li>
      ))}
    </ul>
  );
}