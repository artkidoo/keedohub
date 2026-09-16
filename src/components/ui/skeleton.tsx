import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Skeletons mirror the shape of the content that is
 * loading so the layout never jumps (spec §23.2).
 */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
