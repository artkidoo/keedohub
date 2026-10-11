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

Status labels used throughout this document: **CURRENT** (implemented and in use today), **PLANNED** (decided, not implemented), **IN PROGRESS** (partially implemented / hardening underway).

### Customer Workspace — CURRENT

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

Implemented routes live under `src/app/workspace/[context]/…` (`brand` and `artist` contexts: home, requests, projects, releases, documents, marketing, assets, library, profile, notifications, work). A workspace is provisioned automatically at signup together with its Brand and Artist profiles (`databaseHooks.user.create.after` in `src/domains/auth/server.ts`).

### Private KeedoHub Studio — CURRENT

The Studio is where the production complexity lives: incoming requests, briefs, production jobs, internal quality assurance, creative files, versions, deliverables and delivery. It is private to authorised KeedoHub operators. See the specification for the intended Studio navigation, production queue and production capabilities.

Implemented routes live under `src/app/studio/…` (command centre, customers, requests, projects, production queue + production workspace, review, deliveries, library, settings). Access is **not** decided in the client or by middleware alone: every Studio page and action re-verifies operator status server-side via `requireOperator()` / `resolveOperator()` and fails closed to `notFound()`. Operators are provisioned out-of-band with `npm run studio:operator` (`scripts/studio-operator.mjs`) — never through a product route.

### Brand Experience — CURRENT

Structured brand information ("Brand DNA") collected once and reused in production: company details, description, industry, location, contacts, website, socials, logos, brand colours, typography, visual and imagery style, personality, voice, tone, preferred layouts, references, products and services, value proposition and target audience.

Brand work covers documents (company profile, capability statement, business presentation, proposal, quotation, pitch document, sales presentation, invoice, invoice template, letterhead, business forms, agreements where appropriate, brand guidelines, brand kit, media kit, press kit and future document types), marketing creative (social graphics, social media kits, promotional graphics, product graphics, digital advertising assets, presentations, launch materials, branded content, marketing templates) and projects (company rebrand, company profile, product launch, website creative, social media kit, marketing package, presentation, brand refresh, custom creative projects).

### Artist Experience — CURRENT

Artist identity and releases are managed as structured information: artist/stage name, biography, genre, contacts, socials, streaming links, website, visual identity, colours, creative preferences; and releases (single, EP, album, other types) with title, artist, release type and date, songs, metadata, artwork requirements, streaming information and links.

Release creative packages cover cover artwork, animated cover, motion visual, lyric visual, social graphics, TikTok/Reels assets, YouTube assets, streaming assets, EPK, press assets and promotional assets. **Artists do not design these assets themselves** — KeedoHub produces them.

### Production Workflow — CURRENT

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
| Customer | Request | CURRENT |
| Customer | Project | CURRENT |
| Customer | Review / Approve / Request Changes | CURRENT |
| Customer | Deliverable, Asset, Customer Library | CURRENT |
| KeedoHub | Production Job, Studio, Internal QA, Delivery | CURRENT |

**Verification caveat:** this lifecycle is implemented and covered by unit tests (lifecycle, delivery-state, review-state, status, customer-context) plus live HTTP checks of its boundaries. It has **not** been executed as one continuous browser journey from request to customer download, and it has not been run against real S3 infrastructure. See [`docs/LAUNCH_READINESS.md`](./docs/LAUNCH_READINESS.md).

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
| `better-auth` | 1.7.5 | Email + password authentication, database-backed sessions |
| `drizzle-orm` | 0.45.2 | Schema definition, queries and typed data access |
| `postgres` | 3.4.9 | PostgreSQL driver used by Drizzle |
| `zod` | 3.25.74 | Request and input validation |
| `eslint` + `eslint-config-next` | 9.39.5 / 16.3.5 | Linting |
| `@types/node`, `@types/react`, `@types/react-dom` | `^20`, `^19`, `^19` | Type declarations |
| `drizzle-kit` (dev) | 0.31.10 | Migration generation (`npm run db:generate`) |

Class-merge note: `src/lib/utils.ts` re-exports `cn` from the `cn` package, and components import it from there. `cn` is a `clsx` + `tailwind-merge` replacement with equivalent semantics, so `clsx` and `tailwind-merge` are currently redundant; they remain installed only as part of the shadcn/ui setup.

### CURRENT — implemented subsystems (no extra dependencies)

| Area | Implementation | Notes |
| --- | --- | --- |
| Database | PostgreSQL + Drizzle, 8 versioned migrations in `drizzle/` | `npm run db:migrate` |
| Authentication | Better Auth, email + password, **database-backed** sessions | Sessions resolved server-side on every request; authorization is never decided client-side |
| File storage | Local filesystem **and** S3-compatible providers behind one `StorageProvider` interface (`src/lib/storage/`) | Selected by `STORAGE_PROVIDER`; see [Storage](#storage) |
| Authorization | Operator gate (`src/domains/studio/*`), workspace context gate (`src/domains/workspace/access.ts`) | Both fail closed |
| Security headers | Framework-level headers in `next.config.ts` | See [Security](#security-headers-and-the-health-endpoint) |
| Rate limiting | `src/lib/rate-limit.ts` + Better Auth's own limiter | **Single-instance / in-memory only** — see [Rate limiting](#rate-limiting) |
| Operator provisioning | `npm run studio:operator` (`scripts/studio-operator.mjs`) | Out-of-band, server-side |
| Tests | Node's built-in `node --test` runner with a TypeScript hook (`scripts/register-tests.mjs`) | 18 test files; `npm test` runs 4 of them |

### PLANNED — decided, not installed

| Area | Planned technology | Status |
| --- | --- | --- |
| Distributed rate limiting | Redis / Upstash shared backend behind the existing `RateLimitStore` seam | PLANNED — interface exists in `src/lib/rate-limit.ts`, no backend implemented |
| End-to-end tests | Playwright | PLANNED — not installed, no browser suite exists |
| Unit/integration tests | Vitest | PLANNED — superseded in practice by `node --test`; do not install both |
| Deployment | Hosting target + managed PostgreSQL + secure object storage | PLANNED — nothing deployed |
| Error tracking / monitoring vendor | Not yet chosen | PLANNED — no vendor integrated |
| MFA | Not yet decided | PLANNED — explicitly out of scope so far |

### FUTURE/OPTIONAL

- Background/queue processing for production jobs.
- Image, document and motion processing pipelines.
- Notification delivery channels (email, in-app).
- Antivirus / content sniffing on uploads (current validation is extension- and shape-based).

## Brand Identity

- The only element intentionally carried forward from KeedoHub's existing brand identity is **the brand itself — above all its RED brand colour.**
- The official colour values, palette, typography and component styling were established in the **design-system work in Phase 1** and are applied in `src/app/globals.css`.
- Do not invent a replacement brand palette or restyle the design system outside an approved design task.

## Project Structure

The current repository structure in full — no future folders are implied:

```text
keedohub/
├── AGENTS.md                  # Agent rules regenerated by `next dev`
├── CLAUDE.md                  # Points at AGENTS.md
├── README.md                  # This document
├── KEEDOHUB_MASTER_SPEC.md    # Authoritative product specification
├── docs/
│   └── LAUNCH_READINESS.md    # Launch checklist: verified / needs infra / unverified
├── components.json            # shadcn/ui configuration (style: base-nova, icons: lucide)
├── drizzle.config.ts          # Drizzle-kit configuration
├── drizzle/                   # 8 versioned SQL migrations + meta
├── eslint.config.mjs          # ESLint 9 flat config (next core-web-vitals + typescript)
├── instrumentation.ts         # Server-startup hook: validates storage config (Node runtime only)
├── next.config.ts             # Next.js configuration + framework security headers
├── postcss.config.mjs         # Tailwind v4 PostCSS plugin
├── scripts/
│   ├── register-tests.mjs     # TypeScript resolver hook for `node --test`
│   ├── ts-hooks.mjs           # TypeScript module hook
│   ├── studio-operator.mjs    # Operator provisioning CLI (`npm run studio:operator`)
│   └── _stub-*.mjs            # Next.js module stubs so tests import without a server
├── tsconfig.json              # TypeScript config, `@/*` → `./src/*`
├── package.json               # Scripts and dependencies
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── auth/[...all]/  # Better Auth handler
    │   │   ├── assets/[id]/    # Asset download route (authorized)
    │   │   └── health/         # Liveness probe: `{ ok: true }`
    │   ├── (auth)/             # login, signup
    │   ├── studio/             # Private operator Studio (guarded)
    │   ├── workspace/          # Customer workspace ([context] = brand | artist)
    │   ├── global-error.tsx    # Safe non-technical error screen
    │   ├── layout.tsx          # Root layout: Geist fonts, metadata, body shell
    │   └── page.tsx            # Landing page ("Creative work, done.")
    ├── domains/                # auth, workspace, studio, requests, projects, production,
    │                           #   review, creative, library, releases, dashboard,
    │                           #   profile, notifications, outputs, permissions
    ├── lib/
    │   ├── db/                 # Drizzle client + schema
    │   ├── storage/            # StorageProvider interface, local + S3 providers, startup
    │   ├── rate-limit.ts       # Rate-limit interface + single-instance store
    │   └── log.ts              # Secret/path-redacting server logger
    └── middleware.ts           # Edge session-cookie fast path for /workspace (UX only)
```

**Middleware is not authorization.** `src/middleware.ts` runs on the Edge runtime and only checks whether a session cookie is present, so unauthenticated visitors are redirected to `/login` without a server render. Every protected page and server action re-verifies the session against the database (`requireUser`, `requireWorkspaceContext`, `requireOperator`). A forged or stale cookie gains nothing. Middleware deliberately matches `/workspace/:path*` only; the Studio is protected entirely server-side.

## Development

Requirements: Node.js 20+ (Next.js 16 / shadcn tooling require a current Node LTS) and npm. `package-lock.json` is committed, so npm is the package manager in use.

### Local setup

```bash
# 1. Install dependencies (uses the committed package-lock.json)
npm install

# 2. Create your local environment file — copy the template and fill in the values.
#    .env.example contains placeholders only. Never commit .env.
cp .env.example .env

# 3. Apply database migrations to your local PostgreSQL
npm run db:migrate

# 4. (Optional) Grant yourself operator access to the private Studio
npm run studio:operator -- list
npm run studio:operator -- add you@example.com

# 5. Run the development server (Turbopack) on http://localhost:3000
npm run dev
```

### Required environment variables

All values below are documented as **placeholders** in `.env.example`. Never put real credentials in the repository, and never expose any of these through `NEXT_PUBLIC_*` — every one of them is server-side only.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by Drizzle and Better Auth |
| `BETTER_AUTH_SECRET` | Yes | Session/token secret. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Canonical app origin (cookies, redirects) |
| `AUTH_TRUSTED_ORIGINS` | Production | Comma-separated extra trusted origins; **must be `https:`** in production, otherwise startup fails loudly |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `STORAGE_LOCAL_BASE_DIR` | When `local` | Absolute base directory for the local provider |
| `S3_ENDPOINT` | When `s3` | S3-compatible endpoint (AWS S3, MinIO, Cloudflare R2, …) |
| `S3_REGION` | When `s3` | Region used for SigV4 signing (required even on custom endpoints) |
| `S3_BUCKET` | When `s3` | Private bucket holding KeedoHub assets |
| `S3_ACCESS_KEY_ID` | When `s3` | Server-side credential |
| `S3_SECRET_ACCESS_KEY` | When `s3` | Server-side credential |
| `S3_FORCE_PATH_STYLE` | No | `true` for MinIO-style path addressing |
| `RATE_LIMIT_REDIS_URL` | No | Documented seam for a shared limiter backend. **Not implemented** — setting it changes nothing today |

### Commands

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm install` | Uses the committed `package-lock.json` |
| Run the development server | `npm run dev` | Turbopack dev server on http://localhost:3000 |
| Lint | `npm run lint` | Runs `eslint` with the flat config in `eslint.config.mjs` |
| Type check | `npx tsc --noEmit` | There is no `typecheck` script in `package.json`; use this command directly |
| Production build | `npm run build` | `next build`; also runs TypeScript |
| Serve the production build | `npm run start` | `next start`, after a successful build |
| Run the test suite | `npm test` | `node --test` — see [Testing](#testing) |
| Generate a migration | `npm run db:generate` | Drizzle-kit |
| Apply migrations | `npm run db:migrate` | Drizzle-kit |
| Manage Studio operators | `npm run studio:operator` | `list` / `add` / `revoke` / `restore` |

Additional notes:

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
| 1 | Foundation | Application foundation, authentication, database, API foundation, file storage, permissions, unified customer workspace, brand profile, artist profile, design system, navigation foundation. No complex production engines yet. | COMPLETE |
| 2 | Customer Experience | Brand and artist dashboards, documents, marketing, assets, releases, projects, requests, profile management, notifications, customer library. | COMPLETE |
| 3 | Production Workflow | Requests, projects, production jobs, deliverables, versions, reviews, approvals, deliveries, notifications, customer-to-production connection, complete request → delivery lifecycle. | COMPLETE |
| 4 | Private KeedoHub Studio | Studio authorisation, command center, customers, requests, projects, production queue, production workspace, internal production capabilities, QA, review, delivery, internal library. | COMPLETE — accepted with documented verification gaps (see [Testing](#testing)) |
| 5 | Hardening + Launch | Security, authorisation and data-isolation audits, file security, performance, responsive behaviour, accessibility, error handling, logging, backups, monitoring, deployment, E2E tests, UX polish, production readiness. | IN PROGRESS — **not launched**. 5.2A storage init, 5.2B security headers/auth/health/rate limiting and 5.2C verification are implemented and uncommitted; deployment, infrastructure and browser verification remain open. See [`docs/LAUNCH_READINESS.md`](./docs/LAUNCH_READINESS.md) |

Each phase has an objective, capabilities, security expectations, UX expectations, technical expectations and acceptance criteria in [`KEEDOHUB_MASTER_SPEC.md`](./KEEDOHUB_MASTER_SPEC.md) (sections 28 and 29).

## Current Status

**CURRENT — what exists today**

- A Next.js 16 application (App Router, `src/` directory, TypeScript strict mode) with a landing page, public login/signup, a customer workspace and a private operator Studio.
- PostgreSQL + Drizzle ORM with 8 versioned migrations (`npm run db:migrate`).
- Better Auth email + password authentication with **database-backed** sessions; workspace, brand and artist profiles are provisioned at signup.
- A unified customer workspace with `brand` and `artist` contexts: requests, projects, releases, documents, marketing, assets, library, profile, notifications, work review.
- The full production lifecycle: request → project → production job → creative production → internal QA → customer review → revision → approval → delivery → customer library.
- The private KeedoHub Studio: command centre, customers, requests, projects, production queue and production workspace, review, deliveries, library, settings. Operator-gated server-side; provisioned out-of-band.
- File storage behind one `StorageProvider` interface with local-filesystem and S3-compatible implementations, plus fail-fast startup validation.
- Framework-level security headers, a `/api/health` liveness probe, `global-error.tsx`, and a secret-redacting server logger.
- 18 test files; `npm test` runs a focused subset. No CI, no E2E runner.
- `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm test` all pass.

**NOT BUILT YET — do not assume any of the following exists**

- **Nothing is deployed.** No hosting target, no managed PostgreSQL, no object-storage bucket.
- No database backups, point-in-time recovery or tested restore procedure.
- No distributed rate limiting (the limiter is single-instance/in-memory).
- No monitoring, alerting or error-tracking vendor.
- No end-to-end browser suite: no Playwright, and therefore no executed responsive, accessibility or keyboard checks.
- No continuous integration pipeline.
- No antivirus or content-type sniffing on uploads (validation is extension- and shape-based).
- No MFA.
- Two-customer cross-tenant traffic has not been executed with two real sessions; isolation is verified at the code and unit-test level and at the forged-id boundary level.

**The product is not launch-ready.** See [`docs/LAUNCH_READINESS.md`](./docs/LAUNCH_READINESS.md) for the verified/unverified split.

## Storage

All file I/O goes through one interface in `src/lib/storage/`, so authorization, key validation, file limits, content handling and cleanup/compensation logic are identical regardless of provider.

| Provider | Selected by | Status |
| --- | --- | --- |
| Local filesystem | `STORAGE_PROVIDER=local` (default) | For development only. Hosted-platform disk is ephemeral — do not use it in production. |
| S3-compatible | `STORAGE_PROVIDER=s3` | AWS S3, MinIO, Cloudflare R2 and other SigV4-compatible endpoints. Path-style addressing via `S3_FORCE_PATH_STYLE=true`. |

**Fail-fast behaviour (Phase 5.2A).** When `STORAGE_PROVIDER=s3`, `initStorageFromEnv()` in `src/lib/storage/startup.ts` requires every `S3_*` variable. A missing or malformed value throws at startup with a message naming the missing variable and stops the boot — **production never silently falls back to local disk**. It runs from `instrumentation.ts`, guarded by `process.env.NEXT_RUNTIME === "nodejs"` so it is not evaluated in the Edge runtime. No credentials, signed URLs or raw object paths are logged, and none of these variables is exposed to client components.

All S3 variables are server-side only. None uses `NEXT_PUBLIC_*`.

## Security headers and the health endpoint

Set once at the framework level in `next.config.ts` (`headers()`), so they apply to every response including redirects and errors:

| Header | Value | Notes |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Always |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No path/query leakage across origins |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Denies APIs KeedoHub never uses |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | **Production only** — deliberately never sent over plain HTTP in development |

**Content Security Policy: intentionally not set globally.** The Studio asset preview route already pins its own strict policy (`default-src 'none'; sandbox`) because it serves arbitrary user-uploaded content, and Next.js emits inline scripts that a single naive global policy would break. A global CSP is an open launch item, not an oversight — do not add one without testing auth, Studio previews and every page.

`GET /api/health` (`src/app/api/health/route.ts`) returns exactly `{"ok":true}` with status 200. It deliberately reports no version strings, dependency states, paths or infrastructure details. There is no database check today, so a saturated database cannot flap this probe.

`src/app/global-error.tsx` renders a safe non-technical screen for uncaught errors with no error message and no stack trace. Server-side logging goes through `src/lib/log.ts` (`logServerError`), which redacts credential-shaped strings, URLs and filesystem paths and truncates the payload.

## Rate limiting

Two independent layers are active:

1. **Better Auth's own limiter** on sign-in/sign-up (`rateLimit: { enabled: true }` in `src/domains/auth/server.ts`). This was verified live: requests returned `429` after a small burst. It is enabled explicitly — do not assume a library default.
2. **Application-level limiting** in `src/lib/rate-limit.ts`, wired into the sensitive mutations that are not auth routes: production output uploads and review decisions (`src/domains/production/actions.ts`, `src/domains/review/actions.ts`).

**Important limitation — read this before scaling.** Both limiters are **single-instance / in-memory only**. `MemoryRateLimitStore` keeps its sliding window in a `Map` inside one Node process. If KeedoHub is deployed to multiple server instances or a serverless fleet, each instance enforces its own budget and the effective limit multiplies by the instance count.

`RATE_LIMIT_REDIS_URL` is documented in `.env.example` as the seam for a shared backend (Redis/Upstash) implementing the same `RateLimitStore` interface. **It is not implemented: setting it changes nothing today.** Do not describe rate limiting as distributed until a shared backend is actually wired and tested.

Failure behaviour is **fail-OPEN**: if a limiter errors, the request is allowed and the bypass is logged, so a limiter outage can never lock every user out. The underlying authorization checks always still run.

## Testing

```bash
npm test          # focused suite (storage, security, access boundaries, file validation)
npx tsc --noEmit  # type check
npm run lint      # ESLint
npm run build     # production build
```

Tests use Node's built-in `node --test` runner with a TypeScript resolver hook (`scripts/register-tests.mjs`) and small Next.js module stubs (`scripts/_stub-*.mjs`), so they import real product modules without starting a server or touching a database. `npm test` runs four files covering 24 assertions: `src/lib/storage/startup.test.ts`, `src/lib/security.test.ts`, `src/lib/access-boundaries.test.ts` and `src/domains/production/file-validation.test.ts`.

**What these tests do NOT prove.** Read this before trusting them:

- They do not exercise a real S3 bucket. Storage is verified with mocks: provider selection, missing-configuration failure and signature construction. No live read/write against real infrastructure has ever run.
- They do not exercise a real database. Access boundaries are tested through pure functions and rejected-request paths, not through seeded multi-customer rows.
- They do not prove **two-customer isolation over real traffic**. Forged/absent identifiers are rejected, but no test drives two live sessions against each other's real resources.
- They do not prove the full request → review → approval → delivery journey as one flow.
- They do not test responsive layout, accessibility or keyboard navigation. **Playwright is not installed**; no browser suite exists and none of these checks has been executed.
- They do not test production HTTPS, HSTS or CSP under a real TLS response — header presence was verified in development only.
- They do not test distributed rate limiting (not implemented) or backups/restore (no infrastructure).
- The other 14 `*.test.ts` files in `src/domains/**` are pure-logic suites (brief, checklist, lifecycle, delivery-state, review-state, status, …) and are **not** currently wired into `npm test`.

## Deployment

**Nothing is deployed.** There is no hosting account, no managed PostgreSQL instance, no object-storage bucket, no CI pipeline and no production environment variables configured. The application has only ever run on a local development server against a local PostgreSQL instance.

Required before any public launch (full checklist in [`docs/LAUNCH_READINESS.md`](./docs/LAUNCH_READINESS.md)):

1. Choose and configure a hosting target with separate development / preview / production environments.
2. Provision managed PostgreSQL with automated backups and point-in-time recovery, and **perform one test restore**.
3. Provision a private S3-compatible bucket and run a real integration test against it.
4. Decide on and, if needed, implement distributed rate limiting.
5. Add monitoring, alerting and error tracking.
6. Verify production HTTPS, origins, cookies and headers against a real response.
7. Run two-customer isolation tests and the full operator authorization matrix.
8. Execute the complete customer journey in a browser, including responsive checks at 390×844, 768×1024 and 1440×900, plus keyboard and accessibility checks.
9. Write a deployment and recovery runbook.

## Documentation

| Document | Purpose |
| --- | --- |
| `README.md` | Repository overview, setup, commands, rules and status |
| `KEEDOHUB_MASTER_SPEC.md` | Authoritative product, domain, security, design and roadmap specification |
| `docs/LAUNCH_READINESS.md` | Launch checklist: verified locally / requires infrastructure / requires verification / required before public launch |

## License

Private and proprietary. Not open source.


