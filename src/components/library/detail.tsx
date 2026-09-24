import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import {
  formatFileSize,
  formatLibraryDate,
  libraryCategoryLabel,
  libraryCopy,
  libraryFileMeta,
  libraryWorkKindLabel,
} from "@/domains/library/presentation";
import type { LibraryItem } from "@/domains/library/data";
import { getContextMeta, type WorkspaceContext } from "@/lib/navigation";


/**
 * Customer Library detail view (Checkpoint 2.7) — shared by both contexts.
 *
 * Authorization and the hard 404 happen in the route file BEFORE this view
 * renders, so the entry already resolved as a delivered, customer-visible
 * file inside the caller's own scoped context. Plain facts only: the file,
 * where it came from, when it was delivered, and one secure download.
 */
export function LibraryFileDetail({
  context,
  item,
}: {
  context: WorkspaceContext;
  item: LibraryItem;
}) {
  const meta = getContextMeta(context);
  const listPath = `/workspace/${context}/library`;
  const size = formatFileSize(item.sizeBytes);

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta?.label ?? ""} workspace`, href: meta?.href },
          { label: libraryCopy[context].title, href: listPath },
          { label: item.filename },
        ]}
        eyebrow={libraryCategoryLabel(item.category)}
        title={item.filename}
        description={`Delivered ${formatLibraryDate(item.deliveredAt)} · ${libraryFileMeta(item)}`}
      />

      <Link
        href={listPath}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
      >
        Back to My Library
      </Link>

      <section aria-labelledby="library-file" className="flex min-w-0 flex-col gap-4">
        <h2 id="library-file" className="text-section text-balance">
          Your file
        </h2>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-base font-medium text-foreground [overflow-wrap:anywhere]">
            {item.filename}
          </p>
          <p className="text-meta text-muted-foreground">
            {[libraryWorkKindLabel(item.workType), size].filter(Boolean).join(" · ")}
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
        aria-labelledby="library-parent"
        className="flex min-w-0 flex-col gap-2"
      >
        <h2 id="library-parent" className="text-section text-balance">
          Part of this project
        </h2>
        <Link
          href={`/workspace/${context}/projects/${item.projectId}`}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center text-heading font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
        >
          {item.projectName}
        </Link>
        <p className="text-meta text-muted-foreground">{item.workName}</p>
        {item.projectDescription ? (
          <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {item.projectDescription}
          </p>
        ) : null}
      </section>
    </Container>
  );
}