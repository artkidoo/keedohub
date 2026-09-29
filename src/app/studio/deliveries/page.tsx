import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { listStudioDeliveries } from "@/domains/studio/deliveries";
import {
  formatStudioSize,
  formatStudioTime,
  studioContextLabel,
} from "@/domains/studio/presentation";

export const metadata = { title: "Deliveries" };

/**
 * The delivery list (Phase 4.1, spec §15).
 *
 * Approved work handed to customers, newest first, with the exact file that was
 * handed over and by whom. The filename and size are joined from the asset
 * record rather than reconstructed, so what is on screen is what was delivered —
 * a delivery with no recorded file says so instead of showing a blank that
 * looks like a bug.
 *
 * Read-only: deliveries are created by the delivery action on the production
 * job (Phase 3.2), and nothing here can create, undo or alter one.
 */
export default async function StudioDeliveriesPage() {
  const access = await requireOperator();
  const deliveries = await listStudioDeliveries(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Deliveries"
        description="Approved work handed to customers, with the exact file each one carried."
      />

      {deliveries.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {deliveries.map((entry) => (
            <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={`/studio/projects/${entry.projectId}`}
                  className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                >
                  {`${entry.deliverableName} · v${entry.version}`}
                </Link>
                <p className="text-meta break-words text-muted-foreground">
                  {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)} · ${entry.projectName} · ${formatStudioTime(entry.createdAt)}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {entry.filename
                    ? `File: ${entry.filename} · ${entry.mimeType ?? "unknown type"} · ${formatStudioSize(entry.sizeBytes)}${entry.stored ? "" : " · bytes not stored"}`
                    : "No file recorded for this delivery"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Delivered</Badge>
                <Badge variant="neutral">
                  {entry.deliveredBy
                    ? `by ${entry.deliveredBy}`
                    : "operator not recorded"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No deliveries yet"
          description="When approved work is handed to a customer on its production job, the delivery appears here with the file it carried."
          action={
            <Link
              href="/studio/review"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              See approved work
            </Link>
          }
        />
      )}
    </Container>
  );
}
