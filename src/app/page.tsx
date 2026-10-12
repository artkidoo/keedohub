import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Check,
  Disc3,
  FileStack,
  Globe,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Music2,
  Palette,
  PanelsTopLeft,
  PenTool,
  Presentation,
  Share2,
  ShieldCheck,
  Sparkles,
  SwatchBook,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Wordmark, WordmarkLink } from "@/components/layout/wordmark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WORKSPACE_ROOT } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Public marketing homepage.
 *
 * This page is a *service* story: KeedoHub is a creative production studio, and
 * the customer workspace is where finished work is handed over. It is
 * deliberately not a product dashboard and carries no operator vocabulary —
 * the private Studio is reachable only by an authorised operator record and is
 * never advertised, linked or described here.
 *
 * Everything asserted below corresponds to something the product actually
 * does: the service list mirrors the real request categories, and every claim
 * about the workspace matches a route that exists. There is no fabricated
 * client work, testimonial or metric anywhere on this page.
 */

/** Sign-in, preserving where the visitor was heading. */
function signInHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Enquiry entry point — a request is created inside the workspace. */
const ENQUIRY_HREF = signInHref(`${WORKSPACE_ROOT}/brand/requests/new`);

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#work", label: "Our Work" },
  { href: "#about", label: "About" },
];

/**
 * Creative services. Each entry maps to a real request category a customer can
 * file, so nothing here promises work the production system cannot take on.
 */
const services = [
  {
    id: "brand-identity",
    icon: Sparkles,
    title: "Brand identity",
    copy: "Logo systems, colour, type and voice — the identity a business or an artist is recognised by.",
  },
  {
    id: "graphic-design",
    icon: Layers,
    title: "Graphic design",
    copy: "Composed, production-ready graphics for print and screen, built to your brand rather than from a template.",
  },
  {
    id: "web-design",
    icon: Globe,
    title: "Website design & development",
    copy: "Sites designed and built end to end — from structure and layout through to a finished, deployed site.",
  },
  {
    id: "cover-artwork",
    icon: Disc3,
    title: "Music cover artwork",
    copy: "Cover artwork and release visuals for singles, EPs and albums, prepared to release specification.",
  },
  {
    id: "artist-branding",
    icon: Palette,
    title: "Artist branding",
    copy: "A coherent visual identity across every release, so a catalogue reads as one artist rather than a folder of files.",
  },
  {
    id: "social-creatives",
    icon: Share2,
    title: "Social media creatives",
    copy: "Platform-sized creative for announcements, campaigns and ongoing posting.",
  },
  {
    id: "marketing-content",
    icon: MessageSquare,
    title: "Marketing content",
    copy: "Campaign creative and marketing assets written and designed around a clear message.",
  },
  {
    id: "presentations",
    icon: Presentation,
    title: "Presentations",
    copy: "Pitch and investor decks with a consistent design system, not slides rebuilt by hand each time.",
  },
  {
    id: "business-documents",
    icon: FileStack,
    title: "Business documents",
    copy: "Proposals, reports and documents that look like they came from the same business as everything else.",
  },
];

/**
 * Selected work.
 *
 * There is no public client archive yet, and inventing one would be dishonest.
 * These are therefore labelled, unmistakably, as *concepts*: each shows the
 * kind of creative direction KeedoHub produces, with the deliverable type
 * stated plainly. No client names, no results, no testimonials, no metrics.
 */
const work = [
  {
    id: "concept-identity",
    discipline: "Brand identity",
    icon: Sparkles,
    title: "Identity system",
    brief: "A mark, type pairing and colour ramp held together by one set of rules.",
    deliverables: ["Logo system", "Colour & type", "Usage rules"],
  },
  {
    id: "concept-cover",
    discipline: "Cover artwork",
    icon: Disc3,
    title: "Release artwork",
    brief: "Single artwork and the surrounding release visuals, built to distribution specification.",
    deliverables: ["Cover artwork", "Release assets"],
  },
  {
    id: "concept-web",
    discipline: "Web",
    icon: Globe,
    title: "Marketing site",
    brief: "A small site designed and built — structure, layout and a deployed front end.",
    deliverables: ["Design", "Build", "Handover"],
  },
  {
    id: "concept-documents",
    discipline: "Business documents",
    icon: Presentation,
    title: "Deck system",
    brief: "A presentation system where new slides inherit the design instead of drifting from it.",
    deliverables: ["Deck design", "Templates"],
  },
];

/**
 * How the work moves. Every step is a thing the product does: a request is
 * filed, produced through the production workflow, reviewed with the customer,
 * and delivered into the workspace where only that customer can reach it.
 */
const steps = [
  {
    icon: MessageSquare,
    title: "Enquiry",
    copy: "You describe what you need in your workspace. Scope and deliverables are agreed before anything is produced.",
  },
  {
    icon: PenTool,
    title: "Creative production",
    copy: "KeedoHub does the work, tracked against the agreed scope rather than a guess at where it stands.",
  },
  {
    icon: Check,
    title: "Review & delivery",
    copy: "You review the work, request changes and approve. Only approved work is delivered.",
  },
  {
    icon: ShieldCheck,
    title: "Your workspace",
    copy: "Delivered files and documents land in your own workspace, kept strictly separate from every other customer's.",
  },
];

const principles = [
  {
    icon: Briefcase,
    title: "A studio, not a subscription",
    copy: "KeedoHub produces the work. You are commissioning finished creative, not paying to operate software.",
  },
  {
    icon: Users,
    title: "Built for two kinds of client",
    copy: "Brands and artists have genuinely different needs, so each has its own workspace with its own sections.",
  },
  {
    icon: ShieldCheck,
    title: "Your work stays yours",
    copy: "Brand and Artist workspaces are separated at the data layer. One customer can never reach another's files.",
  },
];

/** What a Brand customer sees after signing in. All are real workspace routes. */
const workspaceBrand = [
  "Requests and their status",
  "Projects and delivered files",
  "Documents and marketing assets",
  "Notifications when work changes",
];

/** What an Artist customer sees. Different sections, same strict separation. */
const workspaceArtist = [
  "Cover artwork and release assets",
  "Releases, in order",
  "Library of everything delivered",
  "Notifications when work changes",
];

const footerNav = [
  {
    heading: "Creative services",
    links: services.map((service) => ({
      label: service.title,
      href: "#services",
    })),
  },
  {
    heading: "KeedoHub",
    links: [
      { label: "Selected work", href: "#work" },
      { label: "How it works", href: "#how-it-works" },
      { label: "About", href: "#about" },
      { label: "Customer workspace", href: "#workspace" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create your workspace", href: "/signup" },
      { label: "Project enquiry", href: ENQUIRY_HREF },
      {
        label: "Brand workspace",
        href: signInHref(`${WORKSPACE_ROOT}/brand`),
      },
      {
        label: "Artist workspace",
        href: signInHref(`${WORKSPACE_ROOT}/artist`),
      },
    ],
  },
];

/** Public header: identity, in-page navigation, appearance, and sign-in. */
function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4 sm:h-16">
        <WordmarkLink />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 lg:flex"
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden min-h-11 sm:inline-flex sm:min-h-9",
            )}
          >
            Sign in
          </Link>
          <Link
            href={ENQUIRY_HREF}
            className={cn(buttonVariants({ size: "sm" }), "min-h-11 sm:min-h-9")}
          >
            Project enquiry
          </Link>
        </div>
      </Container>

      {/*
        Below `lg` the in-page links move into a scrollable rail rather than a
        hamburger: five destinations do not warrant a menu, and a rail keeps
        every link one tap away with no disclosure state to manage.
      */}
      <nav
        aria-label="Sections"
        className="border-t border-border lg:hidden"
      >
        <Container className="flex gap-6 overflow-x-auto py-2.5">
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-sm text-sm whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              {item.label}
            </a>
          ))}
        </Container>
      </nav>
    </header>
  );
}

/**
 * Hero composition: an art-directed collage of the kinds of creative output
 * KeedoHub produces — music cover, website, brand identity and social.
 *
 * A *designed CSS/SVG composition from the project's own tokens and icons*,
 * not a photograph: there is no licensed studio photography in the repo and
 * inventing a client image would be dishonest. No external asset (zero network
 * weight) and no essential text (the headline is real text beside it). The
 * whole frame is `aria-hidden`; the labels live in the copy, not the image.
 */
function HeroComposition() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] opacity-70 [background-image:radial-gradient(60%_60%_at_60%_35%,var(--kh-primary-soft),transparent_72%)]" />

      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {/* Cover artwork — the tall anchor tile. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm [transition:transform_.5s_var(--kh-ease-out),box-shadow_.5s_var(--kh-ease-out)] hover:-translate-y-1 hover:shadow-lg">
          <div className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground [&_svg]:size-5">
              <Disc3 className="motion-safe:animate-[spin_9s_linear_infinite]" />
            </span>
            <span className="flex gap-1">
              <span className="size-1.5 rounded-full bg-primary/70" />
              <span className="size-1.5 rounded-full bg-border" />
              <span className="size-1.5 rounded-full bg-border" />
            </span>
          </div>
          {/* Abstract album cover: a circular mark + a title block. */}
          <div className="relative mt-6 flex flex-1 flex-col justify-end gap-3">
            <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-surface">
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-primary/40 text-primary [&_svg]:size-7">
                <Music2 />
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="h-2 w-3/4 rounded-full bg-foreground/70" />
              <span className="h-2 w-1/2 rounded-full bg-muted-foreground/40" />
            </div>
          </div>
        </div>

        {/* Website — a wireframed browser tile. */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm [transition:transform_.5s_var(--kh-ease-out),box-shadow_.5s_var(--kh-ease-out)] hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="ml-auto flex size-6 items-center justify-center rounded-md bg-surface text-primary [&_svg]:size-3.5">
              <PanelsTopLeft />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <span className="h-2.5 w-2/3 rounded-full bg-foreground/60" />
            <span className="h-2 w-1/2 rounded-full bg-muted-foreground/35" />
            <div className="mt-auto grid grid-cols-3 gap-2">
              <span className="h-8 rounded-md bg-primary/15" />
              <span className="h-8 rounded-md bg-primary/10" />
              <span className="h-8 rounded-md bg-primary/15" />
            </div>
          </div>
        </div>

        {/* Brand identity — a swatch + type specimen. */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm [transition:transform_.5s_var(--kh-ease-out),box-shadow_.5s_var(--kh-ease-out)] hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-7 items-center justify-center rounded-lg bg-surface text-primary [&_svg]:size-4">
              <SwatchBook />
            </span>
            <span className="text-[0.6rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Aa
            </span>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex gap-1.5">
              <span className="h-6 flex-1 rounded-md bg-primary" />
              <span className="h-6 flex-1 rounded-full bg-primary/60" />
              <span className="h-6 flex-1 rounded-md bg-primary/30" />
              <span className="h-6 flex-1 rounded-full bg-border" />
            </div>
            <span className="font-semibold tracking-tight">Identity</span>
          </div>
        </div>
      </div>

      {/* A small chip ties the collage to the workspace handover. */}
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface-elevated/90 px-3.5 py-2.5 shadow-sm backdrop-blur-sm sm:mt-5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary [&_svg]:size-4">
          <ImageIcon />
        </span>
        <span className="text-meta font-medium text-muted-foreground">
          Every file delivered into your workspace
        </span>
      </div>
    </div>
  );
}

/** Hero: the promise, what KeedoHub is, and the two ways to start. */
function Hero() {
  return (
    <Section id="hero" spacing="lg" aria-labelledby="hero-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] opacity-80 [background-image:radial-gradient(75%_100%_at_50%_0%,var(--kh-primary-soft),transparent_70%)]"
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="flex max-w-content flex-col items-start gap-7">
            <Badge variant="brand">Creative production studio</Badge>

            <h1 id="hero-heading" className="text-hero font-semibold">
              Your vision. Our creative execution.
            </h1>

            <p className="max-w-2xl text-lead text-muted-foreground">
              KeedoHub is a creative studio for brands, artists and businesses.
              Tell us what you need and we produce the finished work — brand
              identity, artwork, websites, campaigns and documents — then hand it
              over in your own private workspace.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href={ENQUIRY_HREF}
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                Start a project
                <ArrowRight aria-hidden />
              </Link>
              <Link
                href="#work"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                Explore our work
              </Link>
            </div>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
              <Sparkles aria-hidden className="size-4 shrink-0 text-primary" />
              Creative services, plus the workspace where your finished work is
              delivered.
            </p>
          </div>

          <HeroComposition />
        </div>
      </Container>
    </Section>
  );
}

/** Creative services — the work KeedoHub actually produces. */
function Services() {
  return (
    <Section id="services" divided aria-labelledby="services-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="services-heading"
          eyebrow="Creative services"
          title="What we make."
          description="From a first identity to the documents that go out under it. Every service below is work we produce and deliver, not a feature you have to learn."
        />

        <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 bg-surface p-6 transition-colors duration-200 hover:bg-surface-elevated sm:p-7"
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary">
                <service.icon aria-hidden className="size-5" />
              </span>
              <h3 className="text-heading font-medium">{service.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.copy}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/**
 * Selected work.
 *
 * Labelled as concepts, deliberately: there is no published client archive to
 * show yet, and these cards describe the *type* of deliverable rather than
 * claiming a completed engagement.
 */
function SelectedWork() {
  return (
    <Section id="work" divided aria-labelledby="work-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="work-heading"
          eyebrow="Selected work"
          title="The kind of work we produce."
          description="KeedoHub is early, and we would rather show you nothing than show you something invented. The examples below are labelled concepts — they describe what we make and hand over, not past client engagements."
        />

        <ul className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {work.map((item) => (
            // `min-w-0` is load-bearing: a grid item defaults to `min-width:
            // auto`, so its min-content width can push the track wider than the
            // container and put the whole page into horizontal scroll on a
            // narrow phone. Allowing it to shrink below that fixes it.
            <li key={item.id} className="min-w-0">
              <Card className="flex h-full flex-col">
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <Badge variant="neutral">{item.discipline}</Badge>
                    <Badge variant="brand">Concept</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary">
                      <item.icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="text-title font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.brief}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="text-eyebrow font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Deliverables
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2 border-t border-border pt-4">
                    {item.deliverables.map((deliverable) => (
                      <li
                        key={deliverable}
                        className="rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-meta text-muted-foreground"
                      >
                        {deliverable}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/** How an enquiry becomes delivered work. Every step maps to real product behaviour. */
function HowItWorks() {
  return (
    <Section id="how-it-works" divided aria-labelledby="how-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="how-heading"
          eyebrow="How it works"
          title="Brief in. Finished work out."
          description="Four steps, each with a record you can see in your workspace rather than a status update to chase."
        />

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary">
                  <step.icon aria-hidden className="size-5" />
                </span>
                <span
                  aria-hidden
                  className="text-meta font-medium tabular-nums text-muted-foreground"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-heading font-medium">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/**
 * The customer workspace.
 *
 * Describes the handover surface only. It must never read like an operator
 * console: the sections listed are the ones a customer actually sees, and the
 * Brand/Artist separation is the same one enforced in the data layer.
 */
function Workspace() {
  const spaces = [
    {
      id: "workspace-brand",
      icon: Briefcase,
      title: "Brand workspace",
      copy: "For businesses commissioning creative work.",
      items: workspaceBrand,
      href: signInHref(`${WORKSPACE_ROOT}/brand`),
    },
    {
      id: "workspace-artist",
      icon: Palette,
      title: "Artist workspace",
      copy: "For artists releasing music and building a catalogue.",
      items: workspaceArtist,
      href: signInHref(`${WORKSPACE_ROOT}/artist`),
    },
  ];

  return (
    <Section id="workspace" divided aria-labelledby="workspace-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="workspace-heading"
          eyebrow="KeedoHub workspace"
          title="Your delivered work, in one place."
          description="Customers sign in to see their own files, documents and project progress. A workspace shows your work only — it is never a shared gallery, and other customers cannot reach it."
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {spaces.map((space) => (
            <Card key={space.id} id={space.id} className="flex flex-col">
              <CardHeader className="gap-5">
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-elevated text-primary">
                  <space.icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-title font-semibold">{space.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {space.copy}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="flex flex-col gap-3 border-t border-border pt-6">
                  {space.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={space.href}
                  className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary transition-colors outline-none hover:text-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/35 md:min-h-9"
                >
                  Sign in to your workspace
                  <ArrowUpRight aria-hidden className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="flex items-start gap-2.5 text-meta text-muted-foreground">
          <ShieldCheck
            aria-hidden
            className="mt-px size-4 shrink-0 text-primary"
          />
          Brand and Artist workspaces are separated in the database, not just in
          the interface. Files, documents and requests in one are unreachable
          from the other.
        </p>
      </Container>
    </Section>
  );
}

/** About: what KeedoHub is, stated plainly and without inflation. */
function About() {
  return (
    <Section id="about" divided aria-labelledby="about-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="about-heading"
          eyebrow="About KeedoHub"
          title="A creative studio that ships its own handover."
          description="KeedoHub does two things: it produces creative work, and it gives you the workspace that work arrives in. Most studios do the first and email a link for the second."
        />

        <ul className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {principles.map((principle) => (
            <li key={principle.title} className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary">
                <principle.icon aria-hidden className="size-5" />
              </span>
              <h3 className="text-heading font-medium">{principle.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {principle.copy}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/** Closing call to action. */
function ClosingCta() {
  return (
    <Section id="enquire" spacing="lg" divided aria-labelledby="cta-heading">
      <Container>
        <div className="flex flex-col items-start gap-7 rounded-2xl border border-border bg-surface p-8 sm:p-12">
          <Badge variant="brand">Start a project</Badge>
          <h2
            id="cta-heading"
            className="text-display text-balance font-semibold"
          >
            Tell us what you need made.
          </h2>
          <p className="max-w-2xl text-lead text-muted-foreground">
            Bring a brief, a release or a blank page. We agree the scope first,
            produce the work, and deliver it straight into your workspace.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href={ENQUIRY_HREF}
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Project enquiry
              <ArrowRight aria-hidden />
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              Create your workspace
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** Footer: navigation, the enquiry path, and no operator vocabulary. */
function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-12 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <Wordmark />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A creative production studio for brands, artists and businesses —
              and the workspace your finished work is delivered into.
            </p>
            <Link
              href={ENQUIRY_HREF}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-fit min-h-11",
              )}
            >
              Project enquiry
              <ArrowRight aria-hidden />
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerNav.map((group) => (
              <nav
                key={group.heading}
                aria-label={group.heading}
                className="flex flex-col gap-4"
              >
                <h2 className="text-eyebrow font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  {group.heading}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={`${group.heading}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-meta text-muted-foreground">
            &copy; {new Date().getFullYear()} KeedoHub
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-2">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-sm text-meta text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-sm text-meta text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Hero />
        <Services />
        <SelectedWork />
        <HowItWorks />
        <Workspace />
        <About />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  );
}