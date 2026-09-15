import {
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

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: ClipboardList,
    title: "Brief",
    copy: "A brand describes the creative work it needs.",
  },
  {
    icon: Compass,
    title: "Direction",
    copy: "Scope, approach and the right artist get aligned.",
  },
  {
    icon: PenTool,
    title: "Production",
    copy: "The work is made by a professional artist.",
  },
  {
    icon: BadgeCheck,
    title: "Delivery",
    copy: "Finished creative, ready to use.",
  },
];

const paths = [
  {
    id: "for-brands",
    chip: "For brands",
    title: "I'm a Brand",
    icon: Building,
    copy: "Bring a brief instead of a blank page. KeedoHub helps you get the creative work you need made — clearly scoped and delivered.",
    points: [
      { icon: FileText, label: "A clear brief is all it takes to start." },
      { icon: Users, label: "The right creative talent on the job." },
      { icon: PackageCheck, label: "Finished work, ready to use." },
    ],
  },
  {
    id: "for-artists",
    chip: "For artists",
    title: "I'm an Artist",
    icon: Palette,
    copy: "Get briefed on work that fits your craft, make it properly, and build a portfolio of real client work.",
    points: [
      { icon: Sparkles, label: "Briefs that suit your craft." },
      { icon: Timer, label: "Clear scope and timelines." },
      { icon: Star, label: "A body of real client work." },
    ],
  },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles aria-hidden className="size-4" />
      </span>
      <span className="text-[0.95rem] font-semibold tracking-tight">
        KeedoHub
      </span>
    </span>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <a
          href="#top"
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Wordmark />
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#for-brands"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            For brands
          </a>
          <a
            href="#for-artists"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            For artists
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="hero-heading"
      className="relative scroll-mt-24 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70 [background-image:radial-gradient(70%_100%_at_50%_0%,var(--muted),transparent)]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:px-8 lg:pt-28 lg:pb-28">
        <div className="flex flex-col items-start">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-foreground/40"
            />
            Creative production, on demand
          </p>

          <h1
            id="hero-heading"
            className="mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl"
          >
            Creative work, done.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            KeedoHub helps brands and artists get professional creative work
            produced — a clear brief in, finished creative work out.
          </p>

          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a
              href="#for-brands"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full px-6 text-[0.95rem] sm:w-auto"
              )}
            >
              <Building aria-hidden />
              {"I'm a Brand"}
            </a>
            <a
              href="#for-artists"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 w-full px-6 text-[0.95rem] sm:w-auto"
              )}
            >
              <Palette aria-hidden />
              {"I'm an Artist"}
            </a>
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Users aria-hidden className="size-4 shrink-0" />
            Two sides of the work, one place to get it made.
          </p>
        </div>

        <aside className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px]"
          />
          <div className="relative p-7 sm:p-9">
            <p className="text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              How the work moves
            </p>
            <ol className="mt-7 flex flex-col divide-y divide-border/70 border-t border-border/70">
              {steps.map((step) => (
                <li key={step.title} className="flex items-start gap-4 py-5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground/70">
                    <step.icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium tracking-tight">
                      {step.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Paths() {
  return (
    <section
      id="paths"
      aria-labelledby="paths-heading"
      className="scroll-mt-24 border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Two ways in
          </p>
          <h2
            id="paths-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Built for both sides of the work.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Whether you commission the work or make it, KeedoHub is built around
            the way professional creative work actually gets produced.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {paths.map((path) => (
            <article
              key={path.id}
              id={path.id}
              className="flex scroll-mt-24 flex-col rounded-2xl border border-border/70 bg-muted/20 p-7 transition-colors hover:border-foreground/15 sm:p-9"
            >
              <p className="w-fit rounded-full border border-border/70 bg-background px-3 py-1 text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {path.chip}
              </p>
              <span className="mt-7 flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground/80">
                <path.icon aria-hidden className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
                {path.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
                {path.copy}
              </p>
              <ul className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6">
                {path.points.map((point) => (
                  <li
                    key={point.label}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <point.icon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-foreground/70"
                    />
                    <span>{point.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div id="top" className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Paths />
      </main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Wordmark />
          <p className="text-sm text-muted-foreground">
            Creative work, done. &copy; {new Date().getFullYear()} KeedoHub
          </p>
        </div>
      </footer>
    </div>
  );
}