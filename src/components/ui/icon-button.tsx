import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonSize = "sm" | "md" | "lg";

const sizeClass: Record<IconButtonSize, string> = {
  sm: "size-9 rounded-md md:size-8",
  md: "size-11 md:size-10",
  lg: "size-12 md:size-11",
};

type IconButtonProps = Omit<ComponentProps<typeof Button>, "size" | "children"> & {
  /**
   * Icon-only controls have no accessible name without a label. This prop is
   * required by the type system, not optional by convention.
   */
  "aria-label": string;
  /** A single icon. Decorative icons should be marked `aria-hidden`. */
  children: ReactNode;
  size?: IconButtonSize;
};

/**
 * Square, icon-only button. Always at least 44px on touch screens (spec §2).
 */
function IconButton({
  className,
  size = "md",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      variant={variant}
      size="icon"
      className={cn(sizeClass[size], className)}
      {...props}
    />
  );
}

export { IconButton };
