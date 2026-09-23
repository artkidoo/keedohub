import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { OutputFiles, OutputFilesSkeleton } from "@/components/outputs/files";
import { Badge } from "@/components/ui/badge";
import type { OutputEntry } from "@/domains/outputs/data";
import { deliverableStatusBadgeVariants } from "@/domains/outputs/presentation";
import { outputCategoryLabel, outputFamilies } from "@/domains/outputs/taxonomy";
import type { OutputFamily } from "@/domains/outputs/taxonomy";
import { formatProjectDate } from "@/domains/projects/presentation";
import { deliverableStatusLabels } from "@/domains/production/status";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
} from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Customer-facing detail view for one document / marketing output
 * (Checkpoint 2.5), shared by both routes.
 *
 * Authorization, navigation validation and the hard 404 all happen in the
 * route files BEFORE this view renders — it receives an entry that already
 * resolved inside the caller's scoped context and family. Files stream inside
 * Suspense below the gates, and bytes come from the existing secure route.
 * Read-only by design: no editing, no versions management, no approvals.
 */
export function OutputDetailView({
  access,
  context,
  family,
  entry,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  family: OutputFamily;
  entry: OutputEntry;
}) {
  const meta = getContextMeta(context);
  const navItem = findNavItemBySlug(context, outputFamilies[family].slug);
  const listPath = `/workspace/${context}/${outputFamilies[family].slug}`;
  const statusLabel = deliverableStatusLabels[entry.status];

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta?.label ?? ""} workspace`, href: meta?.href },
          { label: navItem?.label ?? outputFamilies[family].title, href: listPath },
          { label: entry.name },
        ]}
        eyebrow={outputCategoryLabel(entry.type)}
        title={entry.name}
        description={`Version ${entry.version} · Updated ${formatProjectDate(entry.updatedAt)}`}
        actions={
          <Badge variant={deliverableStatusBadgeVariants[entry.status]}>
            {statusLabel}
          </Badge>
        }
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
      >
        {`Back to ${navItem?.label ?? outputFamilies[family].title}`}
      </Link>

      <section
        aria-labelledby="output-project"
        className="flex min-w-0 flex-col gap-2"
      >
        <h2 id="output-project" className="text-section text-balance">
          Part of this project
        </h2>
        <Link
          href={`/workspace/${context}/projects/${entry.projectId}`}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center text-heading font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          {entry.projectName}
        </Link>
        {entry.projectDescription ? (
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {entry.projectDescription}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="output-files"
        className="flex min-w-0 flex-col gap-5"
      >
        <h2 id="output-files" className="text-section text-balance">
          Your files
        </h2>
        <Suspense fallback={<OutputFilesSkeleton />}>
          <OutputFiles
            access={access}
            context={context}
            outputId={entry.id}
          />
        </Suspense>
      </section>
    </Container>
  );
}