import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Breadcrumb } from "@/components/ui/breadcrumb";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
};

/**
 * Consistent page header: optional breadcrumb + eyebrow above a bold display
 * title with supporting copy. Mobile-first — actions stack beneath the title
 * and only sit inline on larger viewports.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <Breadcrumb items={breadcrumb} />
      ) : null}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          {eyebrow ? (
            <p className="text-eyebrow text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-display text-balance">{title}</h1>
          {description ? (
            <p className="max-w-prose text-lead text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
