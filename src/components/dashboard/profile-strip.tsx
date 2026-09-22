import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { ProfileStatus } from "@/domains/dashboard/profile-status";
import { cn } from "@/lib/utils";

/**
 * Dashboard profile status strip (Phase 2.2).
 *
 * Real profile information from Phase 2.1: who the profile belongs to,
 * how complete it is, and the one action that moves it forward. When the
 * profile is complete the strip quietly confirms it instead of nagging.
 */
export function ProfileStatusStrip({
  contextLabel,
  profileHref,
  profileActionLabel,
  status,
}: {
  contextLabel: string;
  profileHref: string;
  profileActionLabel: string;
  status: ProfileStatus;
}) {
  const percent =
    status.total > 0 ? Math.round((status.filled / status.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-eyebrow text-primary">
          Your {contextLabel} profile
        </p>
        <p className="text-heading font-semibold text-balance">
          {status.displayName ?? `Your ${contextLabel.toLowerCase()} profile`}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {status.summary}
        </p>
        <div
          className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <Link
        href={profileHref}
        className={cn(
          buttonVariants({ variant: status.isComplete ? "outline" : "primary" }),
          "w-full sm:w-auto sm:shrink-0",
        )}
      >
        {status.isComplete ? "View profile" : profileActionLabel}
      </Link>
    </div>
  );
}
