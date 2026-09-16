import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title: string;
  description?: ReactNode;
  /** Typically a "Try again" action wired to `reset()` from a route error boundary. */
  action?: ReactNode;
  className?: string;
};

/**
 * Error state. Always human, never a stack trace, and never internal
 * vocabulary (spec §24.4).
 */
function ErrorState({
  title,
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-start gap-5 rounded-2xl border border-danger/25 bg-danger/5 p-6 sm:p-10",
        className,
      )}
    >
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

export { ErrorState };
