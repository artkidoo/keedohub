import type { ReactNode } from "react";

import { StudioShell } from "@/components/layout/studio-shell";
import { requireOperator } from "@/domains/production/access";
import { studioProductionNav } from "@/lib/navigation";

type StudioLayoutProps = {
  children: ReactNode;
};

/**
 * The internal production area (Phase 3.1).
 *
 * This layout is the route-level authorisation layer (spec §19.1):
 * `requireOperator` resolves the session and requires a LIVE operator record, so
 * a customer — signed in or not — is answered with a 404 for the entire area
 * rather than a 403 that would confirm it exists. Nothing is rendered before that
 * check, and every read and action beneath it re-authorises independently.
 *
 * Phase 3.1 ships only the production workspace, so the rail lists only that
 * section: navigation is not a promise about a screen that is not built yet.
 */
export default async function StudioLayout({ children }: StudioLayoutProps) {
  await requireOperator();

  return <StudioShell items={studioProductionNav}>{children}</StudioShell>;
}
