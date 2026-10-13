import type { Workspace } from "@/lib/db/schema";
import { defaultWorkspaceContext, type WorkspaceContext } from "@/lib/navigation";

/**
 * Account type: what the customer chose at sign-up (spec §5 vocabulary).
 *
 * The choice is stored twice on purpose, and only one of the two stores
 * decides anything:
 *
 * - `user.account_type`      — Better Auth's sign-up intake field, written in
 *                              the same insert as the user row so a sign-up
 *                              without a type is refused at the endpoint.
 * - `workspace.account_type` — the single source of truth for authorization,
 *                              default routing and navigation. Every decision
 *                              reads it from the database server-side; nothing
 *                              supplied by a client participates.
 *
 * NULL means "no type on record": accounts that predate the field keep the
 * original dual-context behaviour (both contexts, defaulting to Brand) and
 * are never silently converted.
 */

export const accountTypes = ["brand", "artist"] as const;

export type AccountType = (typeof accountTypes)[number];

/** Narrow an unknown value (e.g. straight from the database) to a type. */
export function isAccountType(value: unknown): value is AccountType {
  return value === "brand" || value === "artist";
}

/**
 * The stored account type of a workspace, or null when none is on record.
 *
 * The workspace table carries a CHECK constraint on this column, so an
 * unrecognized value cannot exist; this function still fails safe: an
 * unrecognized value resolves to null (legacy behaviour) and never widens
 * access beyond what a typed account would get.
 */
export function accountTypeOf(
  workspace: Pick<Workspace, "accountType"> | null | undefined,
): AccountType | null {
  if (!workspace) return null;
  return isAccountType(workspace.accountType) ? workspace.accountType : null;
}

/**
 * Where an account lands at `/workspace` after sign-up and at every login.
 * Typed accounts enter their own workspace; untyped (legacy) accounts keep
 * the original default.
 */
export function defaultContextFor(accountType: AccountType | null): WorkspaceContext {
  return accountType ?? defaultWorkspaceContext;
}

/**
 * The workspace contexts an account may open, in navigation order.
 * A typed account sees exactly one; a legacy account sees both.
 */
export function workspaceContextsFor(accountType: AccountType | null): WorkspaceContext[] {
  return accountType ? [accountType] : ["brand", "artist"];
}

/**
 * Whether a request for `context` is allowed for `accountType`.
 * Used by the server-side authorization boundary — a URL alone grants
 * nothing, and an account that chose one context never reaches the other.
 */
export function contextAllowedForAccount(
  accountType: AccountType | null,
  context: WorkspaceContext,
): boolean {
  // A legacy (untyped) account may open either context; a typed account
  // only its own.
  return accountType === null || accountType === context;
}
