import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { listStudioFiles } from "@/domains/studio/deliveries";
import {
  formatStudioSize,
  formatStudioTime,
  studioContextLabel,
} from "@/domains/studio/presentation";

export const metadata = { title: "Library" };

/**
 * The internal file view (Phase 4.1, spec §16).
 *
 * Every file in the chain, and — the question an operator actually asks — can
 * the customer see it? That answer is read from the record's own
 * `customer_visible` flag and its version's `is_current` flag; this surface
 * reports those facts and has no power to change them. A file the customer
 * cannot see is listed here as exactly that, not silently hidden.
 *
 * There is no upload, move, publish or delete action on this screen: the Studio
 * library is an inventory of what exists, and file changes belong to the
 * production workflow that created them (spec §16).
 */
export default async function StudioLibraryPage() {
  const access = await requireOperator();
  const files = await listStudioFiles(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Library"
        description="Files recorded in the chain, with whether each one is current and whether the customer can see it."
      />

      {files.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {files.map((entry) => (
            <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium break-words">
                  {`${entry.filename} · v${entry.version}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {`${entry.workspaceSlug} · ${studioContextLabel(entry.contextType)}${entry.projectName ? ` · ${entry.projectName}` : ""}${entry.deliverableName ? ` · ${entry.deliverableName}` : ""} · added ${formatStudioTime(entry.createdAt)}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {`${entry.category} · ${formatStudioSize(entry.sizeBytes)}${entry.mimeType ? ` · ${entry.mimeType}` : ""}${entry.stored ? "" : " · bytes not stored"}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={entry.isCurrent ? "brand" : "neutral"}>
                  {entry.isCurrent ? "Current version" : "Superseded"}
                </Badge>
                <Badge variant={entry.delivered ? "success" : "neutral"}>
                  {entry.delivered ? "Delivered" : "Not delivered"}
                </Badge>
                <Badge variant={entry.customerVisible ? "success" : "warning"}>
                  {entry.customerVisible
                    ? "Customer can see this"
                    : "Hidden from the customer"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No files yet"
          description="Files produced as versions of deliverables appear here as soon as the first one is recorded."
        />
      )}
    </Container>
  );
}
