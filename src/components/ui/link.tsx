import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const textLinkVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm font-medium underline-offset-4 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
  {
    variants: {
      variant: {
        brand: "text-primary hover:text-primary-hover hover:underline",
        default: "text-foreground hover:text-primary",
        muted: "text-muted-foreground hover:text-foreground",
      },
      size: {
        sm: "text-meta",
        default: "text-sm",
        lg: "text-base",
      },
      underline: {
        true: "underline",
        false: "",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "default",
      underline: false,
    },
  },
);

type TextLinkProps = {
  children: ReactNode;
  /** Renders a plain anchor with safe `rel` attributes. */
  external?: boolean;
} & Omit<ComponentProps<typeof Link>, "children"> &
  VariantProps<typeof textLinkVariants>;

/**
 * Text link. Use for inline and secondary navigation; use `Button` for actions.
 * Links are never rendered through Base UI's Button component — links keep
 * their own semantics (see the bundled Base UI Button documentation).
 */
function TextLink({
  className,
  variant,
  size,
  underline,
  external,
  children,
  ...props
}: TextLinkProps) {
  const classes = cn(textLinkVariants({ variant, size, underline }), className);

  if (external) {
    const { href, ...rest } = props;
    return (
      <a
        data-slot="text-link"
        className={classes}
        href={typeof href === "string" ? href : undefined}
        target="_blank"
        rel="noreferrer noopener"
        {...(rest as ComponentProps<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link data-slot="text-link" className={classes} {...props}>
      {children}
    </Link>
  );
}

export { TextLink, textLinkVariants };
