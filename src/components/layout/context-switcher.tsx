"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIcon, workspaceContexts } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ContextSwitcherProps = {
  className?: string;
};

/**
 * Switches between the Brand and Artist experiences of the one unified
 * workspace. It is navigation (links), not tabs — each context has its own
 * routes and the current context is reflected in the URL.
 */
function ContextSwitcher({ className }: ContextSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav
      data-slot="context-switcher"
      aria-label="Workspace context"
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border bg-surface p-1",
        className,
      )}
    >
      {workspaceContexts.map((context) => {
        const active =
          pathname === context.href ||
          pathname.startsWith(`${context.href}/`);
        const Icon = navIcon(context.icon);

        return (
          <Link
            key={context.id}
            href={context.href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-meta font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 md:min-h-9 md:flex-none",
              active
                ? "bg-surface-elevated text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden
              className={cn("size-4 shrink-0", active && "text-primary")}
            />
            {context.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { ContextSwitcher };