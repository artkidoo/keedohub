import { Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  /** Hide the name to render the mark only (compact contexts). */
  markOnly?: boolean;
};

/**
 * KeedoHub lockup: the mark plus the name. The mark uses `--kh-primary`, so
 * the official red flows through automatically once its value is finalised.
 */
function Wordmark({ className, markOnly = false }: WordmarkProps) {
  return (
    <span data-slot="wordmark" className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-4"
      >
        <Sparkles />
      </span>
      {markOnly ? null : (
        <span className="text-[0.95rem] font-semibold tracking-tight">
          KeedoHub
        </span>
      )}
    </span>
  );
}

/** Wordmark as a link home, with a focus ring for keyboard users. */
function WordmarkLink({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
        className,
      )}
    >
      <Wordmark />
    </Link>
  );
}

export { Wordmark, WordmarkLink };
