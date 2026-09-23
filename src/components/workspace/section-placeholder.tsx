import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * Placeholder shown by workspace sections that exist in navigation but have
 * no real surface yet (Checkpoint 2.6 keeps Brand's "My Assets" read-only
 * placeholder exactly as the dynamic `[section]` route rendered it — the
 * Customer Library arrives in a later checkpoint).
 *
 * The shown copy is shared so every placeholder destination stays identical.
 */

export const SECTION_PLACEHOLDER = {
  title: "This area is being built",
  description:
    "The shell, navigation and design system are in place. This space will hold real work as the workspace is completed — nothing is faked here in the meantime.",
} as const;

type SectionPlaceholderIcon = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

export function SectionPlaceholder({
  icon: Icon,
  backHref,
}: {
  icon: SectionPlaceholderIcon;
  backHref: string;
}) {
  return (
    <EmptyState
      icon={Icon}
      title={SECTION_PLACEHOLDER.title}
      description={SECTION_PLACEHOLDER.description}
      action={
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft aria-hidden />
          Back to dashboard
        </Link>
      }
    />
  );
}
