import {
  ArrowRight,
  BadgeCheck,
  Building,
  ClipboardList,
  Compass,
  FileText,
  PackageCheck,
  Palette,
  PenTool,
  Sparkles,
  Star,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { Wordmark, WordmarkLink } from "@/components/layout/wordmark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WORKSPACE_ROOT } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const processSteps = [
  {
    icon: ClipboardList,
    title: "Brief",
    copy: "You describe the creative work you need.",
  },
  {
    icon: Compass,
    title: "Direction",
    copy: "Scope and approach are agreed before work starts.",
  },
  {
    icon: PenTool,
    title: "Production",
    copy: "KeedoHub produces the work professionally.",
  },
  {
    icon: BadgeCheck,
    title: "Delivery",
    copy: "Finished files arrive ready to use.",
  },
];

const paths = [
  {
    id: "for-brands",
    chip: "For brands",
    title: "I'm a Brand",
    icon: Building,
    copy: "Bring a brief instead of a blank page. KeedoHub produces the creative work your business needs — clearly scoped and finished.",
    points: [
      { icon: FileText, label: "A clear brief is all it takes to start." },
      { icon: Users, label: "Professional creative production, handled." },
      { icon: PackageCheck, label: "Finished work, ready to use." },
    ],
    href: `${WORKSPACE_ROOT}/brand`,
    cta: "Open the Brand workspace",
  },
  {
    id: "for-artists",
    chip: "For artists",
    title: "I'm an Artist",
    icon: Palette,
    copy: "Send KeedoHub your release information and identity. The artwork, visuals and assets come back finished — you never have to design them yourself.",
    points: [
      { icon: Sparkles, label: "Cover artwork and release visuals." },
      { icon: Timer, label: "Clear scope and timelines." },
      { icon: Star, label: "A body of real creative work." },
    ],
    href: `${WORKSPACE_ROOT}/artist`,
    cta: "Open the Artist workspace",
  },
];

/** Public header: identity, in-page navigation and the entry to the workspace. */
function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4 sm:h-16">
        <WordmarkLink />
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex"
        >
          {[
            { href: "#how-it-works", label: "How it works" },
            { href: "#for-brands", label: "For brands" },
            { href: "#for-artists", label: "For artists" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Link
          href={WORKSPACE_ROOT}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 sm:min-h-9")}
        >
          Get started
        </Link>
      </Container>
    </header>
  );
}

/** Hero: one promise, one supporting line, two ways in, and how work moves. */
function Hero() {
  return (
    <Section
      id="how-it-works"
      spacing="lg"
      aria-labelledby="hero-heading"
      className="overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] opacity-70 [background-image:radial-gradient(70%_100%_at_50%_0%,var(--kh-surface),transparent)]"
      />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="flex flex-col items-start gap-7">
            <Badge variant="brand">Creative production, on demand</Badge>

            <h1 id="hero-heading" className="text-hero font-semibold">
              Creative work, done.
            </h1>

            <p className="max-w-xl text-lead text-muted-foreground">
              KeedoHub helps brands and artists get professional creative work
              produced — a clear brief in, finished creative work out.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href={`${WORKSPACE_ROOT}/brand`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                <Building aria-hidden />
                {"I'm a Brand"}
              </Link>
              <Link
                href={`${WORKSPACE_ROOT}/artist`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                <Palette aria-hidden />
                {"I'm an Artist"}
              </Link>
            </div>

            <p className="flex items-center gap-2 text-meta text-muted-foreground">
              <Users aria-hidden className="size-4 shrink-0" />
              Two sides of the work, one place to get it made.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--kh-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--kh-border)_1px,transparent_1px)] [background-size:64px_64px]"
            />
            <div className="relative p-6 sm:p-8">
              <p className="text-eyebrow font-medium tracking-[0.14em] text-muted-foreground uppercase">
                How the work moves
              </p>
              <ol className="mt-6 flex flex-col divide-y divide-border border-t border-border">
                {processSteps.map((step) => (
                  <li key={step.title} className="flex items-start gap-4 py-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary">
                      <step.icon aria-hidden className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-heading font-medium">{step.title}</h2>
                      <p className="mt-1 text-meta text-muted-foreground">
                        {step.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** The two audience experiences, each linking into its workspace context. */
function Paths() {
  return (
    <Section id="paths" divided aria-labelledby="paths-heading">
      <Container className="flex flex-col gap-10 sm:gap-12">
        <SectionHeader
          id="paths-heading"
          eyebrow="Two ways in"
          title="Built for both sides of the work."
          description="Whether you commission the creative work or make it, KeedoHub is built around the way professional creative work actually gets produced."
        />
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {paths.map((path) => (
            <Card key={path.id} id={path.id} className="flex flex-col">
              <CardHeader className="gap-5">
                <Badge variant="neutral" className="w-fit">
                  {path.chip}
                </Badge>
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-primary">
                  <path.icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-title font-semibold">{path.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {path.copy}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="flex flex-col gap-3 border-t border-border pt-6">
                  {path.points.map((point) => (
                    <li
                      key={point.label}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <point.icon
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      <span>{point.label}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={path.href}
                  className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary transition-colors outline-none hover:text-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/35 md:min-h-9"
                >
                  {path.cta}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="text-meta text-muted-foreground">
            Creative work, done.
          </span>
        </div>
        <p className="text-meta text-muted-foreground">
          &copy; {new Date().getFullYear()} KeedoHub
        </p>
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
        <Paths />
      </main>
      <LandingFooter />
    </div>
  );
}