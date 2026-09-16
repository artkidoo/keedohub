import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateIcon = ComponentType<{ "aria-hidden"?: boolean; className?: string }>;

type EmptyStateProps = {
  /** A Lucide component rendered decoratively, e.g. `icon={Images}`. */
  icon?: EmptyStateIcon;
  title: string;
  description?: ReactNode;
  /** The action that fills this space (a Button or a link to a real route). */
  action?: ReactNode;
  className?: string;
};

/**
 * Empty state. Every list and section in KeedoHub must explain what will
 * appear here and offer the action that fills it (spec §23.2).
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-5 rounded-2xl border border-dashed border-border bg-surface/60 p-6 sm:p-10",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-elevated text-primary [&_svg]:size-5">
          <Icon aria-hidden />
        </span>
      ) : null}
      <div className="flex max-w-content flex-col gap-2">
        <h2 className="text-heading font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
