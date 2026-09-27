/**
 * Production failure vocabulary (Phase 3.1).
 *
 * Two different principals write to the production chain — an operator moves a
 * job, a customer decides on a review — and both refuse work for the same
 * reasons. The vocabulary therefore lives in its own module, so neither side has
 * to import the other and a refusal reads identically wherever it happens.
 *
 * Codes are internal. A customer surface never shows one of these: the customer
 * review path translates a refusal into an honest, plain sentence.
 */

import { isValidUUIDv4 } from "@/lib/validation/id";

export class ProductionError extends Error {
  constructor(
    message: string,
    readonly code:
      /** The record does not exist, or not for this caller. */
      | "not_found"
      /** The lifecycle state machine does not allow this move. */
      | "invalid_transition"
      /** A bounded value (priority) was out of range. */
      | "invalid_priority"
      /** An assignment named a non-existent or revoked operator. */
      | "invalid_operator"
      /** Submitted input failed validation before any write. */
      | "invalid_input"
      /** The version or deliverable is not in a state that can be reviewed. */
      | "not_reviewable"
      /** The internal QA gate is not satisfied, so work is not ready. */
      | "not_ready"
      /** Delivery preconditions are not met (Phase 3.2). */
      | "not_deliverable"
      /** The write would contradict existing state (duplicate, stale, …). */
      | "conflict",
  ) {
    super(message);
    this.name = "ProductionError";
  }
}

/**
 * A production write needs proof that the caller is internal staff.
 *
 * Every internal write calls this first. It is deliberately blunt: an operator
 * access object that is missing its ids is a programming error, and failing
 * loudly beats quietly writing production records for nobody.
 */
export function assertOperatorAccess(
  access: { operatorId?: string; userId?: string } | null | undefined,
): void {
  if (!access?.operatorId || !access?.userId) {
    throw new Error("Production writes require a verified operator");
  }
}

/**
 * A malformed identifier is a missing record — never a database error.
 *
 * Identifiers reach this layer from URLs, form fields and filenames, and the
 * columns they select are UUIDs. Without this guard a forged value produces a
 * database type error, which is both a 500 where the honest answer is 404 and a
 * small leak of the storage model. Refusing here keeps every production read
 * and write failing closed (spec §19.4 rule 4).
 */
export function isRealId(value: unknown): value is string {
  return isValidUUIDv4(value);
}

/** Refuse a malformed id in a write path. */
export function refuseMalformedId(value: unknown, what: string): void {
  if (!isRealId(value)) {
    throw new ProductionError(`${what} not found`, "not_found");
  }
}