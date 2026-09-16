"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { ContextSwitcher } from "@/components/layout/context-switcher";
import { NavList } from "@/components/layout/nav-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetCloseButton,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  items: NavItem[];
  /** Shown as the panel heading, e.g. "Brand workspace". */
  title: string;
  /** Accessible name for the navigation region. */
  navLabel: string;
};

/**
 * Mobile navigation panel. Only the navigation affordance differs between
 * mobile and desktop — the items, labels, active states and ordering all come
 * from one configuration (spec §9).
 */
function MobileNav({ items, title, navLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-11 lg:hidden",
        )}
      >
        <Menu aria-hidden />
      </SheetTrigger>
      <SheetContent side="start" label={navLabel} className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="text-sm font-semibold tracking-tight">{title}</span>
          <SheetCloseButton label="Close navigation" />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <ContextSwitcher className="mb-6" />
          <NavList
            items={items}
            label={navLabel}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { MobileNav };