import type { NavIconName, WorkspaceContext } from "@/lib/navigation";

/**
 * Dashboard quick requests (Phase 2.2).
 *
 * Customer-friendly actions in customer language. Each links to the Requests
 * list for its context — the dashboard signposts the Request experience; the
 * requesting itself lives on the per-context requests routes (Checkpoint 2.3).
 */

export type DashboardQuickRequest = {
  id: string;
  title: string;
  description: string;
  /** Route of the Request experience for this context. */
  href: string;
  icon: NavIconName;
};

function requestsHref(context: WorkspaceContext): string {
  return `/workspace/${context}/requests`;
}

const brandQuickRequests: DashboardQuickRequest[] = [
  {
    id: "creative-work",
    title: "Request creative work",
    description: "Tell us what you need made.",
    href: requestsHref("brand"),
    icon: "send",
  },
  {
    id: "document",
    title: "Request a document",
    description: "Profiles, proposals and decks.",
    href: requestsHref("brand"),
    icon: "file-text",
  },
  {
    id: "marketing",
    title: "Request marketing material",
    description: "Social, launch and promo pieces.",
    href: requestsHref("brand"),
    icon: "megaphone",
  },
  {
    id: "support",
    title: "Request brand support",
    description: "Help with your brand identity.",
    href: requestsHref("brand"),
    icon: "sparkles",
  },
];

const artistQuickRequests: DashboardQuickRequest[] = [
  {
    id: "release-assets",
    title: "Request release assets",
    description: "Cover artwork and release visuals.",
    href: requestsHref("artist"),
    icon: "disc",
  },
  {
    id: "content",
    title: "Request content",
    description: "Visuals for your music and story.",
    href: requestsHref("artist"),
    icon: "send",
  },
  {
    id: "promo",
    title: "Request promotional material",
    description: "Social, launch and promo pieces.",
    href: requestsHref("artist"),
    icon: "megaphone",
  },
  {
    id: "support",
    title: "Request creative support",
    description: "Help with your artist identity.",
    href: requestsHref("artist"),
    icon: "user",
  },
];

/** Quick requests for the rendered context. */
export function quickRequestsFor(
  context: WorkspaceContext,
): DashboardQuickRequest[] {
  return context === "brand" ? brandQuickRequests : artistQuickRequests;
}

/** Dashboard section anchor for the requests routes. */
export function requestsHrefFor(context: WorkspaceContext): string {
  return requestsHref(context);
}
