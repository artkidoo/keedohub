import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Page container. Owns the horizontal rhythm of the whole product: the same
 * gutters are used by the landing page and the application shell.
 *
 * Mobile-first: 20px gutters on phones, widening with the viewport.
 */
const containerVariants = cva("mx-auto w-full px-5 sm:px-7 lg:px-10", {
  variants: {
    width: {
      /** Full editorial width — default for pages. */
      page: "max-w-page",
      /** Narrow reading column — long-form content and forms. */
      content: "max-w-content",
      /** Unconstrained — used inside already-sized regions. */
      full: "max-w-none",
    },
  },
  defaultVariants: {
    width: "page",
  },
});

function Container({
  className,
  width,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof containerVariants>) {
  return (
    <div
      data-slot="container"
      className={cn(containerVariants({ width }), className)}
      {...props}
    />
  );
}

export { Container, containerVariants };
