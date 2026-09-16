import type { NavIconName, WorkspaceContext } from "@/lib/navigation";
export { getStorageKey } from "@/lib/storage/key";

export type QuickAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: NavIconName;
};

export type ProfileGroup = {
  id: string;
  title: string;
  description: string;
  icon: NavIconName;
  fields: string[];
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
};

export type PreviewSpec = {
  id: string;
  title: string;
  kind: string;
  aspect: "aspect-[4/3]" | "aspect-square" | "aspect-[16/10]";
};

export type WorkspaceHomeContent = {
  eyebrow: string;
  name: string;
  description: string;
  initials: string;
  statusLabel: string;
  introTitle: string;
  introCopy: string;
  profileTitle: string;
  profileCopy: string;
  profileActionLabel: string;
  profileHref: string;
  groups: ProfileGroup[];
  actions: QuickAction[];
  previews: PreviewSpec[];
  activity: ActivityItem[];
};

const brandGroups: ProfileGroup[] = [
  {
    id: "identity",
    title: "Identity",
    description: "Name, story, industry and what the brand offers.",
    icon: "sparkles",
    fields: ["Brand / company name", "Description", "Industry", "Products & services"],
  },
  {
    id: "contact",
    title: "Contact",
    description: "Where the brand is and how to reach it.",
    icon: "user",
    fields: ["Location", "Contact information", "Website", "Social links"],
  },
  {
    id: "visual",
    title: "Visual identity",
    description: "Logo, colour, type and imagery direction.",
    icon: "images",
    fields: ["Logo", "Brand colours", "Typography", "Visual & imagery style"],
  },
  {
    id: "voice",
    title: "Brand voice",
    description: "How the brand sounds and who it speaks to.",
    icon: "megaphone",
    fields: ["Personality", "Voice & tone", "Value proposition", "Target audience"],
  },
  {
    id: "business",
    title: "Business information",
    description: "Practical detail used for documents.",
    icon: "file-text",
    fields: ["Legal name", "Preferred layouts", "References", "Other useful detail"],
  },
];

const artistGroups: ProfileGroup[] = [
  {
    id: "identity",
    title: "Identity",
    description: "Stage name, story and sound.",
    icon: "user",
    fields: ["Artist / stage name", "Biography", "Genre", "Contact"],
  },
  {
    id: "links",
    title: "Links",
    description: "Everywhere the music and story live.",
    icon: "send",
    fields: ["Socials", "Streaming links", "Website", "Press contacts"],
  },
  {
    id: "visual",
    title: "Visual identity",
    description: "Colours, imagery and creative direction.",
    icon: "images",
    fields: ["Visual identity", "Colours", "Creative preferences", "References"],
  },
  {
    id: "releases",
    title: "Release information",
    description: "The catalogue KeedoHub creates artwork for.",
    icon: "disc",
    fields: ["Singles, EPs & albums", "Release dates", "Songs & metadata", "Artwork needs"],
  },
];

export const workspaceHome: Record<WorkspaceContext, WorkspaceHomeContent> = {
  brand: {
    eyebrow: "Brand workspace",
    name: "Your brand, ready for production",
    description:
      "KeedoHub produces professional creative work from your brand identity and a clear brief. This workspace gathers your profile, your work and your requests in one calm place.",
    initials: "KH",
    statusLabel: "Workspace created",
    introTitle: "What has KeedoHub created for you?",
    introCopy:
      "Finished work lands here, ready to use. Nothing has been produced for this workspace yet — the shelves below are empty on purpose, not broken.",
    profileTitle: "Your Brand Profile",
    profileCopy:
      "Complete your profile so KeedoHub can create work that feels like your brand. Your answers become the brand identity every production starts from.",
    profileActionLabel: "Complete brand profile",
    profileHref: "/workspace/brand/profile",
    groups: brandGroups,
    actions: [
      { id: "request", title: "Request creative work", description: "Tell us what you need made.", href: "/workspace/brand/requests", icon: "send" },
      { id: "profile", title: "Complete brand profile", description: "Identity, visuals, voice.", href: "/workspace/brand/profile", icon: "sparkles" },
      { id: "documents", title: "View documents", description: "Profiles, proposals, decks.", href: "/workspace/brand/documents", icon: "file-text" },
      { id: "marketing", title: "View marketing assets", description: "Social, launch, promo.", href: "/workspace/brand/marketing", icon: "megaphone" },
      { id: "projects", title: "View projects", description: "Work currently in progress.", href: "/workspace/brand/projects", icon: "folder" },
      { id: "assets", title: "View assets", description: "Logos, imagery, references.", href: "/workspace/brand/assets", icon: "images" },
    ],
    previews: [
      { id: "p1", title: "Company profile", kind: "Document", aspect: "aspect-[4/3]" },
      { id: "p2", title: "Social kit", kind: "Marketing", aspect: "aspect-square" },
      { id: "p3", title: "Launch assets", kind: "Marketing", aspect: "aspect-[16/10]" },
    ],
    activity: [],
  },
  artist: {
    eyebrow: "Artist workspace",
    name: "Your music, ready for artwork",
    description:
      "KeedoHub produces cover artwork, release visuals and promotional creative from your identity and your music. This workspace gathers your profile, your releases and your requests in one calm place.",
    initials: "KH",
    statusLabel: "Workspace created",
    introTitle: "What has KeedoHub created for you?",
    introCopy:
      "Finished artwork and release assets land here, ready to share. Nothing has been produced for this workspace yet — the shelves below are empty on purpose, not broken.",
    profileTitle: "Your Artist Profile",
    profileCopy:
      "Complete your profile so KeedoHub can create artwork that sounds like you look. Your answers become the artist identity every production starts from.",
    profileActionLabel: "Complete artist profile",
    profileHref: "/workspace/artist/profile",
    groups: artistGroups,
    actions: [
      { id: "request", title: "Request creative work", description: "Artwork, visuals, EPK.", href: "/workspace/artist/requests", icon: "send" },
      { id: "profile", title: "Complete artist profile", description: "Identity, links, visuals.", href: "/workspace/artist/profile", icon: "user" },
      { id: "releases", title: "View releases", description: "Singles, EPs, albums.", href: "/workspace/artist/releases", icon: "disc" },
      { id: "assets", title: "View assets", description: "Artwork and imagery.", href: "/workspace/artist/assets", icon: "images" },
      { id: "projects", title: "View projects", description: "Work currently in progress.", href: "/workspace/artist/projects", icon: "folder" },
    ],
    previews: [
      { id: "p1", title: "Cover artwork", kind: "Release", aspect: "aspect-square" },
      { id: "p2", title: "Social assets", kind: "Promo", aspect: "aspect-[4/3]" },
      { id: "p3", title: "Motion visual", kind: "Motion", aspect: "aspect-[16/10]" },
    ],
    activity: [],
  },
};