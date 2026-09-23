import { FolderKanban, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { projectStatusLabels } from "@/domains/production/status";
import { listProjects } from "@/domains/projects/data";
import {
  formatProjectDate,
  projectStatusBadgeVariants,
} from "@/domains/projects/presentation";
import { requestCategoryLabel } from "@/domains/requests/categories";
import type { WorkspaceContextAccess } from "@/domains/workspace/access";
import { requireWorkspaceContext } from "@/domains/workspace/access";
import {
  findNavItemBySlug,
  getContextMeta,
  isWorkspaceContext,
} from "@/lib/navigation";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ProjectsPageProps = {
  params: Promise<{ context: string }>;
};

export async function generateMetadata({ params }: ProjectsPageProps) {
  const { context } = await params;
  const item = isWorkspaceContext(context)
    ? findNavItemBySlug(context, "projects")
    : undefined;
  return { title: item?.label ?? "My Projects" };
}

/**
 * "My Projects" — the customer's project list for one context (Checkpoint 2.4).
 *
 * URL params are never authorization: context is validated as a real
 * workspace context, then `requireWorkspaceContext` resolves the
 * session-derived workspace and its profile for that context (spec §5,
 * §19). Projects are scoped with the shared `dashboardScope` predicate,
 * so a Brand list can never contain Artist projects or another
 * workspace's rows (spec §20.2). Customers only view projects here —
 * project creation stays with the request → production process (§9).
 */
export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { context } = await params;
  if (!isWorkspaceContext(context)) notFound();
  const listPath = `/workspace/${context}/projects`;
  const access = await requireWorkspaceContext(context, listPath);
  const meta = getContextMeta(context);
  const item = findNavItemBySlug(context, "projects");
  if (!meta || !item) notFound();

  return (
    <Container className="flex min-w-0 flex-col gap-8 py-8 [overflow-wrap:anywhere] sm:gap-10 sm:py-12">
      <PageHeader
        breadcrumb={[
          { label: `${meta.label} workspace`, href: meta.href },
          { label: item.label },
        ]}
        eyebrow={`${meta.label} projects`}
        title={item.label}
        description="Follow the creative work KeedoHub is doing for you: every project, where it stands, and what is ready to open."
      />
      {/* List loading via Suspense. No loading.tsx exists at or above this
          route's [id] segment: a segment-level loading boundary streams
          HTTP 200 before notFound() can establish a 404 (verified in
          Checkpoint 2.3). */}
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectRows access={access} context={context} listPath={listPath} />
      </Suspense>
    </Container>
  );
}

async function ProjectRows({
  access,
  context,
  listPath,
}: {
  access: WorkspaceContextAccess;
  context: WorkspaceContext;
  listPath: string;
}) {
  const projects = await listProjects(access, context);

  if (!projects.length) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="When KeedoHub starts working on one of your requests, the project appears here with its progress, timeline, and any files shared with you."
        action={
          <Link
            href={`/workspace/${context}/requests/new`}
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
      {projects.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`${listPath}/${entry.id}`}
            className="group flex min-h-11 flex-col gap-3 rounded-sm py-5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-muted-foreground">
                {entry.requestCategory
                  ? requestCategoryLabel(context, entry.requestCategory)
                  : "Project"}
              </span>
              <span className="text-heading font-semibold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
                {entry.name}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              {entry.hasWork ? (
                <span className="inline-flex items-center gap-1.5 text-meta text-primary">
                  Files ready
                </span>
              ) : null}
              <span className="text-meta text-muted-foreground">
                {entry.updatedAt.getTime() > entry.createdAt.getTime()
                  ? "Updated "
                  : "Created "}
                {formatProjectDate(entry.updatedAt)}
              </span>
              <Badge variant={projectStatusBadgeVariants[entry.status]}>
                {projectStatusLabels[entry.status]}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Row-shaped skeleton; mirrors the list layout so nothing jumps (spec §23.2). */
function ProjectsListSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-72 max-w-full" />
          </span>
          <span className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-28" />
          </span>
        </li>
      ))}
    </ul>
  );
}