"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIcon, workspaceContexts, type WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ContextSwitcherProps = {
  className?: string;
  /**
   * The contexts this customer may open. A single-context account (the
   * normal case since account types at sign-up) has nothing to switch
   * between, so the switcher renders nothing; legacy accounts with no type
   * on record see both, exactly as before.
   */
  contexts?: readonly WorkspaceContext[];
};

/**
 * Switches between the Brand and Artist experiences of the one unified
 * workspace. It is navigation (links), not tabs — each context has its own
 * routes and the current context is reflected in the URL.
 */
function ContextSwitcher({ className, contexts }: ContextSwitcherProps) {
  const pathname = usePathname();

  const items = contexts
    ? workspaceContexts.filter((entry) => contexts.includes(entry.id))
    : workspaceContexts;

  // A switcher of one is not a switcher. Hiding here (rather than only in
  // each caller) keeps every surface — sidebar, mobile panel — consistent.
  if (items.length < 2) return null;

  return (
    <nav
      data-slot="context-switcher"
      aria-label="Workspace context"
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border bg-surface p-1",
        className,
      )}
    >
      {items.map((context) => {
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