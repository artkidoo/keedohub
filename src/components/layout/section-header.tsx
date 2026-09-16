import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "start" | "center";
  className?: string;
  id?: string;
};

/**
 * Section header: eyebrow + section title + supporting copy.
 * Used inside page sections to keep hierarchy identical everywhere.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "start",
  className,
  id,
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        centered && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-eyebrow text-primary">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="max-w-prose text-section text-balance">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-prose text-pretty text-base text-muted-foreground",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
