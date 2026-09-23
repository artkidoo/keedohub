import { Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requestCategoryLabel } from "@/domains/requests/categories";
import { listRequests } from "@/domains/requests/data";
import {
  formatRequestDate,
  requestStatusBadgeVariants,
} from "@/domains/requests/presentation";
import { requestStatusLabels } from "@/domains/production/status";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type RequestsPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: RequestsPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "requests")
    : undefined;
  return { title: item?.label ?? "My Requests" };
}

/**
 * Every request of one context, newest first (spec §8.4 rule 3: a customer
 * can see the state of every request they have made).
 *
 * Authorization runs server-side before anything is read: the session, the
 * caller's owned workspace and the context profile are resolved from the
 * database — the URL only names which of the caller's own contexts to show.
 */
export default async function RequestsPage({ params }: RequestsPageProps) {
  const { context } = await params;

  if (!isWorkspaceContext(context)) {
    notFound();
  }

  const listPath = `/workspace/${context}/requests`;
  const access = await requireWorkspaceContext(context, listPath);
  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "requests");

  if (!meta || !item) {
    notFound();
  }

  const newPath = `${listPath}/new`;

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} requests`}
        title={item.label}
        description={item.description}
        actions={
          <Link href={newPath} className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <Send aria-hidden />
            New request
          </Link>
        }
      />

      <Suspense fallback={<RequestsListSkeleton />}>
        <RequestRows access={access} context={context} listPath={listPath} />
      </Suspense>
    </Container>
  );
}

/**
 * The rows are the only async part, so the header streams immediately while
 * the list resolves (spec §23.2).
 */
async function RequestRows({
  access,
  context,
  listPath,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  listPath: string;
}) {
  const requests = await listRequests(access, context);

  if (!requests.length) {
    return (
      <EmptyState
        icon={Send}
        title="Nothing requested yet"
        description="Ask for what you need — a document, artwork, a whole project — and it will appear here with its state, so you always know where things stand."
        action={
          <Link
            href={`${listPath}/new`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            <Send aria-hidden />
            Start a request
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {requests.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`${listPath}/${entry.id}`}
            className="group flex min-h-11 flex-col gap-2 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-muted-foreground">
                {requestCategoryLabel(context, entry.category)}
              </span>
              <span className="text-heading font-semibold text-foreground transition-colors group-hover:text-primary">
                {entry.title}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-meta text-muted-foreground">
                {formatRequestDate(entry.createdAt)}
              </span>
              <Badge variant={requestStatusBadgeVariants[entry.status]}>
                {requestStatusLabels[entry.status]}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rows-only skeleton inside a Suspense boundary — not a `loading.tsx`.
 *
 * A loading boundary at this level would also wrap `requests/[id]` and stream
 * a shell (status 200) before the detail route's `generateMetadata` could
 * throw its hard 404 for foreign or missing ids (spec §19.5).
 */
function RequestsListSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1, 2, 3].map((row) => (
        <li
          key={row}
          className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-32 max-w-full" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </span>
          <span className="flex items-center gap-3">
            <Skeleton className="h-4 w-24 max-w-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </span>
        </li>
      ))}
    </ul>
  );
}