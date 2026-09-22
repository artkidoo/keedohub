import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Dashboard section shell (Phase 2.2).
 *
 * Editorial rhythm, not SaaS boxes: an eyebrow + heading + supporting copy,
 * then the section body flush beneath. A hairline divider separates sections
 * so the page stays spacious without "excessive cards".
 */
export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  labelledBy,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional link action rendered beside the heading on larger screens. */
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn("flex flex-col gap-4 sm:gap-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-eyebrow text-primary">{eyebrow}</p>
          <h2 id={labelledBy} className="text-section text-balance">
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Icon type accepted by section empty states (a Lucide component). */
export type SectionIcon = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

/**
 * Honest section empty state: what will appear here, and the action that
 * fills the space. Never a fake metric, never invented content.
 */
export function DashboardSectionEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: SectionIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-5 sm:p-6">
      <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-primary">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex max-w-prose flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Flush editorial list for dashboard rows with hairline dividers. */
export function DashboardList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {children}
    </ul>
  );
}
