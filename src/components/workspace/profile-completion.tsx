import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { navIcon } from "@/lib/navigation";
import type { ProfileGroup } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  groups: ProfileGroup[];
  actionLabel: string;
  actionHref: string;
};

export function ProfileCompletion({ title, description, groups, actionLabel, actionHref }: Props) {
  return (
    <div data-slot="profile-completion" className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
      <div className="flex flex-col gap-4 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-eyebrow text-primary">Profile</p>
          <h2 className="text-heading font-semibold text-balance">{title}</h2>
          <p className="max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>
        </div>
        <Link href={actionHref} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto lg:shrink-0")}>
          {actionLabel}
        </Link>
      </div>
      <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, index) => {
          const Icon = navIcon(group.icon);
          return (
            <li key={group.id} className="flex flex-col gap-2 bg-surface-elevated p-5">
              <span className="flex items-center gap-2.5">
                <Icon aria-hidden className="size-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{group.title}</span>
              </span>
              <span className="text-meta text-muted-foreground">{group.description}</span>
              <span className="mt-1">
                <Badge variant="neutral">Step {index + 1} of {groups.length}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
