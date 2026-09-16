import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button variants and sizes.
 *
 * Sizes are touch-first: interactive controls are at least 44px tall on small
 * screens and tighten to 36–40px from `md` upward (spec §2, §11).
 * Colours come exclusively from the `--kh-*` semantic tokens.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted-foreground/15",
        outline:
          "border-border bg-surface-elevated text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        soft: "bg-primary-soft text-accent-foreground hover:bg-primary/14",
        destructive: "bg-danger/10 text-danger hover:bg-danger/16",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-[0.8125rem] md:h-8",
        default: "h-11 px-4 md:h-10",
        lg: "h-12 px-5 text-[0.9375rem] md:h-11",
        icon: "size-11 md:size-10",
        "icon-sm": "size-9 rounded-md md:size-8",
        "icon-lg": "size-12 md:size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
