/**
 * Request presentation helpers, shared by the list and detail screens.
 *
 * The status vocabulary and customer labels live in
 * `@/domains/production/status` (spec §24); this module only maps those
 * labels onto Badge variants and formats dates the way the request screens
 * show them. Everything here is pure — safe to use from server components.
 */

import type { ComponentProps } from "react";

import type { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/db/schema";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

/** One badge variant per customer-facing request status (spec §8.3). */
export const requestStatusBadgeVariants: Record<RequestStatus, BadgeVariant> = {
  submitted: "brand",
  in_validation: "neutral",
  changes_needed: "warning",
  accepted: "success",
  declined: "danger",
};

/** Fixed locale and style so every customer sees the same date format. */
const requestDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Format a request timestamp for display, e.g. "22 Sep 2026". */
export function formatRequestDate(date: Date): string {
  return requestDateFormat.format(date);
}
