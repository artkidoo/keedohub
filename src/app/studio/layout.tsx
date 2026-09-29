import type { ReactNode } from "react";

import { StudioShell } from "@/components/layout/studio-shell";
import { requireOperator } from "@/domains/production/access";
import { studioNav } from "@/lib/navigation";

type StudioLayoutProps = {
  children: ReactNode;
};

/**
 * The private KeedoHub Studio (Phase 4.1).
 *
 * This layout is the route-level authorisation layer (spec §19.1, §2):
 * `requireOperator` resolves the session and requires a LIVE operator record, so
 * a customer — signed in or not — is answered without ever seeing a Studio
 * screen. Nothing under this layout renders before that check, every page and
 * every action beneath it re-authorises independently, and no value from a URL,
 * query string, header or hidden field participates in the decision.
 *
 * The rail lists the Studio sections that exist; each one is a real route.
 */
export default async function StudioLayout({ children }: StudioLayoutProps) {
  await requireOperator();

  return <StudioShell items={studioNav}>{children}</StudioShell>;
}
