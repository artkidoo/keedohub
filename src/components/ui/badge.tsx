import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-eyebrow font-medium tracking-wide whitespace-nowrap uppercase [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface text-muted-foreground",
        brand: "border-transparent bg-primary-soft text-accent-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/18 text-warning-foreground",
        danger: "border-transparent bg-danger/12 text-danger",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

/**
 * Small status label. Badges are used sparingly — never as decoration and
 * never to explain something the interface should say in words (spec §23).
 */
function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
