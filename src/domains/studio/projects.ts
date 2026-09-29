/**
 * Studio projects (Phase 4.1, spec §11, §12).
 *
 * A project is the same project the customer sees in "My Projects" — one record,
 * two views. The Studio adds the operational detail around it (jobs, versions,
 * reviews, deliveries) and never restates its state: every status shown here is
 * read from the record the workflow writes.
 *
 * Jobs, deliverables, versions, reviews and deliveries are read through the
 * existing Phase 3 functions rather than re-queried, so the Studio cannot drift
 * from the production workflow (spec §13, §14).
 */

import { asc, count, desc, eq, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { listJobsForProject } from "@/domains/production/chain";
import { listDeliveriesForJob } from "@/domains/production/delivery";
import { assertOperatorAccess, isRealId } from "@/domains/production/errors";
import { listJobDeliverables, qaReadiness } from "@/domains/production/qa";
import { listReviewsForDeliverable } from "@/domains/production/review";
import { listDeliverableVersions } from "@/domains/production/versions";
import { getDb } from "@/lib/db";
import {
  brandProfile,
  artistProfile,
  deliverable,
  delivery,
  project,
  request,
  workspace,
} from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";

/** Longest Studio list served in one read. */
const STUDIO_LIST_LIMIT = 200;

/** One project row, with the customer and its production volume. */
export type StudioProjectRow = {
  id: string;
  name: string;
  status: string;
  contextType: "brand" | "artist";
  releaseType: string | null;
  workspaceId: string;
  workspaceSlug: string;
  profileName: string | null;
  requestId: string | null;
  requestTitle: string | null;
  jobs: number;
  deliverables: number;
  deliveries: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Every project, most recently active first. */
export async function listStudioProjects(
  access: OperatorAccess,
  filter: { workspaceId?: string; limit?: number } = {},
): Promise<StudioProjectRow[]> {
  assertOperatorAccess(access);

  const limit = Math.min(filter.limit ?? STUDIO_LIST_LIMIT, STUDIO_LIST_LIMIT);

  return getDb()
    .select({
      id: project.id,
      name: project.name,
      status: project.status,
      contextType: project.contextType,
      releaseType: project.releaseType,
      workspaceId: project.workspaceId,
      workspaceSlug: workspace.slug,
      profileName: sql<string | null>`coalesce(${brandProfile.name}, ${artistProfile.name})`,
      requestId: project.requestId,
      requestTitle: request.title,
      jobs: sql<number>`(select count(*)::int from production_job j where j.project_id = ${project.id})`,
      deliverables: sql<number>`(select count(*)::int from deliverable d where d.project_id = ${project.id})`,
      deliveries: sql<number>`(select count(*)::int from delivery dl where dl.project_id = ${project.id})`,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .innerJoin(workspace, eq(workspace.id, project.workspaceId))
    .leftJoin(brandProfile, eq(brandProfile.id, project.brandProfileId))
    .leftJoin(artistProfile, eq(artistProfile.id, project.artistProfileId))
    .leftJoin(request, eq(request.id, project.requestId))
    .where(filter.workspaceId ? eq(project.workspaceId, filter.workspaceId) : undefined)
    .orderBy(desc(project.updatedAt), desc(project.id))
    .limit(limit);
}

/** Project counts per customer status, for an honest summary line. */
export async function countStudioProjectsByStatus(
  access: OperatorAccess,
): Promise<{ status: string; value: number }[]> {
  assertOperatorAccess(access);

  return getDb()
    .select({ status: project.status, value: count() })
    .from(project)
    .groupBy(project.status)
    .orderBy(asc(project.status));
}

/** One job of a project, with everything an operator needs to open it. */
export type StudioProjectJob = {
  job: Awaited<ReturnType<typeof listJobsForProject>>[number];
  readiness: Awaited<ReturnType<typeof qaReadiness>>;
  deliverables: {
    deliverable: Awaited<ReturnType<typeof listJobDeliverables>>[number];
    versions: Awaited<ReturnType<typeof listDeliverableVersions>>;
    reviews: Awaited<ReturnType<typeof listReviewsForDeliverable>>;
  }[];
  deliveries: Awaited<ReturnType<typeof listDeliveriesForJob>>;
};

export type StudioProjectDetail = {
  project: Project;
  workspaceSlug: string;
  profileName: string | null;
  request: {
    id: string;
    title: string;
    category: string;
    status: string;
    description: string | null;
    createdAt: Date;
  } | null;
  jobs: StudioProjectJob[];
};

/**
 * One project in full: the request that started it, every job, and for each job
 * its deliverables with their complete version and review history, plus what was
 * delivered.
 *
 * Every nested read is an existing Phase 3 function, so this screen shows the
 * workflow rather than a second interpretation of it.
 */
export async function getStudioProject(
  access: OperatorAccess,
  projectId: string,
): Promise<StudioProjectDetail | null> {
  assertOperatorAccess(access);
  if (!isRealId(projectId)) return null;

  const db = getDb();

  const [record] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (!record) return null;

  const [owner] = await db
    .select({ slug: workspace.slug })
    .from(workspace)
    .where(eq(workspace.id, record.workspaceId))
    .limit(1);

  // The profile that names this project, read from whichever side the project
  // points at — never guessed from the project's own fields.
  const [profile] = record.brandProfileId
    ? await db
        .select({ name: brandProfile.name })
        .from(brandProfile)
        .where(eq(brandProfile.id, record.brandProfileId))
        .limit(1)
    : record.artistProfileId
      ? await db
          .select({ name: artistProfile.name })
          .from(artistProfile)
          .where(eq(artistProfile.id, record.artistProfileId))
          .limit(1)
      : [{ name: null }];

  const [source] = record.requestId
    ? await db
        .select({
          id: request.id,
          title: request.title,
          category: request.category,
          status: request.status,
          description: request.description,
          createdAt: request.createdAt,
        })
        .from(request)
        .where(eq(request.id, record.requestId))
        .limit(1)
    : [undefined];

  const jobRows = await listJobsForProject(access, record.id);

  const jobs: StudioProjectJob[] = await Promise.all(
    jobRows.map(async (job) => {
      const [readiness, jobDeliverables, deliveries] = await Promise.all([
        qaReadiness(access, job.id),
        listJobDeliverables(access, job.id),
        listDeliveriesForJob(access, job.id),
      ]);

      const deliverables = await Promise.all(
        jobDeliverables.map(async (item) => ({
          deliverable: item,
          versions: await listDeliverableVersions(access, item.id),
          reviews: await listReviewsForDeliverable(access, item.id),
        })),
      );

      return { job, readiness, deliverables, deliveries };
    }),
  );

  return {
    project: record,
    workspaceSlug: owner?.slug ?? "—",
    profileName: profile?.name ?? null,
    request: source ?? null,
    jobs,
  };
}

/** Deliverables of one customer workspace (used by Studio Library). */
export async function countWorkspaceDeliverables(
  access: OperatorAccess,
  workspaceId: string,
): Promise<number> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({ value: count() })
    .from(deliverable)
    .where(eq(deliverable.workspaceId, workspaceId));

  return row?.value ?? 0;
}

/** Deliveries recorded for one project. */
export async function countProjectDeliveries(
  access: OperatorAccess,
  projectId: string,
): Promise<number> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({ value: count() })
    .from(delivery)
    .where(eq(delivery.projectId, projectId));

  return row?.value ?? 0;
}

/** Jobs of one project (re-exported so the Studio has one import for them). */
export { listJobsForProject };
