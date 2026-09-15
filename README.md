# KeedoHub

**A Creative Production OS for brands, artists and creative work.**

KeedoHub is where a brand or an artist requests professional creative work — and KeedoHub produces it. The customer supplies their identity, information, requirements, brief, references and feedback. KeedoHub handles the professional creative production internally and returns finished, ready-to-use work to the customer's library.

**The customer never has to become a designer.**

---

## What KeedoHub Is

KeedoHub is a **Creative Production OS**: a production system behind a deliberately simple customer experience.

- **Production-first, not tool-first.** Customers ask for outcomes ("I need my company profile", "I am releasing a new single"), not for an editor.
- **One customer workspace.** A customer has a single unified workspace. Brand and artist are contexts inside that workspace, not separate applications.
- **A private production side.** Real production complexity lives in the private KeedoHub Studio, which is initially available only to the owner and authorised KeedoHub operators.
- **A clear path from request to delivery.** Request → review → approval → delivery → customer library.
- **Not a design tool.** KeedoHub produces the work; it does not ask customers to compose the work themselves.

The authoritative product specification is [`KEEDOHUB_MASTER_SPEC.md`](./KEEDOHUB_MASTER_SPEC.md).

## Core Promise

> **"KeedoHub is where brands and artists come to get their creative work done."**

The current public landing page expresses the same promise:

| Element | Copy |
| --- | --- |
| Headline | **Creative work, done.** |
| Supporting line | KeedoHub helps brands and artists get professional creative work produced — a clear brief in, finished creative work out. |

## Product Model

### Customer Workspace — PLANNED

One unified workspace per customer, covering both brand and artist contexts. The customer experience is limited to:

- requesting work
- providing information
- reviewing work
- approving work
- receiving finished deliverables
- accessing documents
- accessing assets
- tracking projects
- communicating feedback

There is no customer-facing canvas editor, design surface, or visual generator. Internal complexity must never leak into the customer UI.

### Private KeedoHub Studio — PLANNED

The Studio is where the production complexity lives: incoming requests, briefs, production jobs, internal quality assurance, creative files, versions, deliverables and delivery. It is private to authorised KeedoHub operators. See the specification for the intended Studio navigation, production queue and production capabilities.

### Brand Experience — PLANNED

Structured brand information ("Brand DNA") collected once and reused in production: company details, description, industry, location, contacts, website, socials, logos, brand colours, typography, visual and imagery style, personality, voice, tone, preferred layouts, references, products and services, value proposition and target audience.

Brand work covers documents (company profile, capability statement, business presentation, proposal, quotation, pitch document, sales presentation, invoice, invoice template, letterhead, business forms, agreements where appropriate, brand guidelines, brand kit, media kit, press kit and future document types), marketing creative (social graphics, social media kits, promotional graphics, product graphics, digital advertising assets, presentations, launch materials, branded content, marketing templates) and projects (company rebrand, company profile, product launch, website creative, social media kit, marketing package, presentation, brand refresh, custom creative projects).

### Artist Experience — PLANNED

Artist identity and releases are managed as structured information: artist/stage name, biography, genre, contacts, socials, streaming links, website, visual identity, colours, creative preferences; and releases (single, EP, album, other types) with title, artist, release type and date, songs, metadata, artwork requirements, streaming information and links.

Release creative packages cover cover artwork, animated cover, motion visual, lyric visual, social graphics, TikTok/Reels assets, YouTube assets, streaming assets, EPK, press assets and promotional assets. **Artists do not design these assets themselves** — KeedoHub produces them.

### Production Workflow — PLANNED

```text
Customer Request
  → Request Validation
  → Project Creation
  → Production Job
  → KeedoHub Studio
  → Creative Production
  → Internal QA
  → Customer Review
  → Revision if needed
  → Approval
  → Delivery
  → Customer Library
```

| Layer | Concept | Status |
| --- | --- | --- |
| Customer | Request | PLANNED |
| Customer | Project | PLANNED |
| Customer | Review / Approve / Request Changes | PLANNED |
| Customer | Deliverable, Asset, Customer Library | PLANNED |
| KeedoHub | Production Job, Studio, Internal QA, Delivery | PLANNED |

## Product Principles

1. **Simple for customers.** The customer experience stays minimal and legible.
2. **Powerful for KeedoHub internally.** Depth belongs behind the scenes, in the Studio.
3. **Production-first rather than tool-first.** The platform produces work; it does not hand customers a tool.
4. **Outcome-focused rather than editor-focused.** The unit of value is a finished deliverable, not a canvas.
5. **Professional creative work rather than DIY design.** Output quality is a KeedoHub responsibility.
6. **One unified customer workspace.** Brand and artist are contexts within one workspace, not separate products.
7. **Strong data isolation.** Customers, workspaces and brand/artist contexts are isolated from each other.
8. **Clear workflow from request to delivery.** Every project has an explicit, visible state.
9. **Beautiful presentation of creative work.** Documents, artwork, assets and previews are presented as finished work.
10. **Internal complexity never leaks into the customer UI.** No engine, system or pipeline vocabulary in front of customers.

## Technology

Technology is listed only if it is actually present in this repository. Status labels are used throughout: **CURRENT** (installed and in use today), **PLANNED** (decided, not installed), **FUTURE/OPTIONAL** (candidate, subject to change).

### CURRENT — installed dependencies

| Package | Version | Role |
| --- | --- | --- |
| `next` | 16.3.5 | Application framework (App Router, server rendering, Turbopack builds) |
| `react` / `react-dom` | 19.2.8 | UI runtime |
| `typescript` | 5.9.3 | Language and type checking |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 | Styling engine (Tailwind v4, CSS-first configuration) |
| `shadcn` | 4.21.0 | Component CLI and registry tooling |
| `@base-ui/react` | 1.8.0 | Unstyled accessible component primitives |
| `class-variance-authority` | 0.7.1 | Variant styling (used by `src/components/ui/button.tsx`) |
| `cn` | 0.3.0 | Tailwind class merging engine used across components |
| `lucide-react` | 1.46.0 | Icon set |
| `tw-animate-css` | 1.4.0 | Animation utilities imported in `globals.css` |
| `clsx` | 2.1.1 | Installed with the shadcn/ui setup; not imported directly in `src/` |
| `tailwind-merge` | 3.7.0 | Installed with the shadcn/ui setup; not imported directly in `src/` |
| `eslint` + `eslint-config-next` | 9.39.5 / 16.3.5 | Linting |
| `@types/node`, `@types/react`, `@types/react-dom` | `^20`, `^19`, `^19` | Type declarations |

Class-merge note: `src/lib/utils.ts` re-exports `cn` from the `cn` package, and components import it from there. `cn` is a `clsx` + `tailwind-merge` replacement with equivalent semantics, so `clsx` and `tailwind-merge` are currently redundant; they remain installed only as part of the shadcn/ui setup.

### PLANNED — decided, not installed

Nothing in this list exists in the repository today. No configuration, schemas, migrations, clients or environment variables for these have been created.

| Area | Planned technology | Status |
| --- | --- | --- |
| Database | PostgreSQL | PLANNED |
| ORM / schema | Drizzle ORM | PLANNED |
| Validation | Zod | PLANNED |
| Authentication | Better Auth or another production-grade provider | PLANNED |
| File storage | S3-compatible object storage | PLANNED |
| Unit/integration tests | Vitest | PLANNED |
| End-to-end tests | Playwright | PLANNED |
| Deployment | Vercel + managed PostgreSQL + secure object storage | PLANNED |

### FUTURE/OPTIONAL

- Background/queue processing for production jobs.
- Image, document and motion processing pipelines.
- Notification delivery channels (email, in-app).

## Brand Identity

- The only element intentionally carried forward from KeedoHub's existing brand identity is **the brand itself — above all its RED brand colour.**
- The official colour values (and the full palette, typography and component styling) are established in the **design-system work in Phase 1**. They are not defined yet.
- Until then: **do not invent a replacement brand palette.** The neutral tokens currently in `src/app/globals.css` are the shadcn/ui base tokens used as a placeholder so that the official identity can be applied later without redesigning the screens.
- The current landing page is deliberately restrained and neutral for this reason.

## Project Structure

The current repository structure in full — no future folders are implied:

```text
keedohub/
├── AGENTS.md                  # Agent rules regenerated by `next dev`
├── CLAUDE.md                  # Points at AGENTS.md
├── README.md                  # This document
├── KEEDOHUB_MASTER_SPEC.md    # Authoritative product specification
├── components.json            # shadcn/ui configuration (style: base-nova, icons: lucide)
├── eslint.config.mjs          # ESLint 9 flat config (next core-web-vitals + typescript)
├── next.config.ts             # Next.js configuration (currently empty)
├── postcss.config.mjs         # Tailwind v4 PostCSS plugin
├── tsconfig.json              # TypeScript config, `@/*` → `./src/*`
├── package.json               # Scripts and dependencies
├── public/                    # Default starter SVGs (unused by the landing page)
└── src/
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css        # Tailwind import, theme tokens, base layer
    │   ├── layout.tsx         # Root layout: Geist fonts, metadata, body shell
    │   └── page.tsx           # Landing page ("Creative work, done.")
    ├── components/
    │   └── ui/
    │       └── button.tsx     # shadcn/ui Button (Base UI primitive + cva variants)
    └── lib/
        └── utils.ts           # Re-exports `cn`
```

Not present today: `src/domains/`, `src/services/`, route groups, API routes, middleware, database layer, authentication, storage integration, tests, CI, environment files.

## Development

Requirements: Node.js 20+ (Next.js 16 / shadcn tooling require a current Node LTS) and npm. `package-lock.json` is committed, so npm is the package manager in use.

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm install` | Uses the committed `package-lock.json` |
| Run the development server | `npm run dev` | Turbopack dev server on http://localhost:3000 |
| Lint | `npm run lint` | Runs `eslint` with the flat config in `eslint.config.mjs` |
| Type check | `npx tsc --noEmit` | There is no `typecheck` script in `package.json`; use this command directly |
| Production build | `npm run build` | `next build`; also runs TypeScript and prerenders `/` |
| Serve the production build | `npm run start` | `next start`, after a successful build |

Additional notes verified against `package.json`:

- The only scripts defined are `dev`, `build`, `start` and `lint`. There is no test script yet.
- Add shadcn/ui components with `npx shadcn@latest add <component>` (the `shadcn` CLI is installed).
- `npx tsc --noEmit` writes `tsconfig.tsbuildinfo` because `incremental` is enabled in `tsconfig.json`; that file is gitignored.

## Development Rules

1. **Fresh architecture only.** This repository is a new build. Do not import, copy, migrate or reference code, routes, components, schemas, database models, APIs, terminology, navigation or concepts from any previous system.
2. **No legacy imports.** No legacy routes, no legacy modules, no legacy naming, no compatibility shims for earlier products.
3. **No campaign architecture.** KeedoHub is not a campaign-management platform; do not add campaign builders, campaign entities or campaign terminology.
4. **No customer-facing design editor.** No canvas editor, no layer tooling, no DIY cover-art or graphics editor for customers. KeedoHub produces the work.
5. **Strict data isolation.** Customer data is isolated between customers, workspaces and brand/artist contexts. Isolation is enforced at the data and file layers, never by UI-only checks.
6. **Production-first approach.** Model work as requests, projects, production jobs, deliverables and approvals — not as editable design surfaces.
7. **Do not introduce unnecessary complexity.** One well-structured application, clear domain boundaries, no microservices, no speculative abstraction, no technology that is not yet needed.
8. **Respect phase boundaries.** Build only what the current phase in the roadmap requires; do not scaffold later phases ahead of time.
9. **Keep customer language simple.** Internal vocabulary stays inside the Studio. See the terminology rules in the specification.
10. **Keep this document honest.** Documentation must reflect what exists. Never describe planned work as finished.

## Five-Phase Roadmap

The roadmap has exactly five phases. There is no sixth phase.

| Phase | Name | Focus | Status |
| --- | --- | --- | --- |
| 1 | Foundation | Application foundation, authentication, database, API foundation, file storage, permissions, unified customer workspace, brand profile, artist profile, design system, navigation foundation. No complex production engines yet. | PLANNED |
| 2 | Customer Experience | Brand and artist dashboards, documents, marketing, assets, releases, projects, requests, profile management, notifications, customer library. | PLANNED |
| 3 | Production Workflow | Requests, projects, production jobs, deliverables, versions, reviews, approvals, deliveries, notifications, customer-to-production connection, complete request → delivery lifecycle. | PLANNED |
| 4 | Private KeedoHub Studio | Studio authorisation, command center, customers, requests, projects, production queue, production workspace, internal production capabilities, QA, review, delivery, internal library. | PLANNED |
| 5 | Hardening + Launch | Security, authorisation and data-isolation audits, file security, performance, responsive behaviour, accessibility, error handling, logging, backups, monitoring, deployment, E2E tests, UX polish, production readiness. | PLANNED |

Each phase has an objective, capabilities, security expectations, UX expectations, technical expectations and acceptance criteria in [`KEEDOHUB_MASTER_SPEC.md`](./KEEDOHUB_MASTER_SPEC.md) (sections 28 and 29).

## Current Status

**CURRENT — what exists today**

- A fresh Next.js 16 application (App Router, `src/` directory, TypeScript strict mode).
- TypeScript, ESLint, Tailwind CSS v4 and shadcn/ui configured and working.
- One shadcn/ui component: `Button` (Base UI primitive with `cva` variants), plus the `cn` helper.
- A single landing page at `/` presenting the product name, the headline "Creative work, done.", the supporting line and the two audience actions ("I'm a Brand", "I'm an Artist").
- Root layout with Geist fonts, `KeedoHub` metadata and the neutral design tokens in `globals.css`.
- Documentation: this README and the master specification.
- `npm run lint`, `npx tsc --noEmit` and `npm run build` all pass.

**NOT BUILT YET — do not assume any of the following exists**

- No authentication.
- No database, ORM, migrations or schemas.
- No API routes or server actions.
- No file storage integration.
- No production workflow (no requests, projects, production jobs, deliverables, reviews, deliveries).
- No KeedoHub Studio.
- No customer workspace, dashboards, brand or artist profiles.
- No notifications, libraries, or asset handling.
- No tests and no CI.

The current build corresponds to **Phase 1 having just begun**: only the application foundation and the first public screen exist.

## Documentation

| Document | Purpose |
| --- | --- |
| `README.md` | Repository overview, setup, commands, rules and status |
| `KEEDOHUB_MASTER_SPEC.md` | Authoritative product, domain, security, design and roadmap specification |

## License

Private and proprietary. Not open source.


