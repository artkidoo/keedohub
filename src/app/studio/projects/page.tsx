import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import {
  countStudioProjectsByStatus,
  listStudioProjects,
} from "@/domains/studio/projects";
import {
  formatStudioTime,
  studioContextLabel,
  studioProjectStatusLabels,
} from "@/domains/studio/presentation";
import type { ProjectStatus } from "@/lib/db/schema";

export const metadata = { title: "Projects" };

/** Project states, in the order a project moves through them. */
const projectStates: readonly ProjectStatus[] = [
  "requested",
  "in_production",
  "in_review",
  "changes_requested",
  "approved",
  "delivered",
];

/**
 * The project list (Phase 4.1, spec §11).
 *
 * Projects are the accepted work — the same project records the customer sees
 * under "My Projects", with the operational detail an operator needs alongside
 * them: how many jobs, deliverables and deliveries it has. A customer with one
 * project and a customer with fifty are the same list, sorted newest first.
 */
export default async function StudioProjectsPage() {
  const access = await requireOperator();

  const [counts, projects] = await Promise.all([
    countStudioProjectsByStatus(access),
    listStudioProjects(access, { limit: 200 }),
  ]);

  const countFor = (status: ProjectStatus) =>
    counts.find((entry) => entry.status === status)?.value ?? 0;

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Projects"
        description="Accepted work, with its jobs, deliverables and what has been handed over."
      />

      <section aria-labelledby="project-counts" className="flex min-w-0 flex-col gap-4">
        <h2 id="project-counts" className="text-section">
          By state
        </h2>
        <ul className="flex flex-wrap gap-2">
          {projectStates.map((status) => (
            <li key={status}>
              <Badge variant={countFor(status) ? "brand" : "neutral"}>
                {`${studioProjectStatusLabels[status]}: ${countFor(status)}`}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {projects.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {projects.map((entry) => (
            <li key={entry.id} className="py-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/studio/projects/${entry.id}`}
                    className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                  >
                    {entry.name}
                  </Link>
                  <p className="text-meta break-words text-muted-foreground">
                    {`${entry.workspaceSlug}${entry.profileName ? ` · ${entry.profileName}` : ""} · ${studioContextLabel(entry.contextType)} · updated ${formatStudioTime(entry.updatedAt)}`}
                  </p>
                  <p className="text-meta break-words text-muted-foreground">
                    {`${entry.jobs} jobs · ${entry.deliverables} deliverables · ${entry.deliveries} deliveries${entry.requestTitle ? ` · from “${entry.requestTitle}”` : ""}`}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {studioProjectStatusLabels[entry.status as ProjectStatus] ??
                    entry.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No projects yet"
          description="A project exists once a request is accepted and production is ready to start."
          action={
            <Link
              href="/studio/requests"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Review waiting requests
            </Link>
          }
        />
      )}
    </Container>
  );
}
