import {
  Bell,
  CircleCheck,
  Disc3,
  FileText,
  FolderKanban,
  Images,
  Layers,
  LayoutDashboard,
  Megaphone,
  PackageCheck,
  Palette,
  Send,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Serializable icon reference. Navigation data crosses the server/client
 * boundary (server layouts hand items to client list components), so the icon
 * itself stays a plain string — components are resolved with `navIcon()` where
 * rendering happens.
 */
export type NavIconName =
  | "dashboard"
  | "sparkles"
  | "file-text"
  | "megaphone"
  | "images"
  | "folder"
  | "send"
  | "user"
  | "disc"
  | "check"
  | "package"
  | "palette"
  | "layers"
  | "users"
  | "bell"
  | "settings";

const navIcons = {
  dashboard: LayoutDashboard,
  sparkles: Sparkles,
  "file-text": FileText,
  megaphone: Megaphone,
  images: Images,
  folder: FolderKanban,
  send: Send,
  user: UserRound,
  disc: Disc3,
  check: CircleCheck,
  package: PackageCheck,
  palette: Palette,
  layers: Layers,
  users: Users,
  bell: Bell,
  settings: Settings,
} satisfies Record<NavIconName, LucideIcon>;

/** Resolve an icon name to its Lucide component where rendering happens. */
export function navIcon(name: NavIconName): LucideIcon {
  return navIcons[name];
}

/** The two experiences that live inside one KeedoHub workspace. */
export type WorkspaceContext = "brand" | "artist";

export type WorkspaceContextMeta = {
  id: WorkspaceContext;
  /** Customer-facing label. */
  label: string;
  /** One line, used in menus and context placeholders. */
  description: string;
  icon: NavIconName;
  /** Context home route. */
  href: string;
};

export type NavItem = {
  /** Customer-facing label — approved customer vocabulary only (spec §24). */
  label: string;
  /** Absolute route. */
  href: string;
  icon: NavIconName;
  /** One line, used in menus and section placeholders. */
  description: string;
};

export const WORKSPACE_ROOT = "/workspace";

/** Root of the private KeedoHub Studio (authorised route arrives in Phase 4). */
export const STUDIO_ROOT = "/studio";

export const workspaceContexts: readonly WorkspaceContextMeta[] = [
  {
    id: "brand",
    label: "Brand",
    description: "Creative work for a company or organisation.",
    icon: "sparkles",
    href: `${WORKSPACE_ROOT}/brand`,
  },
  {
    id: "artist",
    label: "Artist",
    description: "Creative work for an artist and their releases.",
    icon: "palette",
    href: `${WORKSPACE_ROOT}/artist`,
  },
];

/** Navigation for each context of the single unified workspace. */
export const workspaceNav: Record<WorkspaceContext, NavItem[]> = {
  brand: [
    {
      label: "Dashboard",
      href: `${WORKSPACE_ROOT}/brand`,
      icon: "dashboard",
      description: "What your brand has, what is in progress, and what needs you.",
    },
    {
      label: "My Brand",
      href: `${WORKSPACE_ROOT}/brand/profile`,
      icon: "sparkles",
      description: "Your identity: name, story, logo, colours, voice and audience.",
    },
    {
      label: "My Documents",
      href: `${WORKSPACE_ROOT}/brand/documents`,
      icon: "file-text",
      description: "Profiles, proposals, presentations and business documents.",
    },
    {
      label: "My Marketing",
      href: `${WORKSPACE_ROOT}/brand/marketing`,
      icon: "megaphone",
      description: "Social, promotional and launch creative produced for you.",
    },
    {
      label: "My Assets",
      href: `${WORKSPACE_ROOT}/brand/assets`,
      icon: "images",
      description: "Logos, imagery and reference material you keep and reuse.",
    },
    {
      label: "My Library",
      href: `${WORKSPACE_ROOT}/brand/library`,
      icon: "package",
      description: "Every finished file KeedoHub has delivered to you.",
    },
    {
      label: "My Projects",
      href: `${WORKSPACE_ROOT}/brand/projects`,
      icon: "folder",
      description: "Work being produced for your brand, and its stage.",
    },
    {
      label: "My Requests",
      href: `${WORKSPACE_ROOT}/brand/requests`,
      icon: "send",
      description: "What you have asked for, and where each request is.",
    },
    {
      label: "Notifications",
      href: `${WORKSPACE_ROOT}/brand/notifications`,
      icon: "bell",
      description: "What has changed with your brand's creative work.",
    },
  ],
  artist: [
    {
      label: "Dashboard",
      href: `${WORKSPACE_ROOT}/artist`,
      icon: "dashboard",
      description: "What you have, what is in progress, and what needs you.",
    },
    {
      label: "My Profile",
      href: `${WORKSPACE_ROOT}/artist/profile`,
      icon: "user",
      description: "Your artist identity: name, story, genre and links.",
    },
    {
      label: "My Releases",
      href: `${WORKSPACE_ROOT}/artist/releases`,
      icon: "disc",
      description: "Singles, EPs and albums, with their artwork and assets.",
    },
    {
      label: "My Assets",
      href: `${WORKSPACE_ROOT}/artist/assets`,
      icon: "images",
      description: "Artwork, imagery and reference material you keep and reuse.",
    },
    {
      label: "My Library",
      href: `${WORKSPACE_ROOT}/artist/library`,
      icon: "package",
      description: "Every finished file KeedoHub has delivered to you.",
    },
    {
      label: "My Projects",
      href: `${WORKSPACE_ROOT}/artist/projects`,
      icon: "folder",
      description: "Work being produced for you, and its stage.",
    },
    {
      label: "My Requests",
      href: `${WORKSPACE_ROOT}/artist/requests`,
      icon: "send",
      description: "What you have asked for, and where each request is.",
    },
    {
      label: "Notifications",
      href: `${WORKSPACE_ROOT}/artist/notifications`,
      icon: "bell",
      description: "What has changed with your creative work.",
    },
  ],
};

/**
 * Internal Studio navigation. Internal vocabulary is allowed here and must
 * never be rendered on a customer surface (spec §24). No Studio route is
 * exposed yet: access control arrives in Phase 4, so the shell exists as a
 * component without a public route.
 */
export const studioNav: NavItem[] = [
  {
    label: "Command Center",
    href: `${STUDIO_ROOT}/command-center`,
    icon: "dashboard",
    description: "What needs attention now.",
  },
  {
    label: "Customers",
    href: `${STUDIO_ROOT}/customers`,
    icon: "users",
    description: "Workspaces and the customers behind them.",
  },
  {
    label: "Requests",
    href: `${STUDIO_ROOT}/requests`,
    icon: "send",
    description: "Incoming and validated requests.",
  },
  {
    label: "Projects",
    href: `${STUDIO_ROOT}/projects`,
    icon: "folder",
    description: "Accepted work in progress.",
  },
  {
    label: "Production Queue",
    href: `${STUDIO_ROOT}/production-queue`,
    icon: "layers",
    description: "Jobs by queue state.",
  },
  {
    label: "Studio",
    href: `${STUDIO_ROOT}/studio`,
    icon: "palette",
    description: "The production workspace for a job.",
  },
  {
    label: "Review",
    href: `${STUDIO_ROOT}/review`,
    icon: "check",
    description: "Internal QA and customer review.",
  },
  {
    label: "Deliveries",
    href: `${STUDIO_ROOT}/deliveries`,
    icon: "package",
    description: "Approved work prepared or delivered.",
  },
  {
    label: "Library",
    href: `${STUDIO_ROOT}/library`,
    icon: "images",
    description: "Internal asset and file library.",
  },
  {
    label: "Settings",
    href: `${STUDIO_ROOT}/settings`,
    icon: "settings",
    description: "Production types, templates and operator access.",
  },
];

export const defaultWorkspaceContext: WorkspaceContext = "brand";

export function isWorkspaceContext(value: string): value is WorkspaceContext {
  return value === "brand" || value === "artist";
}

export function getContextMeta(
  context: WorkspaceContext,
): WorkspaceContextMeta | undefined {
  return workspaceContexts.find((entry) => entry.id === context);
}

export function getWorkspaceNav(context: WorkspaceContext): NavItem[] {
  return workspaceNav[context];
}

/** Route slug of a navigation item within its context (e.g. "documents"). */
export function navSlug(item: NavItem, context: WorkspaceContext): string {
  return item.href.slice(`${WORKSPACE_ROOT}/${context}/`.length);
}

/**
 * Resolve the navigation item for a context section slug.
 * Returns undefined when the slug is not part of the context navigation.
 */
export function findNavItemBySlug(
  context: WorkspaceContext,
  slug: string,
): NavItem | undefined {
  return getWorkspaceNav(context).find(
    (item) => navSlug(item, context) === slug,
  );
}
