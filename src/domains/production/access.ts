/**
 * Internal production authorization boundary (Phase 3.0).
 *
 * Everything in the private production workflow — the queue, jobs, internal
 * assignments, versions — must pass through here first. The rule is the same
 * one the customer side uses (spec §19, §20.2), pointed the other way:
 * authorisation comes from the authenticated session plus a server-side
 * record, never from a URL segment, a query parameter, a submitted id, a
 * header or client state.
 *
 * `resolveOperator` is the whole decision: a user either has a live operator
 * record or has nothing. Customers keep their own workspace access and gain
 * nothing from this table, because it is keyed by their own account.
 */

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireUser } from "@/domains/auth/session";
import { getDb } from "@/lib/db";
import { operator } from "@/lib/db/schema";
import type { OperatorRole } from "@/lib/db/schema";

/** Proof that the caller is internal KeedoHub staff. */
export type OperatorAccess = {
  /** The authenticated account acting. Used for attribution (spec §19.4). */
  userId: string;
  /** The operator record that grants production access. */
  operatorId: string;
  /** `operator` reaches production data; `owner` also administers access. */
  role: OperatorRole;
  /** Human label for internal surfaces. Never rendered to a customer. */
  displayName: string | null;
};

/**
 * The operator record for an account, or null.
 *
 * A revoked operator (`active = false`) resolves to null, so revoking access
 * takes effect on the next request rather than requiring a data deletion.
 */
export async function resolveOperator(
  userId: string,
): Promise<OperatorAccess | null> {
  const [row] = await getDb()
    .select({
      id: operator.id,
      role: operator.role,
      displayName: operator.displayName,
    })
    .from(operator)
    .where(and(eq(operator.userId, userId), eq(operator.active, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    userId,
    operatorId: row.id,
    role: row.role,
    displayName: row.displayName ?? null,
  };
}

/**
 * Require authenticated internal access.
 *
 * Fails closed and indistinguishably: a customer who guesses a production URL
 * gets the same 404 as a URL that does not exist, so route existence is not
 * discoverable (spec §19.5).
 */
export async function requireOperator(): Promise<OperatorAccess> {
  const user = await requireUser();
  const access = await resolveOperator(user.id);

  if (!access) {
    notFound();
  }

  return access;
}

/** Whether this operator may administer operator access itself. */
export function canAdministerOperators(access: OperatorAccess): boolean {
  return access.role === "owner";
}

/**
 * Require an operator who may administer access (spec §19.3). Used by future
 * Studio settings surfaces; there is no UI in this checkpoint.
 */
export async function requireOperatorOwner(): Promise<OperatorAccess> {
  const access = await requireOperator();

  if (!canAdministerOperators(access)) {
    notFound();
  }

  return access;
}
