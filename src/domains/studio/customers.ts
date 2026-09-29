/**
 * Studio customers (Phase 4.1, spec §9, §10).
 *
 * A customer, for the Studio, means a workspace: the account that owns it, the
 * Brand and/or Artist context inside it, and the work that has come out of it.
 * There is no separate "Studio customer" record — a second customer table would
 * be a second truth about who the customer is.
 *
 * What is deliberately NOT selected anywhere in this module: passwords, sessions,
 * accounts, verification tokens, or any other authentication material. The
 * Studio shows the operator who the customer is and what they asked for; it has
 * no business reading how they sign in (spec §9).
 *
 * The detail read takes a workspace id from the route, so it is validated as a
 * UUID and then resolved in a single query that returns null for anything that
 * does not exist — the page turns that into a 404. Nothing widens access: an
 * operator is authorised for the whole Studio by their own record, and no
 * workspace id can grant anything a customer could use.
 */

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { assertOperatorAccess, isRealId } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import {
  artistProfile,
  brandProfile,
  deliverable,
  delivery,
  productionJob,
  project,
  request,
  user,
  workspace,
} from "@/lib/db/schema";
import type { Workspace } from "@/lib/db/schema";

/** Longest Studio list served in one read. */
const STUDIO_LIST_LIMIT = 200;

/** One customer row: the workspace, its contexts and its volume of work. */
export type StudioCustomerRow = {
  workspaceId: string;
  slug: string;
  workspaceName: string;
  /** The owning account's display name. Never a credential. */
  ownerName: string;
  ownerEmail: string;
  brandProfileId: string | null;
  brandName: string | null;
  artistProfileId: string | null;
  artistName: string | null;
  requests: number;
  projects: number;
  activeJobs: number;
  deliveries: number;
  createdAt: Date;
};

/**
 * Every customer workspace, busiest first.
 *
 * Volume is read through correlated subqueries rather than joins, so counts
 * can never multiply each other: a workspace with two requests and two jobs
 * reports two of each, not four of everything. A join would fan out the rows
 * (request × project × job × delivery) and turn `count()` into a lie (spec §9).
 */
export async function listStudioCustomers(
  access: OperatorAccess,
): Promise<StudioCustomerRow[]> {
  assertOperatorAccess(access);

  const db = getDb();

  return db
    .select({
      workspaceId: workspace.id,
      slug: workspace.slug,
      workspaceName: workspace.name,
      // The account's name and address identify the customer; no credential,
      // token or session field is selected anywhere in the Studio.
      ownerName: user.name,
      ownerEmail: user.email,
      brandProfileId: brandProfile.id,
      brandName: brandProfile.name,
      artistProfileId: artistProfile.id,
      artistName: artistProfile.name,
      requests: sql<number>`(
        select count(*)::int from request r where r.workspace_id = ${workspace.id}
      )`,
      projects: sql<number>`(
        select count(*)::int from project p where p.workspace_id = ${workspace.id}
      )`,
      activeJobs: sql<number>`(
        select count(*)::int from production_job j
         where j.workspace_id = ${workspace.id}
           and j.status <> 'delivered'
      )`,
      deliveries: sql<number>`(
        select count(*)::int from delivery dl where dl.workspace_id = ${workspace.id}
      )`,
      createdAt: workspace.createdAt,
    })
    .from(workspace)
    .innerJoin(user, eq(user.id, workspace.userId))
    .leftJoin(brandProfile, eq(brandProfile.workspaceId, workspace.id))
    .leftJoin(artistProfile, eq(artistProfile.workspaceId, workspace.id))
    .groupBy(
      workspace.id,
      workspace.slug,
      workspace.name,
      workspace.createdAt,
      user.name,
      user.email,
      brandProfile.id,
      brandProfile.name,
      artistProfile.id,
      artistProfile.name,
    )
    .orderBy(
      desc(
        sql<number>`(select count(*) from request r where r.workspace_id = ${workspace.id})`,
      ),
      asc(workspace.name),
    )
    .limit(STUDIO_LIST_LIMIT);
}

/** Everything an operator needs before producing work for one customer. */
export type StudioCustomerDetail = {
  workspace: Workspace;
  owner: { name: string; email: string };
  brand: {
    id: string;
    name: string | null;
    industry: string | null;
    description: string | null;
    targetAudience: string | null;
    website: string | null;
  } | null;
  artist: {
    id: string;
    name: string | null;
    genre: string | null;
    bio: string | null;
    website: string | null;
  } | null;
  recentRequests: {
    id: string;
    title: string;
    category: string;
    status: string;
    contextType: "brand" | "artist";
    createdAt: Date;
  }[];
  activeProjects: {
    id: string;
    name: string;
    status: string;
    contextType: "brand" | "artist";
    createdAt: Date;
  }[];
  productionHistory: {
    id: string;
    title: string;
    status: string;
    productionType: string;
    createdAt: Date;
  }[];
  deliveredWork: {
    id: string;
    deliverableName: string;
    version: number;
    contextType: "brand" | "artist";
    createdAt: Date;
  }[];
};

/**
 * One customer in full. Null for anything that is not a workspace, which the
 * page turns into the same 404 as a missing route.
 *
 * Profile fields are the ones that genuinely change what gets produced — voice,
 * audience, genre, description — not the whole profile record. The Studio reads
 * what it needs to do the work.
 */
export async function getStudioCustomer(
  access: OperatorAccess,
  workspaceId: string,
): Promise<StudioCustomerDetail | null> {
  assertOperatorAccess(access);
  if (!isRealId(workspaceId)) return null;

  const db = getDb();

  const [row] = await db
    .select({
      workspace: workspace,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(workspace)
    .innerJoin(user, eq(user.id, workspace.userId))
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  if (!row) return null;

  const [brand] = await db
    .select({
      id: brandProfile.id,
      name: brandProfile.name,
      industry: brandProfile.industry,
      description: brandProfile.description,
      targetAudience: brandProfile.targetAudience,
      website: brandProfile.website,
    })
    .from(brandProfile)
    .where(eq(brandProfile.workspaceId, workspaceId))
    .limit(1);

  const [artist] = await db
    .select({
      id: artistProfile.id,
      name: artistProfile.name,
      genre: artistProfile.genre,
      bio: artistProfile.bio,
      website: artistProfile.website,
    })
    .from(artistProfile)
    .where(eq(artistProfile.workspaceId, workspaceId))
    .limit(1);

  const [recentRequests, activeProjects, productionHistory, deliveredWork] =
    await Promise.all([
      db
        .select({
          id: request.id,
          title: request.title,
          category: request.category,
          status: request.status,
          contextType: request.contextType,
          createdAt: request.createdAt,
        })
        .from(request)
        .where(eq(request.workspaceId, workspaceId))
        .orderBy(desc(request.createdAt), desc(request.id))
        .limit(10),
      db
        .select({
          id: project.id,
          name: project.name,
          status: project.status,
          contextType: project.contextType,
          createdAt: project.createdAt,
        })
        .from(project)
        .where(
          and(
            eq(project.workspaceId, workspaceId),
            inArray(project.status, [
              "requested",
              "in_production",
              "in_review",
              "changes_requested",
              "approved",
            ]),
          ),
        )
        .orderBy(desc(project.updatedAt), desc(project.id))
        .limit(10),
      db
        .select({
          id: productionJob.id,
          title: productionJob.title,
          status: productionJob.status,
          productionType: productionJob.productionType,
          createdAt: productionJob.createdAt,
        })
        .from(productionJob)
        .where(eq(productionJob.workspaceId, workspaceId))
        .orderBy(desc(productionJob.createdAt), desc(productionJob.id))
        .limit(10),
      db
        .select({
          id: delivery.id,
          deliverableName: deliverable.name,
          version: delivery.version,
          contextType: delivery.contextType,
          createdAt: delivery.createdAt,
        })
        .from(delivery)
        .innerJoin(deliverable, eq(deliverable.id, delivery.deliverableId))
        .where(eq(delivery.workspaceId, workspaceId))
        .orderBy(desc(delivery.createdAt), desc(delivery.id))
        .limit(10),
    ]);

  return {
    workspace: row.workspace,
    owner: { name: row.ownerName, email: row.ownerEmail },
    brand: brand ?? null,
    artist: artist ?? null,
    recentRequests,
    activeProjects,
    productionHistory,
    deliveredWork,
  };
}
