import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { navIcon } from "@/lib/navigation";
import type { ProfileGroup } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Props = {
  contextLabel: string;
  profileHref: string;
  groups: ProfileGroup[];
};

export function ProfileFoundation({ contextLabel, profileHref, groups }: Props) {
  return (
    <div data-slot="profile-foundation" className="flex flex-col gap-5">
      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => {
          const Icon = navIcon(group.icon);
          return (
            <li key={group.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <span className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <span className="text-sm font-semibold">{group.title}</span>
              </span>
              <span className="text-meta leading-relaxed text-muted-foreground">{group.description}</span>
              <ul className="flex flex-wrap gap-1.5" aria-label={`${group.title} fields`}>
                {group.fields.map((field) => (
                  <li key={field}>
                    <Badge variant="neutral">{field}</Badge>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          These sections become your {contextLabel} identity. Nothing is saved yet.
        </p>
        <Link href={profileHref} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          Open {contextLabel} profile
        </Link>
      </div>
    </div>
  );
}
