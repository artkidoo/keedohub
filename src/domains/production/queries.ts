import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  deliverable,
  delivery,
  project,
  request,
  review,
  type Deliverable,
  type Delivery,
  type Project,
  type Request,
  type Review,
} from "@/lib/db/schema";

/**
 * Ownership-scoped data access for the production domain.
 *
 * Every function takes a `workspaceId` that must come from
 * `requireWorkspace()` / `requireWorkspaceContext()` — i.e. from the
 * authenticated session, never from a URL, form field or client state
 * (spec §8, §19, §20). There is deliberately no "find by entity id alone"
 * helper here: any future single-entity read must filter by workspaceId as
 * well, e.g. `and(eq(table.id, id), eq(table.workspaceId, workspaceId))`.
 */

export async function listRequests(workspaceId: string): Promise<Request[]> {
  return getDb()
    .select()
    .from(request)
    .where(eq(request.workspaceId, workspaceId))
    .orderBy(desc(request.createdAt));
}

export async function listProjects(workspaceId: string): Promise<Project[]> {
  return getDb()
    .select()
    .from(project)
    .where(eq(project.workspaceId, workspaceId))
    .orderBy(desc(project.createdAt));
}

export async function listDeliverables(
  workspaceId: string,
): Promise<Deliverable[]> {
  return getDb()
    .select()
    .from(deliverable)
    .where(eq(deliverable.workspaceId, workspaceId))
    .orderBy(desc(deliverable.createdAt));
}

export async function listReviews(
  workspaceId: string,
  deliverableId: string,
): Promise<Review[]> {
  // Both filters are required: workspace from the session, deliverable from
  // the caller. A deliverable from another workspace yields an empty list.
  return getDb()
    .select()
    .from(review)
    .where(
      and(
        eq(review.workspaceId, workspaceId),
        eq(review.deliverableId, deliverableId),
      ),
    )
    .orderBy(desc(review.createdAt));
}

export async function listDeliveries(
  workspaceId: string,
): Promise<Delivery[]> {
  return getDb()
    .select()
    .from(delivery)
    .where(eq(delivery.workspaceId, workspaceId))
    .orderBy(desc(delivery.createdAt));
}
