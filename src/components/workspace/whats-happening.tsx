import { ArrowRight } from "lucide-react";
import { createElement } from "react";

import { Badge } from "@/components/ui/badge";
import type { NavIconName } from "@/lib/navigation";
import { navIcon } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  copy: string;
  icon: NavIconName;
  stateLabel: string;
  stateCopy: string;
  className?: string;
};

/** Renders a Lucide icon by nav name without a render-time component binding. */
function IconByName({ name }: { name: NavIconName }) {
  return createElement(navIcon(name), { "aria-hidden": true, className: "size-5" });
}

export function WhatsHappening({ title, copy, icon, stateLabel, stateCopy, className }: Props) {
  return (
    <div data-slot="whats-happening" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
          <IconByName name={icon} />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-heading font-semibold">{title}</h3>
          <p className="truncate text-meta text-muted-foreground">{copy}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <Badge variant="neutral">{stateLabel}</Badge>
          <span className="truncate text-sm text-muted-foreground">{stateCopy}</span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
