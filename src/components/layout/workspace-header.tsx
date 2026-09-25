import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Wordmark } from "@/components/layout/wordmark";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutMenuItem } from "@/domains/auth/sign-out-menu-item";
import { navIcon, workspaceContexts, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type WorkspaceHeaderProps = {
  /** Nav items of the current context, used by the mobile panel. */
  items?: NavItem[];
  /** Customer-facing context label, e.g. "Brand". */
  contextLabel?: string;
  /** Short page name. The page itself carries the full heading. */
  title?: string;
  /** Where the wordmark leads — the current context home. */
  homeHref?: string;
  /** Slot for notifications and account controls once authentication exists. */
  actions?: ReactNode;
  /** Real unread notification count for the current context. */
  unreadNotifications?: number;
  className?: string;
};

/**
 * Workspace header: identity, current context and page, mobile navigation and a
 * compact menu. It deliberately contains no account or notification controls
 * yet — those depend on authentication and arrive with it, rather than as
 * inactive placeholder buttons.
 */
function WorkspaceHeader({
  items = [],
  contextLabel,
  title,
  homeHref = "/workspace",
  actions,
  unreadNotifications,
  className,
}: WorkspaceHeaderProps) {
  const navLabel = contextLabel
    ? `${contextLabel} navigation`
    : "Workspace navigation";

  return (
    <header
      data-slot="workspace-header"
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6",
        className,
      )}
    >
      {items.length > 0 ? (
        <MobileNav
          items={items}
          title={contextLabel ? `${contextLabel} workspace` : "KeedoHub"}
          navLabel={navLabel}
          unreadNotifications={unreadNotifications}
        />
      ) : null}

      <Link
        href={homeHref}
        className="mr-1 inline-flex items-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 lg:hidden"
      >
        <Wordmark />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {contextLabel ? (
          <span className="hidden text-meta font-medium tracking-[0.08em] text-muted-foreground uppercase sm:inline">
            {contextLabel}
          </span>
        ) : null}
        {title && contextLabel ? (
          <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">
            /
          </span>
        ) : null}
        {title ? (
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {title}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        {actions}
        <WorkspaceMenu />
      </div>
    </header>
  );
}

/** Compact menu of real destinations. Grows into the account menu later. */
function WorkspaceMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Workspace menu"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-11 md:size-10",
        )}
      >
        <ChevronDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          {workspaceContexts.map((context) => {
            const Icon = navIcon(context.icon);
            return (
              <DropdownMenuLinkItem key={context.id} href={context.href}>
                <Icon aria-hidden />
                {context.label}
              </DropdownMenuLinkItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem href="/">
          <ArrowUpRight aria-hidden />
          KeedoHub home
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceHeader };