/**
 * Studio settings (Phase 4.1, spec §17).
 *
 * Settings is the smallest screen in the Studio, and deliberately so. Almost
 * everything a customer might call a "setting" — brand details, artist details,
 * their own profile — belongs to the customer and is edited on the customer's own
 * screens; the Studio sees the result read-only.
 *
 * What belongs here is only what the Studio itself needs to know about itself:
 * who is signed in, which operator record that is, and how the platform is
 * configured. Nothing here can change a customer's data, and nothing here stores
 * a secret: the operator identity is read from the verified session and the
 * platform facts are read from configuration, never copied into the database.
 */

import { and, count, eq } from "drizzle-orm";

import type { OperatorAccess } from "@/domains/production/access";
import { canAdministerOperators } from "@/domains/production/access";
import { assertOperatorAccess } from "@/domains/production/errors";
import { getDb } from "@/lib/db";
import { operator, user, workspace } from "@/lib/db/schema";

/** The operator record behind the current session, or null if it is gone. */
export type StudioOperator = {
  id: string;
  userId: string;
  displayName: string | null;
  role: string;
  email: string;
  name: string;
};

/**
 * The signed-in operator.
 *
 * Read from the operator row keyed by the session's operator id. An operator row
 * that no longer exists returns null rather than a placeholder, so the screen can
 * say so honestly.
 */
export async function getStudioOperator(
  access: OperatorAccess,
): Promise<StudioOperator | null> {
  assertOperatorAccess(access);

  const [row] = await getDb()
    .select({
      id: operator.id,
      userId: operator.userId,
      displayName: operator.displayName,
      role: operator.role,
      email: user.email,
      name: user.name,
    })
    .from(operator)
    .innerJoin(user, eq(user.id, operator.userId))
    .where(and(eq(operator.id, access.operatorId), eq(operator.active, true)))
    .limit(1);

  return row ?? null;
}

/** One operator on the roster (owner-only administration view). */
export type StudioRosterEntry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  displayName: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
};

/**
 * The whole operator roster, including revoked records.
 *
 * Restricted to an `owner`: an `operator` can see production work but not the
 * list of people who can be given access to it (spec §19.3). Returns an empty
 * list for a non-owner rather than throwing, so the caller renders one honest
 * empty state instead of an error page.
 */
export async function listOperatorRoster(
  access: OperatorAccess,
): Promise<StudioRosterEntry[]> {
  assertOperatorAccess(access);
  if (!canAdministerOperators(access)) return [];

  return getDb()
    .select({
      id: operator.id,
      userId: operator.userId,
      name: user.name,
      email: user.email,
      displayName: operator.displayName,
      role: operator.role,
      active: operator.active,
      createdAt: operator.createdAt,
    })
    .from(operator)
    .innerJoin(user, eq(user.id, operator.userId))
    .orderBy(operator.createdAt);
}

/** Platform facts the Studio reports about itself. All read from real rows. */
export type StudioPlatformSummary = {
  workspaces: number;
  operators: number;
};

/**
 * How many customer workspaces exist and how many operators are active.
 *
 * Only facts the schema can actually answer: a workspace has no "active" flag,
 * so there is no active-workspace number invented here.
 */
export async function getStudioPlatformSummary(
  access: OperatorAccess,
): Promise<StudioPlatformSummary> {
  assertOperatorAccess(access);

  const [workspaces] = await getDb()
    .select({ value: count() })
    .from(workspace);

  const [operators] = await getDb()
    .select({ value: count() })
    .from(operator)
    .where(eq(operator.active, true));

  return {
    workspaces: workspaces?.value ?? 0,
    operators: operators?.value ?? 0,
  };
}
