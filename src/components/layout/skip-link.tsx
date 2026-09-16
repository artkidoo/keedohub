import { cn } from "@/lib/utils";

/**
 * Keyboard escape hatch: visually hidden until focused, then jumps straight
 * to the main content region. Rendered once in the root layout.
 */
export function SkipLink({
  href = "#main-content",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only z-50 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground",
        "focus:not-sr-only focus:fixed focus:left-4 focus:top-4",
        className,
      )}
    >
      Skip to content
    </a>
  );
}
