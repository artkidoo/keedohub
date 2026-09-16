import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Vertical rhythm for page sections. Uses one spacing scale so pages cannot
 * drift into arbitrary padding values.
 *
 * Mobile-first: comfortable but never wasteful on small screens.
 */
const sectionVariants = cva("relative", {
  variants: {
    spacing: {
      none: "",
      sm: "py-10 sm:py-14",
      default: "py-14 sm:py-20 lg:py-24",
      lg: "py-20 sm:py-24 lg:py-32",
    },
    tone: {
      default: "",
      surface: "bg-surface",
      inset: "bg-surface/50",
    },
    divided: {
      true: "border-t border-border",
      false: "",
    },
  },
  defaultVariants: {
    spacing: "default",
    tone: "default",
    divided: false,
  },
});

function Section({
  className,
  spacing,
  tone,
  divided,
  ...props
}: ComponentProps<"section"> & VariantProps<typeof sectionVariants>) {
  return (
    <section
      data-slot="section"
      className={cn(sectionVariants({ spacing, tone, divided }), className)}
      {...props}
    />
  );
}

export { Section, sectionVariants };
