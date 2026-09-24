/**
 * My Library (Checkpoint 2.7) — shared by both contexts.
 *
 * Authorization resolves in the page shell (the WorkspaceShell already
 * requires the context), and only the file list streams, so the list has a
 * loading state without a `loading.tsx` boundary sitting above a dynamic
 * [id] route.
 */

import { PackageOpen } from "lucide-react";
import { Suspense } from "react";

import { LibraryRows, LibraryRowsSkeleton } from "@/components/library/list";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { listLibrary } from "@/domains/library/data";
import { libraryCopy } from "@/domains/library/presentation";
import {
  requireWorkspaceContext,
  type WorkspaceContextAccess,
} from "@/domains/workspace/access";
import {
  isWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type LibraryPageProps = { params: Promise<{ context: string }> };

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) {
    // Unknown contexts are not workspace routes at all.
    notFound();
  }
  const access = await requireWorkspaceContext(context);
  const copy = libraryCopy[context];

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 sm:py-12 [overflow-wrap:anywhere]">
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <Suspense fallback={<LibraryRowsSkeleton />}>
        <LibraryList context={context} access={access} copy={copy} />
      </Suspense>
    </Container>
  );
}

async function LibraryList({
  context,
  access,
  copy,
}: {
  context: WorkspaceContext;
  access: WorkspaceContextAccess;
  copy: (typeof libraryCopy)[keyof typeof libraryCopy];
}) {
  const items = await listLibrary(access, context);

  if (!items.length) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={copy.emptyTitle}
        description={copy.emptyDescription}
        action={
          <Link
            href={`/workspace/${context}/requests/new`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Request creative work
          </Link>
        }
      />
    );
  }

  return (
    <section aria-labelledby="library-items" className="flex min-w-0 flex-col gap-4">
      <h2 id="library-items" className="sr-only">
        Delivered files
      </h2>
      <LibraryRows context={context} items={items} />
    </section>
  );
}
