/**
 * Customer-facing presentation for project screens (Checkpoint 2.4).
 *
 * Status VOCABULARY and labels live in `@/domains/production/status`; this
 * module holds the presentation extras the "My Projects" screens need:
 * badge variants, date formatting, and the honest timeline builder.
 * Nothing here may expose internal production vocabulary (spec §24) —
 * only customer project statuses (§9.3) reach these surfaces.
 * Pure functions with no database access.
 */

import type { ComponentProps } from "react";

import type { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/db/schema";
import { projectStatusLabels } from "@/domains/production/status";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

/**
 * One badge variant per customer-facing project status. Warning is reserved
 * for the one status that needs the customer; delivered/approved read as
 * completion; everything else stays neutral so the page never feels busy.
 */
export const projectStatusBadgeVariants: Record<ProjectStatus, BadgeVariant> = {
  requested: "brand",
  in_production: "neutral",
  in_review: "warning",
  changes_requested: "neutral",
  approved: "success",
  delivered: "success",
};

/** Fixed locale and style so every customer sees the same date format. */
const projectDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Format a project timestamp for display, e.g. "22 Sep 2026". */
export function formatProjectDate(date: Date): string {
  return projectDateFormat.format(date);
}

/** One dated event of the project's customer-visible timeline. */
export type ProjectTimelineEvent = {
  /** `null` for the current, undated standing. */
  date: Date | null;
  label: string;
};

/**
 * Numeric time value for ordering. Accepts a Date (the expected shape) and
 * tolerates the string a driver can hand back for computed timestamps, so a
 * formatting quirk can never turn a customer page into a 500.
 */
function timeValue(date: Date | string): number {
  return (date instanceof Date ? date : new Date(date)).getTime();
}

/**
 * Build the customer timeline from timestamps that actually exist in the
 * database (spec: "Only show timeline information that actually exists").
 * The originating request is optional (projects may exist without one);
 * the delivery event appears only when a delivery row exists. The final
 * undated entry is the current status — derived, never invented.
 */
export function projectTimeline(entry: {
  createdAt: Date;
  status: ProjectStatus;
  deliveredAt: Date | null;
  request: { createdAt: Date } | null;
}): ProjectTimelineEvent[] {
  const events: { date: Date; label: string }[] = [];

  if (entry.request) {
    events.push({ date: entry.request.createdAt, label: "Request received" });
  }
  events.push({ date: entry.createdAt, label: "Project created" });
  if (entry.deliveredAt) {
    events.push({ date: entry.deliveredAt, label: "Delivered to you" });
  }

  events.sort((a, b) => timeValue(a.date) - timeValue(b.date));

  return [
    ...events,
    { date: null, label: `Right now: ${projectStatusLabels[entry.status]}` },
  ];
}