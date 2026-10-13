import {
  Disc3,
  FileStack,
  Globe,
  Layers,
  MessageSquare,
  Palette,
  Presentation,
  Share2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { WORKSPACE_ROOT, type WorkspaceContext } from "@/lib/navigation";

/**
 * The public creative-services catalogue (homepage "What we make").
 *
 * Every entry mirrors something the product actually does: each service maps
 * to real request categories a customer can file, and every description
 * matches work the production workflow can take on. No prices, no guarantees,
 * no testimonials, no client names — the list is a service story, not an
 * invented archive.
 *
 * Kept in `src/lib` (not in the page) so the server page and the client
 * services grid share one source of truth without crossing the React
 * server/client boundary with props.
 */
export type CreativeService = {
  /** Stable identifier (also used for accessible dialog heading ids). */
  id: string;
  icon: LucideIcon;
  /** Card title. */
  title: string;
  /** One-line card summary. */
  copy: string;
  /** Longer description shown in the "Read more" dialog. */
  details: string;
  /** The kinds of work this service produces — not contractual promises. */
  deliverables: string[];
  /** Plain-language description of who this service is for. */
  audience: string;
  /** Which workspace context files the enquiry under. */
  requestContext: WorkspaceContext;
};

export const creativeServices: readonly CreativeService[] = [
  {
    id: "brand-identity",
    icon: Sparkles,
    title: "Brand identity",
    copy: "Logo systems, colour, type and voice — the identity a business or an artist is recognised by.",
    details:
      "An identity is the set of rules that makes everything a business puts out read as one thing: the mark, the colours, the type and the voice. KeedoHub designs the system and documents how it is used, so later work — documents, websites, campaigns — inherits the identity instead of drifting from it. It suits a first identity and a careful rethink of an existing one alike.",
    deliverables: [
      "Logo system",
      "Colour palette",
      "Typography direction",
      "Voice and usage guidance",
    ],
    audience:
      "Businesses and organisations establishing a first identity, or renewing one that no longer fits.",
    requestContext: "brand",
  },
  {
    id: "graphic-design",
    icon: Layers,
    title: "Graphic design",
    copy: "Composed, production-ready graphics for print and screen, built to your brand rather than from a template.",
    details:
      "Day-to-day design work that has to look like it came from your business: layouts, one-off graphics and everyday pieces for print and screen. Everything is composed against your identity — colours, type and voice included — rather than dropped into a template, so single pieces and long-running work stay consistent with everything else you publish.",
    deliverables: [
      "Print graphics",
      "Screen graphics",
      "Campaign and everyday pieces",
    ],
    audience:
      "Brands with regular design needs that want consistent work, inside a wider project or as one-off pieces.",
    requestContext: "brand",
  },
  {
    id: "web-design",
    icon: Globe,
    title: "Website design & development",
    copy: "Sites designed and built end to end — from structure and layout through to a finished, deployed site.",
    details:
      "A website is designed and built as one piece of work: structure and layout first, then a design system the pages inherit, then the build itself. The deliverable is a finished, deployed site that reads as the same business as everything else you put out — not a design file handed over for someone else to assemble.",
    deliverables: ["Design", "Build", "Deployment and handover"],
    audience:
      "Businesses and artists who need a site that exists end to end — designed, built and live.",
    requestContext: "brand",
  },
  {
    id: "cover-artwork",
    icon: Disc3,
    title: "Music cover artwork",
    copy: "Cover artwork and release visuals for singles, EPs and albums, prepared to release specification.",
    details:
      "Cover artwork is often the first thing a listener sees of a release, and it has to survive both the feed and the storefront. KeedoHub designs artwork for singles, EPs and albums and prepares it to release specification, with the surrounding release visuals that carry the same look onto every platform.",
    deliverables: [
      "Cover artwork",
      "Alternate release visuals",
      "Release-specification exports",
    ],
    audience:
      "Artists and labels releasing singles, EPs or albums who want artwork that holds together across platforms.",
    requestContext: "artist",
  },
  {
    id: "artist-branding",
    icon: Palette,
    title: "Artist branding",
    copy: "A coherent visual identity across every release, so a catalogue reads as one artist rather than a folder of files.",
    details:
      "An artist builds a catalogue over years; without a visual identity, that catalogue reads as unrelated files. Artist branding establishes the look — mark, colour, type and imagery direction — and applies it across releases and everything around them, so each new release visibly belongs to the same artist as the last one.",
    deliverables: [
      "Artist identity direction",
      "Colour and type system",
      "Consistent release look",
    ],
    audience:
      "Artists building a catalogue over time, from a first release onward.",
    requestContext: "artist",
  },
  {
    id: "social-creatives",
    icon: Share2,
    title: "Social media creatives",
    copy: "Platform-sized creative for announcements, campaigns and ongoing posting.",
    details:
      "Social creative has to hold its shape across very different feeds while still reading as one brand. KeedoHub designs platform-sized creative for announcements, campaign moments and ongoing posting, built to your identity so a feed full of separate posts still looks like one source.",
    deliverables: [
      "Announcement creative",
      "Campaign creative",
      "Ongoing post design",
    ],
    audience:
      "Brands publishing regularly who need social creative that stays on identity.",
    requestContext: "brand",
  },
  {
    id: "marketing-content",
    icon: MessageSquare,
    title: "Marketing content",
    copy: "Campaign creative and marketing assets written and designed around a clear message.",
    details:
      "Campaign work starts from the message, not the medium: what is being announced and who needs to hear it. From there KeedoHub writes and designs the campaign creative and the marketing assets around it, so the pieces support one message instead of competing with each other.",
    deliverables: [
      "Campaign creative",
      "Marketing assets",
      "Messaging around one clear idea",
    ],
    audience:
      "Brands running launches and campaigns who need the creative and the words to work together.",
    requestContext: "brand",
  },
  {
    id: "presentations",
    icon: Presentation,
    title: "Presentations",
    copy: "Pitch and investor decks with a consistent design system, not slides rebuilt by hand each time.",
    details:
      "A deck is a design system as much as a document: a set of slide types new content inherits instead of being rebuilt by hand. KeedoHub designs pitch and investor decks end to end and sets them up so the next version stays consistent with the last one.",
    deliverables: ["Pitch and investor decks", "Slide design system"],
    audience:
      "Businesses pitching or raising who need decks that stay consistent as they grow.",
    requestContext: "brand",
  },
  {
    id: "business-documents",
    icon: FileStack,
    title: "Business documents",
    copy: "Proposals, reports and documents that look like they came from the same business as everything else.",
    details:
      "The everyday documents a business sends out — proposals, reports and similar — are usually where an identity quietly falls apart. KeedoHub designs these documents against the same identity as everything else you publish, so a proposal looks like it came from the same business as your website and your campaigns.",
    deliverables: ["Proposals", "Reports", "Everyday business documents"],
    audience:
      "Brands whose outward documents should match the quality of the rest of their identity.",
    requestContext: "brand",
  },
];

/**
 * Enquiry entry point for one service: sign in, preserving where the visitor
 * was heading, so a signed-in customer lands straight on the request form of
 * the matching workspace context.
 */
export function serviceEnquiryHref(service: CreativeService): string {
  const target = `${WORKSPACE_ROOT}/${service.requestContext}/requests/new`;
  return `/login?next=${encodeURIComponent(target)}`;
}
