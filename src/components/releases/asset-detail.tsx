import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { deliverableStatusBadgeVariants } from "@/domains/outputs/presentation";
import { deliverableStatusLabels } from "@/domains/production/status";
import { formatProjectDate } from "@/domains/projects/presentation";
import type { ArtistAssetEntry } from "@/domains/releases/data";
import { formatFileSize } from "@/domains/releases/presentation";
import {
  artistAreaCopy,
  artistAssetCategoryLabel,
} from "@/domains/releases/taxonomy";
import { findNavItemBySlug, getContextMeta } from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";

/**
 * Customer-facing detail view for one asset in the artist's library
 * (Checkpoint 2.6).
 *
 * Authorization and the hard 404 happen in the route file BEFORE this view
 * renders — the entry already resolved inside the caller's scoped artist
 * context. Plain facts the customer can use: the file, its size, where it
 * came from, and one secure download. No storage, provider or job detail.
 */
export function AssetDetailView({
  context,
  item,
}: {
  context: WorkspaceContext;
  item: ArtistAssetEntry;
}) {
  const meta = getContextMeta(context);
  const navItem = findNavItemBySlug(context, artistAreaCopy.assets.slug);
  const listPath = `/workspace/${context}/assets`;
  const copy = artistAreaCopy.assets;
  const size = formatFileSize(item.sizeBytes);

  // The parent is named and linked in the artist's own words: releases point
  // at the release page, ordinary projects point at their project page.
  const parentPath = item.projectReleaseType
    ? `/workspace/${context}/releases/${item.projectId}`
    : `/workspace/${context}/projects/${item.projectId}`;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta?.label ?? ""} workspace`, href: meta?.href },
          { label: navItem?.label ?? copy.title, href: listPath },
          { label: item.filename },
        ]}
        eyebrow={artistAssetCategoryLabel(item.deliverableType)}
        title={item.filename}
        description={`Version ${item.version} · Updated ${formatProjectDate(item.updatedAt)}`}
        actions={
          <Badge variant={deliverableStatusBadgeVariants[item.deliverableStatus]}>
            {deliverableStatusLabels[item.deliverableStatus]}
          </Badge>
        }
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
      >
        {`Back to ${navItem?.label ?? copy.title}`}
      </Link>

      <section aria-labelledby="asset-file" className="flex min-w-0 flex-col gap-4">
        <h2 id="asset-file" className="text-section text-balance">
          Your file
        </h2>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-base font-medium text-foreground [overflow-wrap:anywhere]">
            {item.filename}
          </p>
          <p className="text-meta text-muted-foreground">
            {[size, item.deliverableName].filter(Boolean).join(" · ")}
          </p>
          <a
            href={`/workspace/${context}/work/${item.deliverableId}/files/${item.id}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Download<span className="sr-only"> {item.filename}</span>
          </a>
        </div>
      </section>

      <section
        aria-labelledby="asset-parent"
        className="flex min-w-0 flex-col gap-2"
      >
        <h2 id="asset-parent" className="text-section text-balance">
          {item.projectReleaseType ? "Part of this release" : "Part of this project"}
        </h2>
        <Link
          href={parentPath}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center text-heading font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          {item.projectName}
        </Link>
        {item.projectDescription ? (
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {item.projectDescription}
          </p>
        ) : null}
      </section>
    </Container>
  );
}
