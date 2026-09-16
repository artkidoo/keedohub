import Link from "next/link";

import { navIcon } from "@/lib/navigation";
import type { QuickAction } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export function QuickActions({ actions, label }: { actions: QuickAction[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = navIcon(action.icon);
          return (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn(
                  "group flex min-h-[76px] items-center gap-4 rounded-2xl border border-border bg-surface-elevated px-4 py-4",
                  "transition-colors hover:border-primary/40 hover:bg-primary-soft/40",
                  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-foreground">{action.title}</span>
                  <span className="line-clamp-2 text-meta text-muted-foreground">{action.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
