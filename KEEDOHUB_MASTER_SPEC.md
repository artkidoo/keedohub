# KeedoHub — Master Specification

> **What this document is.** The authoritative source of truth for KeedoHub's product definition, domain model, security expectations, design direction and implementation roadmap. When implementation and this document disagree, one of them is defective; resolve the disagreement explicitly and update this document.
>
> **Who it is for.** Human developers and AI coding agents. A coding agent must be able to work from this document alone. It is written so that no prior product, repository or design archive needs to be inspected to understand KeedoHub.

| Field | Value |
| --- | --- |
| Product | KeedoHub |
| Document | Master specification (source of truth) |
| Version | 1.0 |
| Applies to | This repository (`keedohub`) |
| Product class | Creative Production OS for brands, artists and creative work |
| Brand colour | **RED** — official values are defined in the later design-system phase; no substitute palette is to be invented |
| Implementation phases | Exactly five (see §28) |

## Status labels used in this document

| Label | Meaning |
| --- | --- |
| **CURRENT** | Exists in this repository today and works. |
| **PLANNED** | Decided and committed; will be built in the phase named here. Nothing exists yet. |
| **FUTURE/OPTIONAL** | Candidate capability. Not committed. Requires a deliberate decision recorded in this document before any work starts. |

Non-negotiable documentation rules:

1. Never describe PLANNED or FUTURE/OPTIONAL work as if it exists.
2. Never build FUTURE/OPTIONAL items without first recording the decision here.
3. This document authorises no database, authentication, API, storage or production code outside the phase that owns it.
4. Customer-facing terminology rules (§24) are absolute.

---

## 1. Product vision

**KEEDOHUB is a Creative Production OS for Brands, Artists & Creative Work.** *(PLANNED as a system; CURRENT as positioning.)*

The founding constraint is simple: **the customer should not have to become a designer.** A customer provides identity, information, requirements, a brief, references and feedback. KeedoHub performs the professional creative production and returns finished work.

There are two major experiences:

1. **CUSTOMER WORKSPACE** — the customer's single, unified place to request work, provide information, review, approve and receive finished deliverables.
2. **PRIVATE KEEDOHUB STUDIO** — where production complexity lives. Initially private, available only to the owner and authorised KeedoHub operators.

**These are not two separate products.** The customer has one workspace. Brand and Artist are experiences and contexts *inside* that workspace, not separate applications. The Studio is the internal production counterpart that serves the same workspace.

**The unit of value is finished work**, not a tool, canvas or subscription to a design surface.

---

## 2. Core promise

> **"KeedoHub is where brands and artists come to get their creative work done."**

Current public expression (CURRENT on the landing page at `/`):

| Element | Copy |
| --- | --- |
| Headline | **Creative work, done.** |
| Supporting line | KeedoHub helps brands and artists get professional creative work produced — a clear brief in, finished creative work out. |
| Audience actions | "I'm a Brand" and "I'm an Artist" |

What the promise commits KeedoHub to:

- The customer arrives with a need, not with finished artwork.
- The customer is never required to learn design software, compose layouts or produce files.
- KeedoHub owns production quality, sequence and delivery.
- Every request has a visible state and an unambiguous end point: approved work delivered into the customer's library.

## 3. Product principles

These principles are the tie-breakers for design and engineering decisions. When two options conflict, the option that satisfies the higher-numbered-and-earlier-listed principle is not automatically preferred — the conflict must be resolved in favour of the principle most at risk of violation, and the decision recorded.

| # | Principle | Operational meaning |
| --- | --- | --- |
| 1 | Simple for customers | The customer UI is small, calm and legible. Fewer screens, clear language, no configuration burden. |
| 2 | Powerful for KeedoHub internally | Capability depth is allowed in the Studio, where it is needed to produce professional work at speed. |
| 3 | Production-first rather than tool-first | Model work as production (jobs, deliverables, versions), never as user-authored design surfaces. |
| 4 | Outcome-focused rather than editor-focused | Each customer surface answers "what work did I get", not "what can I edit". |
| 5 | Professional creative work rather than DIY design | KeedoHub is accountable for the finished artefact. Templates alone are not the product. |
| 6 | One unified customer workspace | Brand and artist are contexts inside one workspace. Never fork into separate applications. |
| 7 | Strong data isolation | Customers, workspaces and brand/artist contexts are isolated at the data and file layers. |
| 8 | Clear workflow from request to delivery | Every request and project has an explicit state, visible to the right party, at all times. |
| 9 | Beautiful presentation of creative work | Deliverables, artwork and documents are presented as finished work: large previews, correct metadata, correct formats. |
| 10 | Internal complexity never leaks into the customer UI | No engine, pipeline, queue or system vocabulary in front of customers (§24). |

---

## 4. Customer experience

### 4.1 What the customer does (PLANNED)

The customer experience is restricted to nine activities and nothing else:

1. Requesting work.
2. Providing information (identity, requirements, brief, references).
3. Reviewing work.
4. Approving work.
5. Receiving finished deliverables.
6. Accessing documents.
7. Accessing assets (their own uploads and their delivered files).
8. Tracking projects.
9. Communicating feedback.

### 4.2 What the customer must never be asked to do

- Compose layouts, edit on a canvas, manage layers, or build artwork.
- Operate design, image, motion or document production tools.
- Understand internal production stages, tooling, prompts, pipelines or job queues.
- Learn internal vocabulary (§24).
- Re-enter the same brand or artist information repeatedly: structured profile data ("Brand DNA" / artist identity) is captured once and reused in production.

### 4.3 The four dashboard questions (PLANNED)

The customer dashboard must answer four questions immediately, without navigation or interpretation:

| # | Question | Required surface |
| --- | --- | --- |
| 1 | What has KeedoHub created for me? | Delivered work: recent deliverables and items in the library. |
| 2 | What is currently being worked on? | Active projects and their current stage, in customer language. |
| 3 | What needs my review? | Items awaiting the customer's decision, with a clear action (Approve / Request Changes). |
| 4 | What can I request? | Clear entry points to start a request, expressed in outcomes ("Company profile", "New single release"). |

If a dashboard design does not answer all four at a glance, it is not finished.

### 4.4 Experience quality bar (PLANNED)

- Every list has a deliberate empty state and a deliberate loading state; no blank screens, no spinners without context.
- Every action has a visible result (state change, confirmation, or a clear next step).
- Creative work is shown at a size and quality that lets the customer judge it (documents, artwork, motion).
- Review decisions are unambiguous: **Approve**, or **Request Changes** with written feedback.
- The customer is never shown a state that implies work progressed when it has not (for example, "Delivered" before delivery occurs).

### 4.5 Brand vs artist inside one experience (PLANNED)

| Aspect | Brand context | Artist context |
| --- | --- | --- |
| Identity object | Brand Profile / Brand DNA | Artist Profile / artist identity |
| Primary recurring subject | Documents and marketing work | Releases and release creative |
| Primary project driver | Company, product or marketing need | A release or a promo cycle |
| Shared surfaces | Requests, projects, reviews, deliverables, assets, library, notifications | Same surfaces, artist-relevant labels |

The two contexts share the same workspace, the same request/project machinery and the same review and delivery model. Differences are limited to profile fields, request categories and the wording used to describe recurring items ("My Releases" versus "My Documents").

## 5. Unified Workspace model

### 5.1 Definition (PLANNED)

A **Workspace** is the single container for one customer's identity, contexts, requests, projects, deliverables, assets and library. A customer has exactly one workspace.

```text
User
  → Workspace                     (one per customer; the unit of data isolation)
      → Brand Context             (zero or more)
      → Artist Context            (zero or more)
          → Requests
              → Projects
                  → Production Jobs
                      → Deliverables
                          → Assets
                              → Reviews
                                  → Deliveries
```

Rules:

1. **One workspace per customer.** Brand and artist contexts live inside it.
2. **Brand and artist are contexts, not applications.** They are not separate products, separate logins, separate dashboards or separate data silos (unless a future decision explicitly requires otherwise and is recorded here).
3. **Workspace is the isolation boundary.** Every query, file access and authorisation check is scoped by workspace first, then by context (§20).
4. **Contexts share machinery.** Request, project, review, delivery and library behaviour is defined once and reused with context-appropriate labels and categories.
5. **A workspace may have no context yet.** Onboarding must allow a customer to create their first brand or artist context without dead ends.

### 5.2 Context switching (PLANNED)

- The customer can see which context they are acting in at all times.
- Switching context changes the visible subjects (documents vs releases), not the fundamental layout or navigation model.
- Cross-context leakage is a defect: work created in one context must never appear as belonging to another.

### 5.3 Conceptual entities (PLANNED)

Core chain, in order:

```text
User → Workspace → Brand/Artist Context → Request → Project
     → Production Job → Deliverable → Asset → Review → Delivery
```

Supporting entities: version, comment/feedback thread, notification, library item, profile/Brand DNA record, release record, reference file.

---

## 6. Brand experience

### 6.1 Brand Profile → Brand DNA (PLANNED)

The customer maintains a structured Brand Profile. The structured result is referred to internally as **Brand DNA**: the reusable identity and context that KeedoHub uses when producing work. The term "Brand DNA" is internal; the customer sees a normal profile screen (§24).

Fields to support:

| Group | Fields |
| --- | --- |
| Identity | Company/business name; legal name where relevant; description |
| Classification | Industry/category |
| Location | Location; address |
| Contact | Contact information; website; social links |
| Visual identity | Logo; secondary logos; brand colours; typography; visual style; imagery style; preferred layouts |
| Expression | Personality; voice; tone |
| References | References (inspiration and reference material) |
| Offering | Products/services; value proposition |
| Audience | Target audience |
| Extra | Other useful brand information |

Rules:

- Profile data is captured once and reused. The customer must not be asked for the same item repeatedly across projects.
- Fields must be optional unless a specific production capability genuinely requires them; optionality is enforced by validation that explains itself.
- Uploaded identity files (logos, references) are stored as assets (§12) and referenced by the profile.

### 6.2 Brand documents (PLANNED)

Types to support, extended over time: Company Profile, Capability Statement, Business Presentation, Proposal, Quotation, Pitch Document, Sales Presentation, Invoice, Invoice Template, Letterhead, Business Forms, Agreements where appropriate, Brand Guidelines, Brand Kit, Media Kit, Press Kit, and future document types.

### 6.3 Brand marketing work (PLANNED)

Social graphics, social media kits, promotional graphics, product graphics, digital advertising assets, presentations, launch materials, branded content, marketing templates, and other professional creative deliverables.

### 6.4 Brand projects (PLANNED)

Company Rebrand, Company Profile, Product Launch, Website Creative, Social Media Kit, Marketing Package, Presentation, Brand Refresh, and custom creative projects.

### 6.5 Brand requests (PLANNED)

Request categories a brand can start: document, marketing assets, social content, presentation, brand asset, new project, and other creative work. Each category maps to one or more production jobs (§10) and a project type (§9).

## 7. Artist experience

### 7.1 Artist Profile → artist identity (PLANNED)

Fields to support:

| Group | Fields |
| --- | --- |
| Identity | Artist/stage name; biography |
| Classification | Genre |
| Contact | Contact; website; socials |
| Listening | Streaming links |
| Visual identity | Visual identity; colours |
| Creative preference | Creative preferences |
| Other | Relevant artist identity information |

As with brands, the structured result is the artist context KeedoHub uses when producing work. The customer sees a profile screen, not an "identity system".

### 7.2 Artist Releases (PLANNED)

A **Release** is the recurring subject for artists, analogous to a document need for brands. Supported release types: single, EP, album, other release types.

Release fields: title, artist, release type, release date, songs, metadata, artwork requirements, streaming information, links.

### 7.3 Release creative packages (PLANNED)

Work that can be produced for a release: Cover Artwork, Animated Cover, Motion Visual, Lyric Visual, Social Graphics, TikTok/Reels assets, YouTube assets, Streaming assets, EPK, Press Assets, Promotional Assets, and other release creative.

### 7.4 Artists do not design their assets — absolute rule

There must be **no customer-facing**:

- Photoshop clone
- Canva clone
- canvas editor
- complicated visual generator
- cover-art editor

**KeedoHub produces the work.** The artist supplies identity, release information, requirements, references and feedback, then reviews and approves. Any proposal to add an artist-facing design surface is a violation of the product definition and must be refused or escalated as a product decision recorded in §30.

### 7.5 Artist projects (PLANNED)

New Single, EP Launch, Album Release, Artist Brand Refresh, EPK, Social Content Package, Press Package, and custom creative projects.

### 7.6 Artist requests (PLANNED)

Request categories an artist can start: cover artwork, release assets, social content, motion, lyric content, EPK, press materials, promotional creative, and other creative work.

---

## 8. Request model

### 8.1 Definition (PLANNED)

A **Request** is the customer's expressed intent to have a piece of creative work produced. It is the entry point of every workflow and the first object that must be valid before production starts.

A request:

- belongs to exactly one workspace and one brand or artist context;
- is created by the customer;
- states the outcome wanted in the customer's own words, plus structured requirements;
- may reference existing profile data (Brand DNA / artist identity) instead of restating it;
- may carry reference files and links;
- maps to one project (§9) when accepted.

### 8.2 Typical contents

| Element | Purpose |
| --- | --- |
| Request category | document, marketing assets, social content, presentation, brand asset, new project, cover artwork, release assets, motion, lyric content, EPK, press materials, promotional creative, other |
| Title and description | What the customer wants, in their words |
| Requirements | Size, format, platform, quantity, language, content points, mandatory inclusions |
| Context reference | Which brand/artist context and, for artists, which release |
| References | Files, links, examples the customer likes |
| Deadlines | Requested date where genuinely needed; never a free-form field that implies guaranteed scheduling |
| Status | Request lifecycle state (§8.3) |

### 8.3 Request states

```text
Submitted → In Validation → Accepted → (Project created)
                         ↘ Changes Needed  (customer action required)
                         ↘ Declined        (with reason, customer-visible)
```

- **Submitted** — created by the customer.
- **In Validation** — KeedoHub checks completeness and feasibility (PLANNED: validated by an operator; automated checks are FUTURE/OPTIONAL).
- **Changes Needed** — the request cannot proceed without more information; the customer sees exactly what is missing, in plain language.
- **Accepted** — the request becomes a project.
- **Declined** — the request will not be produced; a reason is always recorded and shown to the customer.

### 8.4 Rules

1. A request never enters production without an explicit acceptance step.
2. Validation questions must be specific and answerable; never a generic "please provide more detail".
3. A customer must be able to see the state of every request they have made.
4. Requests and their answers are retained even after a project completes, as a record of what was asked for.
5. Requests may be created from outcome templates (for example "Company Profile", "New Single") so the customer is guided by structure rather than a blank form. Templates reduce effort; they never turn into customer-facing editing surfaces.

## 9. Project model

### 9.1 Definition (PLANNED)

A **Project** is an accepted piece of work being produced for a customer. It is the customer-visible container that holds one or more production jobs and their deliverables.

A project:

- belongs to exactly one workspace and one brand or artist context;
- originates from exactly one accepted request;
- contains one or more production jobs (§10);
- carries the shared brief, references, profile context and delivery expectations;
- has a status the customer can understand (§9.3);
- ends with delivered work in the customer's library.

### 9.2 Project types

| Context | Project types |
| --- | --- |
| Brand | Company Rebrand, Company Profile, Product Launch, Website Creative, Social Media Kit, Marketing Package, Presentation, Brand Refresh, custom creative projects |
| Artist | New Single, EP Launch, Album Release, Artist Brand Refresh, EPK, Social Content Package, Press Package, custom creative projects |

Project types are configuration, not architecture: adding a type must never require structural change to the workflow.

### 9.3 Project status (customer-visible)

Customer-facing project statuses, expressed in customer language:

```text
Requested → In Production → In Review → Changes Requested → Approved → Delivered
```

| Status | Customer meaning | Customer action |
| --- | --- | --- |
| Requested | KeedoHub is validating and setting up the work | none |
| In Production | Work is being produced | none |
| In Review | Work is ready for the customer | Review, then Approve or Request Changes |
| Changes Requested | The customer asked for changes; production resumes | none (waiting on KeedoHub) |
| Approved | The customer accepted the work | none |
| Delivered | Finished files are in the library | download / use |

Exact label wording may be refined during the design-system phase; the *set* of states and their meanings are fixed by this document.

### 9.4 Rules

1. A project always has at least one production job before it can be In Production.
2. A project's status is derived from the state of its production jobs and reviews, never maintained by hand in two places.
3. The customer sees one project status; internal detail is secondary (§24).
4. Multiple deliverables are normal: one project may produce many files across many formats.
5. **Not every deliverable must follow an identical workflow.** A project may mix simple deliverables (a PDF) with complex ones (a set of motion and social assets). The model must stay flexible enough that a job can be produced, reviewed and delivered independently of its siblings where that makes sense.
6. Projects are never deleted in a way that loses the customer's record of what was produced (see §20 on retention).

---

## 10. Production Job model

### 10.1 Definition (PLANNED)

A **Production Job** is the internal unit of creative production for one deliverable (or one tightly related group of deliverables). It is where the Studio does its work.

A production job:

- belongs to exactly one project;
- produces one or more deliverables (§11);
- has an owner (the operator or team producing it) — PLANNED as operator attribution, not workload management;
- carries the brief, references, profile context, existing assets, previous versions and comments required to produce the work;
- follows the production queue states (§10.3).

### 10.2 Job context — what a production job must have access to

| Context | Why |
| --- | --- |
| Customer and workspace | Isolation and correct attribution |
| Brand/Artist context and profile | Voice, identity, colours, audience, offer |
| Brand DNA / artist identity | Reuse instead of re-asking |
| Request | What was actually asked for, in the customer's words |
| Project | Shared scope and delivery expectations |
| Brief | Structured production instructions |
| Reference files | Visual and content direction |
| Existing assets | Logos, previous work, brand kits |
| Previous versions | Continuity and revision history |
| Comments | Internal notes and customer feedback |
| Deliverables | The artefacts being produced |
| Status | Current queue position and state |

### 10.3 Production queue states (internal)

```text
Incoming → Briefing → In Production → Internal QA
         → Customer Review → Changes Requested → Approved → Delivered
```

| State | Meaning | Exit condition |
| --- | --- | --- |
| Incoming | Job created, not yet assessed | Moved to Briefing |
| Briefing | Requirements assembled and clarified | Brief complete and approved internally |
| In Production | Creative work is being produced | Work ready for internal check |
| Internal QA | KeedoHub checks quality, format and completeness | Pass (→ Customer Review) or rework (→ In Production) |
| Customer Review | The customer decides | Approve or Request Changes |
| Changes Requested | Customer wants revisions | Revised work returns to Internal QA |
| Approved | Customer accepted the work | Finalised for delivery |
| Delivered | Work has been delivered into the library | terminal state for the job |

### 10.4 Rules

1. Internal QA exists to prevent customers from seeing unfinished work. Nothing reaches Customer Review without passing it.
2. A job can be reworked repeatedly; every pass creates a new version (§11.3, §12).
3. Job state transitions are explicit events, not editable status fields.
4. The internal queue vocabulary is never exposed to customers (§24).
5. Anything automated inside a job (assistance, generation, batch processing) is FUTURE/OPTIONAL and must never change the customer-facing model.

## 11. Deliverable model

### 11.1 Definition (PLANNED)

A **Deliverable** is the actual piece of work the customer receives. It is the output of a production job and the thing the customer reviews, approves and downloads.

Deliverable formats to support (extensible):

- PDF
- PNG
- JPG
- SVG
- MP4
- Presentation (presentation files and their exports)
- Document
- ZIP package (a bundle of related files)

### 11.2 Properties

| Property | Notes |
| --- | --- |
| Belongs to | One production job (and therefore one project, workspace and context) |
| Type | Format plus purpose (for example: "Cover artwork, 3000×3000 PNG") |
| Version | Current version plus full version history (§11.3) |
| Status | Produced → In Review → Approved → Delivered, derived from the job (§10.3) |
| Preview | A customer-visible preview that lets the work be judged without downloading |
| Files | One or more files; ZIP packages are first-class rather than a workaround |
| Feedback | Linked review thread (§13) |

### 11.3 Versions

- Versions are always preserved. Nothing overwrites a previous version.
- Every rework after QA or customer feedback creates a new version.
- A version records what it is (number/label), when it was produced, and (PLANNED) which feedback it responds to.
- **Customers normally see the current/approved version**, not the full working history. Internal working versions are internal unless deliberately shared.
- Approved versions are immutable: approval applies to a specific version, and later changes create a new version requiring a new review.

### 11.4 Presentation requirements

- Deliverables are presented as finished work: correct preview, dimensions/format/duration metadata where relevant, and a clear download action.
- Deliverables destined for a platform (for example a streaming service or a social platform) carry the platform requirement they satisfy, so the customer can verify fitness for purpose.
- Preview rendering of every supported format is part of the delivery experience, not an optional extra.

### 11.5 Rules

1. A deliverable is never described as finished before internal QA passes.
2. A deliverable is never described as delivered before delivery occurs (§14).
3. Multiple deliverables per job and per project are normal.
4. A deliverable's files live in storage by reference; the deliverable record holds identity, metadata, versions and status (§21).

---

## 12. Asset model

### 12.1 Definition (PLANNED)

An **Asset** is a file or resource that is stored in the customer's library or used during production. Assets are the raw material of production and the lasting output of it.

### 12.2 Asset categories

| Category | Examples | Visible to customer |
| --- | --- | --- |
| Uploaded references | Inspiration images, competitor examples, brief attachments | Yes |
| Identity assets | Logos, secondary logos, fonts, brand colour definitions, artist imagery | Yes |
| Source/working files | Editable working files used by KeedoHub during production | Internal by default; shareable if deliberately included as a deliverable |
| Delivered assets | Final files and packages produced for the customer | Yes |
| Library items | The curated set of assets the customer keeps and reuses (logos, brand kits, approved artwork) | Yes |

### 12.3 Rules

1. **Versions must be preserved.** Overwriting an asset in place is not permitted.
2. Assets are owned by a workspace (and, where applicable, a context and a release/project).
3. Assets used in production must be traceable to the job that used them, so output can be explained and reproduced.
4. Customer-visible assets are accompanied by usable metadata: type, format, dimensions where relevant, and origin.
5. Assets uploaded by a customer are never silently replaced, re-encoded in a lossy way, or re-attributed.
6. Deletion policy must never destroy a customer's delivered work without an explicit, deliberate retention decision (§20).

## 13. Review / Approval model

### 13.1 Definition (PLANNED)

A **Review** is the customer's decision point on a specific deliverable version. Reviews are the only way work becomes approved, and approval is the only way work becomes deliverable.

### 13.2 Actions

| Action | Meaning | Consequences |
| --- | --- | --- |
| **Request Changes** | The customer wants revisions | Feedback is recorded against the version; the production job returns to production; a new version must be produced and pass internal QA before review again |
| **Approve** | The customer accepts the version | The version becomes the approved version; the deliverable becomes eligible for delivery |

Both actions are explicit and recorded with: who acted, when, which version, and (for Request Changes) the feedback given.

### 13.3 Rules

1. **Exactly two review actions.** No "maybe", no "approve with reservations". Anything else is feedback, not a decision.
2. Request Changes requires written feedback. An empty change request is not accepted.
3. Approval applies to a specific version, never to "the deliverable" in the abstract.
4. Feedback is retained with the version it concerns, permanently, as the record of how the work evolved.
5. A customer cannot approve work they cannot see: review requires a preview that is good enough to judge the work.
6. Internal QA happens before customer review; customers are never used as the first reviewer of unfinished work.
7. Who may approve is an authorisation decision (§19), not a UI affordance.

---

## 14. Delivery model

### 14.1 Definition (PLANNED)

A **Delivery** finalises approved work into the customer's library. It is the point at which production ends and the customer's ownership of the finished files begins.

### 14.2 Rules

1. **Only approved work is delivered.** Delivery of unapproved work is a defect.
2. Delivery records: what was delivered, which version, in which formats, when, and into which library.
3. Delivered work is immutable. If the customer later wants changes, that is new work (a new request, project or job), not an edit of the delivered record.
4. Delivered files remain downloadable for the customer for as long as the account exists, subject to the retention policy (§20).
5. Delivery is visible to the customer as a completed, finished state — not as a technical transfer step.
6. Delivery may include a bundle (for example all assets for a release) while still tracking each deliverable individually.

---

## 15. Customer Library

### 15.1 Definition (PLANNED)

The **Customer Library** is the customer's permanent, browsable collection of finished work and the assets that belong to their brand or artist identity.

### 15.2 Contents

- Delivered deliverables, in all their formats.
- Identity assets (logos, brand kits, cover artwork, artist imagery).
- Uploaded reference material the customer chose to keep.
- Document bundles where relevant (for example a company profile plus its editable or print variants).

### 15.3 Requirements (PLANNED)

- The library is browsable and searchable by the customer without understanding internal structure.
- Items are presented as finished work: preview first, then metadata, then download.
- Items are grouped in ways the customer thinks in: by brand context, by artist/release, by project, by type, by date.
- The library distinguishes **"my assets"** (identity material the customer owns and reuses) from **"delivered work"** (finished creative produced by KeedoHub), because customers use them differently.
- Nothing is silently removed from the library. Changes to retention are announced and deliberate.
- Library access obeys the same isolation and authorisation rules as everything else (§19, §20).

### 15.4 Terminology

The customer sees "My Assets", "My Documents", "My Releases" and "Delivered". The library never exposes internal production concepts.

## 16. Private KeedoHub Studio

### 16.1 Definition (PLANNED)

The **Studio** is the private internal production environment where the real production complexity lives. Initially it is available only to the owner and authorised KeedoHub operators.

### 16.2 Intended navigation (PLANNED)

| Area | Purpose |
| --- | --- |
| Command Center | Overview of what needs attention now: new requests, jobs in flight, items awaiting customer response, deliveries pending |
| Customers | Workspaces and the customers behind them |
| Requests | Incoming and validated requests |
| Projects | Accepted work in progress, across all customers |
| Production Queue | Jobs ordered by queue state (§10.3), the operational core of the Studio |
| Studio | The production workspace for the job currently being worked on |
| Review | Items out with customers and items awaiting internal QA |
| Deliveries | Approved work prepared or delivered |
| Library | Internal asset and file library |
| Settings | Studio configuration, production types, templates, operator access |

This navigation is a minimum vocabulary, not a fixed information architecture. New internal areas may be added when a real production need exists.

### 16.3 Production Queue (PLANNED)

The queue is the operational heart of the Studio and follows the states in §10.3:

```text
Incoming → Briefing → In Production → Internal QA
         → Customer Review → Changes Requested → Approved → Delivered
```

Requirements:

- The queue always answers "what should I work on next", ordered by real urgency rather than by creation date alone.
- A job shows its customer, context, project, brief, assets, versions, comments and status in one place.
- Moving a job forward is a deliberate action with recorded consequences.
- Nothing in the queue can bypass internal QA.

### 16.4 Studio production job workspace (PLANNED)

A Studio job must present, without leaving the job:

- customer and workspace
- brand/artist context and profile
- Brand DNA / artist identity
- the originating request
- the project and its scope
- the brief
- reference files
- existing assets
- previous versions
- comments and feedback
- deliverables and their formats
- status and history

### 16.5 Access (PLANNED)

Studio access is private and authorised:

- Only the owner and explicitly authorised operators may enter.
- Authorisation is enforced on the server and in data access and file access, not by hiding navigation (§19).
- Studio access is never inferred from a customer account being "the owner's email" or any similar shortcut.
- Customer-facing and Studio-facing surfaces must not share a route namespace, so a customer can never reach Studio screens by navigating.

## 17. Studio production workflow

### 17.1 End-to-end flow (PLANNED)

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

### 17.2 Worked example — brand (PLANNED)

```text
Request: "Create my company profile"
  → Project: Company Profile
  → Production Job: Company profile document
  → Studio production
  → Deliverable: PDF (plus variants where required)
  → Internal QA
  → Customer Review
  → Approval
  → Delivery
  → Customer Library
```

### 17.3 Worked example — artist (PLANNED)

```text
Request: "I am releasing a new single"
  → Project: New Single (Release Project)
  → Multiple Production Jobs:
        cover artwork
        social assets
        motion assets
        EPK / press assets
  → Internal QA (per job)
  → Review (per job, as each is ready)
  → Approval
  → Delivery (individually or as a bundle)
  → Customer Library, grouped under the release
```

### 17.4 Flexibility rule

Not every deliverable must follow an identical workflow. The workflow is a set of composable states and transitions, not a rigid pipeline. Deviations must be deliberate and must never weaken the guarantees in §13 (review before approval), §14 (approval before delivery) and §10.4 (QA before customer review).

## 18. Internal production capabilities

### 18.1 Nature of these capabilities (PLANNED)

The following are **internal** production capabilities. They run inside KeedoHub, on behalf of the customer. They are never exposed as customer tools, menus or editors, and their complexity is never explained to customers (§24).

| Capability group | Examples |
| --- | --- |
| Document Production | Company profiles, proposals, invoices, letterheads, forms, agreements where appropriate |
| Brand Production | Brand guidelines, brand kits, logos and identity application |
| Artist Production | Cover artwork, release assets, EPKs, press assets |
| Creative Production | General creative production work across contexts |
| QA | Quality, format, completeness and consistency checks before customer review |
| Asset Packaging | Bundles (for example ZIP packages, release asset packs) |
| Image Processing | Resizing, cropping, format conversion, export variants |
| Motion | Animated covers, motion visuals, lyric visuals |
| Graphics | Social graphics, promotional graphics, advertising assets |
| Presentations | Business, sales and pitch presentations |
| Brand Kits | Reusable identity packages |
| Social Kits | Platform-sized sets of social creative |
| Marketing Assets | Promotional, product and launch creative |
| Brand Guidelines | Rules and applications for identity use |
| Proposals / Invoices | Commercial and billing documents |
| Company Profiles / Letterheads | Corporate document production |
| Cover Artwork / Release Assets | Release artwork and platform-sized release creative |
| EPKs / Press Assets | Electronic press kits and press material |

### 18.2 Rules

1. Capabilities are internal services and workflows, not customer-facing features.
2. A capability must be reachable from a production job with the job's full context (§10.2).
3. Adding a capability must never require exposing a new customer surface.
4. Capabilities must be auditable: what was produced, from which inputs, into which deliverable version.
5. Automation inside a capability is FUTURE/OPTIONAL and always subject to internal QA before customer review.
6. Internal capabilities may be delivered by people, by tooling, or by a combination. The customer-facing model must not depend on which.

## 19. Permissions and security

### 19.1 Studio authorisation (PLANNED)

Studio authorisation must eventually be enforced at all four layers:

| Layer | Enforcement |
| --- | --- |
| Frontend route level | Studio routes are unavailable to non-operators (guards, layouts, redirects). |
| Backend/API level | Every Studio action re-checks authorisation server-side, regardless of what the UI allowed. |
| Database/data-access level | Data access for Studio operations is mediated by operator-scoped access paths; queries cannot be issued without an authorised principal. |
| File-storage level | Studio file access is authorised at the point of access (signed/expiring URLs, server-side authorisation before streaming a file). |

### 19.2 Forbidden authorisation patterns

Never rely on:

- hardcoded admin booleans
- hidden buttons or hidden navigation as a security control
- frontend-only permissions
- simple email checks (for example "if the user's email is the owner's email, allow everything")
- a role stored only in a client-accessible token without server-side re-verification
- obscurity of routes or identifiers

Any of these found in code is a defect to be fixed, not a shortcut to be documented.

### 19.3 Roles (PLANNED)

| Principal | Scope |
| --- | --- |
| Customer user | Their own workspace only |
| Workspace member (FUTURE/OPTIONAL) | A workspace, with permissions decided at that time |
| KeedoHub operator | Studio surfaces, for all customers, with explicit authorisation |
| KeedoHub owner | Operator privileges plus Studio administration |

Role definitions are deliberately minimal. No permission system is to be built before a real need exists.

### 19.4 Security expectations common to all phases

1. Every server entry point re-authorises: authentication is never assumed from earlier navigation.
2. Authorisation decisions are made from server-side truth (session plus stored role/relationship), never from user-supplied identifiers.
3. Every request that touches customer data is scoped by workspace before it reaches data access.
4. Fail closed: if an authorisation check cannot be evaluated, deny.
5. Sensitive operations (approval, delivery, deletion, operator access) are logged with actor, target and time.
6. No secrets in client bundles; environment separation between development and production.

---

## 20. Data isolation

### 20.1 Isolation boundaries (PLANNED)

Customer data must be isolated between:

- different customers
- different workspaces
- different brand/artist contexts where applicable

Isolation is a property of the system, not of the UI. A customer must be unable to read, enumerate, infer or modify another customer's data even if they manipulate requests, identifiers or URLs directly.

### 20.2 Rules

1. **Scope first.** Data access functions require a workspace scope (and context scope where applicable) as an explicit parameter. There is no "fetch by id alone" path for customer data.
2. **Identifiers are not authorisation.** Possessing an identifier never grants access.
3. **No cross-workspace joins in customer queries.** Aggregations across customers exist only in the Studio and are explicitly operator-authorised.
4. **Context isolation inside a workspace.** Work created in a brand context is never visible as belonging to an artist context, and vice versa.
5. **File isolation mirrors data isolation.** A file is reachable only through an authorisation path that evaluates the same scope rules as the data record that references it.
6. **Isolation is tested.** Every phase's acceptance criteria include at least one explicit test attempting cross-customer and cross-context access, which must fail closed.

### 20.3 Retention and deletion

- Delivered work is retained for the customer's benefit; deletion is deliberate, explicit and recorded.
- Version and feedback history is retained, because approval and revision history is part of the record of the work.
- Deletion requirements (account deletion, legal requests) must be handled as an explicit, documented process, and must never be implemented as an ad-hoc cascade that can cross isolation boundaries.

---

## 21. File and storage principles

### 21.1 Storage model (PLANNED)

- Files live in S3-compatible object storage; the database holds metadata and references.
- Objects are addressed privately; access is granted through short-lived, authorised URLs rather than public buckets.
- Object keys must not encode sensitive customer data (no customer names, emails or raw titles in keys).
- Uploads are validated (type, size, and where relevant dimensions/duration) before being accepted as assets.

### 21.2 Principles

1. **Immutable versions.** Uploading a new version creates a new object; nothing is overwritten in place.
2. **Derivatives are traceable.** Processed variants (crops, resizes, previews, exports) record their source object.
3. **Originals are preserved.** A customer's original upload is never destroyed by processing.
4. **Deletion is deliberate.** Removing an object requires an authorised action; soft deletion with retention is preferred over immediate destruction.
5. **Consistency.** A deliverable record must never reference a missing object; storage and metadata must be reconciled, and gaps surfaced as errors rather than silent empty previews.
6. **Performance.** Preview generation and transfer sizes must be appropriate to the surface: large previews for judging creative work, small derivatives for lists.
7. **Access parity.** Studio and customer file access obey the same authorisation model (§19) and are individually logged (FUTURE/OPTIONAL for logging detail).

## 22. Notification principles

### 22.1 Purpose (PLANNED)

Notifications exist to remove the need to check for status. They are a workflow tool, not an engagement tool.

### 22.2 Principles

1. **Only actionable or meaningful events notify.** Examples: work is ready for review; changes were requested; work was delivered; a request needs more information; a job moved into production.
2. **No engagement spam.** No re-engagement nudges, badges for their own sake, or notifications that merely restate a status the customer did not need to know about.
3. **Two audiences, two vocabularies.** Customer notifications use customer language (§24); internal notifications may use Studio vocabulary and remain inside the Studio.
4. **Every notification has a destination.** Tapping it opens the exact thing it concerns (the deliverable under review, the request needing information).
5. **State changes are the source of truth.** Notifications are derived from state transitions; a notification never creates a state change.
6. **Respect the customer's attention.** Deliver-preference control (in-app, email) is PLANNED; channels beyond those are FUTURE/OPTIONAL.
7. **No notification may expose another customer's data**, including in batched or digest form; aggregation is per workspace.

---

## 23. Design and UX principles

### 23.1 Character

KeedoHub must feel: **premium, creative, modern, confident, editorial, professional, clean, intentional.**

### 23.2 Required qualities

- **Strong typography.** Type does the work. Clear hierarchy, confident scale, restrained use of weight.
- **Generous spacing.** Whitespace is a feature; density is not.
- **Clear hierarchy.** The customer always knows what matters most on a screen.
- **Beautiful previews.** Creative work is shown large and properly, never as a thumbnail afterthought.
- **Subtle motion.** Motion explains change and confirms action; it never decorates or delays.
- **Polished empty states.** Every empty state explains what will appear there and offers the action that fills it.
- **Polished loading states.** Skeletons or progressive reveals that preserve layout; no naked spinners.
- **Thoughtful responsive layouts.** Designs are authored for small and large screens deliberately; no desktop layouts squeezed onto mobile.

### 23.3 Avoid

- excessive cards
- endless dashboards
- tiny text
- excessive badges
- unnecessary tables
- technical language in the customer UI
- clutter
- generic SaaS appearance
- Canva-style customer tooling

### 23.4 Visual identity

- The official KeedoHub brand colour is **RED**. Exact values are defined in the design-system phase.
- Do **not** invent a replacement brand palette. The current neutral tokens are a placeholder foundation, not the brand identity.
- The design system is established in Phase 1 and is the single source for colour, type, spacing, radii and component styling thereafter.

### 23.5 Accessibility (PLANNED, verified in Phase 5)

- Semantic HTML first; ARIA only where semantics are insufficient.
- Keyboard operability for every interactive element, with visible focus states.
- Sufficient colour contrast in both light and dark contexts where the design system defines them.
- Reviewed and tested in Phase 5 (§28, §29), not assumed.

### 23.6 Performance as UX (PLANNED)

- Preview-heavy surfaces must stream or progressively load; a customer waiting on a heavy file must see progress and layout, not a blank region.
- The customer's first meaningful view of their dashboard should render without waiting on non-essential data or media.

---

## 24. Customer terminology rules

### 24.1 The rule

Customer-facing UI, notifications, emails and documents use plain, task-focused language. Internal system vocabulary is never shown to customers.

### 24.2 Approved customer vocabulary

| Use | Meaning |
| --- | --- |
| My Projects | Active and past work being produced for the customer |
| My Requests | Things the customer has asked for, and their state |
| My Documents | Document-type deliverables |
| My Assets | The customer's own identity files and resources |
| My Releases | An artist's releases and their creative |
| Review | Look at work and decide |
| Approve | Accept the work |
| Request Changes | Ask for revisions, with feedback |
| Delivered | Finished and available in the library |
| In Production | Work is being produced |

Additional plain-language states are permitted if they are equally simple.

### 24.3 Excluded vocabulary

The following are explicitly excluded from all customer-facing surfaces (they belong to internal or historical system naming, not to KeedoHub's customer experience):

- Creative Engine
- Creative System
- Operating Environment
- Production Engine
- Studio Engine
- Programmed Brain
- Campaign OS
- Campaign Builder
- DSP Pitch Engine
- Curator Engine

This list is a floor, not an exhaustive ban: any name that sounds like a machine, pipeline, engine, operating system or internal capability is excluded from the customer UI. Where a concept genuinely requires a name in front of customers, use the approved vocabulary in §24.2.

### 24.4 Enforcement

- Customer copy is reviewed against this section before a surface is considered done.
- Internal identifiers (job states, capability names, storage concepts) must not leak through error messages, URLs, empty states, tooltips or notification text.
- The Studio may use richer vocabulary; that vocabulary never appears in a customer-facing string.

## 25. Technical architecture direction

### 25.1 Current stack (CURRENT)

Installed and working today: Next.js 16.3.5 (App Router, `src/` directory), React 19.2.8, TypeScript 5.9.3 (strict), Tailwind CSS v4.3.3 with `@tailwindcss/postcss`, shadcn/ui (CLI 4.21.0) with Base UI primitives 1.8.0, `class-variance-authority` 0.7.1, `cn` 0.3.0 for class merging, `lucide-react` 1.46.0, `tw-animate-css` 1.4.0, ESLint 9.39.5 with `eslint-config-next` 16.3.5. Scripts: `dev`, `build`, `start`, `lint`.

### 25.2 Planned stack (PLANNED — none of this exists yet)

| Layer | Technology | Notes |
| --- | --- | --- |
| Backend | Next.js server architecture (route handlers and/or server actions) | One deployment unit initially |
| Database | PostgreSQL | Managed in production |
| ORM / schema | Drizzle ORM | Typed schema and queries |
| Validation | Zod | Boundary validation for all inputs |
| Auth | Better Auth or another production-grade provider | Server-verified sessions |
| Storage | S3-compatible object storage | Private objects, authorised access |
| Tests | Vitest (unit/integration), Playwright (E2E) | Phase-by-phase |
| Deployment | Vercel + managed PostgreSQL + secure object storage | Single application |

### 25.3 Architectural principles

1. **One well-structured application.** Do not introduce microservices. Do not split into separately deployed front ends or services at the start.
2. **Clear domain boundaries.** Domains are directories with clear ownership of data and behaviour, not layers of generic utility.
3. **Server-first.** Data access, authorisation and mutations happen on the server. Client components exist for interaction, not for authority.
4. **Validate at the boundary.** Every external input (form, route handler, file upload) is parsed and validated before reaching domain logic.
5. **Scope-aware data access.** Data access functions take explicit scope parameters (workspace, context) as a matter of interface design (§20).
6. **Derive, do not duplicate.** Statuses and permissions are computed from authoritative state; never stored redundantly and maintained by hand in two places.
7. **Explainable state.** State transitions are recorded as events with actor and time, so any question about "what happened" has an answer.
8. **Boring infrastructure.** Prefer the fewest moving parts that satisfy the requirement.
9. **No premature abstraction.** Build the second implementation before extracting the first abstraction.

### 25.4 Suggested domain organisation (PLANNED — do not create all of it now)

```text
src/
  app/                      # Routes only: public, customer, studio namespaces
  components/               # Shared UI (design-system components live here)
  domains/
    auth/
    workspace/
    brand/
    artist/
    requests/
    projects/
    production/
    deliverables/
    assets/
    reviews/
    deliveries/
  lib/                      # Framework-agnostic helpers (cn, formatting, guards)
  services/                 # Cross-domain services (storage, notifications, integrations)
  styles/                   # Global styles and design tokens
```

This is guidance for the shape of the system, **not permission to create all of these folders now**. Folders are created when the phase that owns them begins, and each folder must contain something real.

### 25.5 Route organisation (PLANNED)

- Public surface: the landing page and other public pages.
- Customer surface: one authenticated area representing the workspace, with brand and artist contexts inside it.
- Studio surface: a separate, private, operator-authorised area.
- Customer and Studio routes must not share a namespace, and Studio route existence must not be discoverable through customer navigation.

### 25.6 TypeScript and code quality (CURRENT expectations)

- `strict` TypeScript; no `any` as an escape hatch without an explicit, justified comment.
- ESLint must pass with no errors; warnings are treated as work to do, not background noise.
- No unused code, commented-out blocks, or speculative modules committed "for later".
- Prefer server components; add `"use client"` only where interaction requires it.

## 26. Testing strategy

### 26.1 Current state (CURRENT)

No tests exist. There is no test runner, no test script in `package.json`, and no CI. `npm run lint`, `npx tsc --noEmit` and `npm run build` are the only automated checks today, and they must pass before any change is considered complete.

### 26.2 Planned tooling (PLANNED)

| Tool | Scope |
| --- | --- |
| Vitest | Unit and integration tests: domain logic, validation, state transitions, authorisation and isolation rules |
| Playwright | End-to-end tests: request → review → approval → delivery journeys, Studio flows, access control |

### 26.3 What must be tested

1. **Authorisation.** Every restricted surface and action denies unauthorised principals, including direct URL and direct request access.
2. **Data isolation.** Cross-customer and cross-context access attempts fail closed (§20.2 rule 6).
3. **Workflow integrity.** A request cannot enter production without acceptance; a deliverable cannot reach review without internal QA; nothing can be delivered without approval.
4. **Version integrity.** New versions never overwrite previous ones; approval binds to a specific version.
5. **Validation.** Boundary inputs are rejected with clear messages; valid inputs are accepted.
6. **Customer-facing terminology.** A test or lint rule asserting that excluded vocabulary (§24.3) does not appear in customer-facing strings is desirable in Phase 5.
7. **Critical user journeys** (E2E): the brand company-profile journey and the artist single-release journey (§17.2, §17.3), including a Request Changes cycle.

### 26.4 Approach

- Test behaviour and guarantees, not implementation details.
- Prefer a few high-value tests over broad shallow coverage.
- Every defect found in a phase produces a regression test in the same phase.
- Tests are added from the phase in which their subject is built; Phase 5 consolidates and expands, it does not introduce testing from nothing.

---

## 27. Deployment and operations principles

### 27.1 Deployment (PLANNED)

| Element | Direction |
| --- | --- |
| Application | Single Next.js deployment on Vercel |
| Database | Managed PostgreSQL with automated backups |
| Storage | Secure S3-compatible object storage; private buckets |
| Environments | Development, preview and production must be separate, with separate credentials and data |

### 27.2 Principles

1. **No production data in development.** Development and preview environments never point at production data (especially customer files).
2. **Migrations are versioned and reviewed.** Schema changes are applied through migrations, never by hand-editing a live database.
3. **Backups are verified, not assumed.** A backup that has never been restored is not a backup.
4. **Secrets live in environment configuration**, are never committed, and are never exposed to the client bundle.
5. **Observability from Phase 5 (PLANNED).** Errors and failures are logged with enough context to reproduce (workspace scope, action, actor), without logging sensitive file contents.
6. **Fail visibly.** Silent failures in production are worse than loud ones; production issues must surface to the operator.
7. **Reversible changes.** Deployments and migrations should be reversible, or their irreversibility must be a recorded, deliberate decision.
8. **Zero-surprise rollouts.** The presence of unfinished features is not acceptable in production; features ship when they are complete for their phase.

### 27.3 Operational readiness (Phase 5 gate)

Production readiness requires: error handling reviewed, logging in place, backups verified, monitoring in place, security and isolation audits complete, E2E tests passing, UX polish complete, and the Definition of Done for Phase 5 (§29) fully satisfied.

## 28. Five-phase implementation roadmap

**There are exactly five phases. There is no sixth phase.** Everything planned in this document is assigned to one of them. Work that does not fit a phase is FUTURE/OPTIONAL and requires a recorded decision before it is scheduled.

Phases are sequential: a phase begins when the previous phase's Definition of Done (§29) is satisfied. Security and isolation requirements are never deferred to a later phase than the one that creates the data or surface they protect.

### Phase 1 — Foundation (PLANNED)

**Objective:** a real, secure application foundation with a unified customer workspace shell, profiles and a design system — and no production engines.

**Build:** application foundation; authentication; database; API foundation; file storage; permissions; unified customer Workspace; Brand Profile; Artist Profile; design system; navigation foundation.

**Explicitly not in this phase:** complex production engines, production jobs, Studio, reviews, deliveries, library behaviour.

### Phase 2 — Customer Experience (PLANNED)

**Objective:** the customer can see and manage everything they have, and can ask for work.

**Build:** Brand dashboard; Brand documents; Brand marketing; Brand assets; Brand projects; Brand requests; Artist dashboard; Artist releases; Artist assets; Artist projects; Artist requests; profile management; notifications; customer library.

**Explicitly not in this phase:** production internals, the Studio, operator tooling.

### Phase 3 — Production Workflow (PLANNED)

**Objective:** work can travel from request to delivery as a connected, auditable lifecycle.

**Build:** Requests; Projects; Production Jobs; Deliverables; Versions; Reviews; Approvals; Deliveries; notifications; customer-to-production connection; the complete request → delivery lifecycle.

**Explicitly not in this phase:** the private Studio experience (production may be operated through minimal internal means, but the Studio as a product is Phase 4).

### Phase 4 — Private KeedoHub Studio (PLANNED)

**Objective:** KeedoHub can run production at volume through its own environment.

**Build:** Studio authentication/authorisation; Command Center; Customers; Requests; Projects; Production Queue; Production Workspace; internal production capabilities; creative production workflows; QA; review; delivery; internal library.

**Explicitly not in this phase:** customer-facing tooling of any kind.

### Phase 5 — Hardening + Launch (PLANNED)

**Objective:** the system is secure, observable, fast, accessible and ready for real customers.

**Build:** security; authorisation audits; data isolation audits; file security; performance; responsive behaviour; accessibility; error handling; logging; backups; monitoring; deployment; E2E tests; UX polish; production readiness.

**Explicitly not in this phase:** new product capability. Phase 5 hardens what exists; it does not add new domains.

### Phase summary table

| Phase | Name | Status | Gates the next phase |
| --- | --- | --- | --- |
| 1 | Foundation | PLANNED | Yes |
| 2 | Customer Experience | PLANNED | Yes |
| 3 | Production Workflow | PLANNED | Yes |
| 4 | Private KeedoHub Studio | PLANNED | Yes |
| 5 | Hardening + Launch | PLANNED | Launch |

## 29. Definition of Done

A phase is complete only when **all six dimensions** are satisfied. Capability without security, or security without a usable interface, does not complete a phase. Every acceptance criterion is verifiable — by test, by inspection, or by a concrete demonstration.

### Phase 1 — Foundation: Definition of Done

**Objective.** A working, secure application foundation: authentication, database, API foundation, storage, permissions, the unified customer workspace shell, brand and artist profiles, the design system and navigation — with no production engines.

**Capabilities.** A person can create an account, sign in, and land in a single workspace. They can create and edit a brand profile and an artist profile inside that workspace, and upload identity assets (logo, references). They can see the workspace shell and navigation provided by the design system. No requests, projects, jobs or Studio exist.

**Security expectations.** Authentication is server-verified with production-grade session handling. Authorisation is enforced server-side on every workspace and profile operation. Data access is workspace-scoped at the interface level. File access uses authorised, non-public access paths. There are no hardcoded admin booleans, no email-based privilege checks and no frontend-only permissions. Secrets are environment-managed.

**UX expectations.** The design system exists (typography, colour tokens with RED as the brand colour, spacing, radii, core components). The workspace shell is responsive and legible on mobile and desktop. Empty and loading states exist for every list and profile surface. Customer-facing copy uses approved vocabulary only.

**Technical expectations.** TypeScript strict, ESLint clean, production build passing. Database schema and migrations under version control. Input validation at every boundary. Clear domain boundaries for the domains introduced in this phase. No speculative folders or unused abstractions committed.

**Acceptance criteria.**
1. A new user can register, sign in, sign out and return to a persisted session.
2. A workspace is created for the user and cannot be accessed by another user.
3. Brand profile and artist profile can be created, edited and revisited with data persisted.
4. Uploading an identity asset succeeds, is validated, and is retrievable only by its owner.
5. A cross-user access attempt (direct URL or direct request) fails closed and is covered by a test.
6. Customer-facing strings contain no excluded vocabulary (§24.3).
7. `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

### Phase 2 — Customer Experience: Definition of Done

**Objective.** The customer can see and manage everything they have, and can ask for work — without any internal production concepts appearing.

**Capabilities.** Brand dashboard (answering the four dashboard questions at a level the data supports), brand documents, brand marketing, brand assets, brand projects, brand requests, artist dashboard, artist releases, artist assets, artist projects, artist requests, profile management, notifications, and the customer library.

**Security expectations.** Every list, detail view and mutation is scoped by workspace and context; isolation tests cover each new surface. Assets and library files are served through authorised access paths. No cross-context leakage (brand data appearing under an artist context or vice versa).

**UX expectations.** The four dashboard questions (§4.3) are answerable at a glance. Every list has an intentional empty state and a loading state. Creative work is previewed properly. Navigation is consistent between brand and artist contexts. Customer vocabulary only.

**Technical expectations.** Domain boundaries respected for brand, artist, assets, requests and library. Derived statuses are computed, not duplicated. Pagination or bounded queries on every list. No production-job internals exposed through customer types or routes.

**Acceptance criteria.**
1. A brand user can create a request in every brand request category; the request is visible with a state.
2. An artist user can create a release and attach release information, and can create a request against that release.
3. Documents, marketing items, assets, projects and releases all list, open and display correct empty and loading states.
4. The library shows delivered items (when any exist) and identity assets separately, each downloadable by the owner only.
5. Notifications appear for the meaningful events defined in §22 and link to their subject.
6. Excluded vocabulary is absent from every customer surface, including URLs, errors and tooltips.
7. Cross-customer and cross-context isolation tests for each new surface pass.

### Phase 3 — Production Workflow: Definition of Done

**Objective.** Work travels from request to delivery as a connected, auditable lifecycle, with the customer able to review and approve.

**Capabilities.** Requests with validation and states; projects with derived customer-visible status; production jobs with internal queue states; deliverables with formats and versions; reviews with Approve and Request Changes; approvals bound to versions; deliveries into the library; notifications for lifecycle events; a working customer-to-production connection.

**Security expectations.** Customers can act only on their own workspace's requests, projects, deliverables and reviews. Approval and change requests are authorised per principal, not merely per page. Operators' production actions are authorised server-side. Every lifecycle transition is recorded with actor and time. File access for review and delivery uses authorised, time-limited access.

**UX expectations.** The customer sees exactly one project status, in approved vocabulary. Review presents work large enough to judge, with two clear actions and an obvious feedback field. Request Changes is possible without friction; approval is deliberate and confirmed. The customer always knows what is expected of them next.

**Technical expectations.** State machines are implemented once per concept and reused. Statuses are derived, never dual-maintained. Versions are immutable and referenced, not overwritten. Every transition validates preconditions (for example, delivery requires approval). Workflow integrity rules (§26.3 item 3) are covered by tests.

**Acceptance criteria.**
1. A request can be accepted, converted into a project, and progressed to a delivered outcome using only real states.
2. A deliverable cannot reach customer review without passing internal QA.
3. A customer can Request Changes with feedback, and the revised version returns for a second review.
4. A customer can Approve a specific version; only then can that version be delivered.
5. Attempting to deliver an unapproved version fails, and the attempt is covered by a test.
6. Old versions remain retrievable internally after new versions exist.
7. Customers see only approved/current versions of the work by default.
8. Lifecycle notifications are emitted for review-ready, changes-requested and delivered events.

### Phase 4 — Private KeedoHub Studio: Definition of Done

**Objective.** KeedoHub can operate production at volume from its own environment, with Studio access properly secured.

**Capabilities.** Studio authentication and authorisation; Command Center; Customers; Requests; Projects; Production Queue; Production Workspace (for a single job, with full job context, §10.2); internal production capabilities; creative production workflows; QA; review handling; delivery; internal library.

**Security expectations.** Studio access is enforced at frontend route, backend/API, data-access and file-storage levels (§19.1). No hardcoded admin booleans, no email checks, no hidden-button security (§19.2). Customer and Studio route namespaces are separate. Studio file access is authorised at access time. Operator actions are attributable and logged.

**UX expectations.** The queue answers "what should I work on next" and is usable for a full working session. A production job presents everything needed without leaving the job (customer, context, Brand DNA / artist identity, request, project, brief, references, existing assets, previous versions, comments, deliverables, status). Internal screens may be dense, but must remain legible, consistent and genuinely faster to use than ad-hoc tools.

**Technical expectations.** Internal production capabilities are reachable from a job with full context. Internal vocabulary stays inside the Studio. No customer surface is created or altered by Studio work. Capabilities are auditable (inputs → deliverable version). Studio queries are explicitly operator-authorised, including any cross-customer views.

**Acceptance criteria.**
1. A non-operator cannot reach any Studio route or Studio API action — by navigation, direct URL or direct request — and this is covered by tests.
2. An operator can take a job from Incoming through Briefing, Production, Internal QA, Customer Review, Approval and Delivery using the Studio.
3. From a job, the operator can see and use the customer's context, profile data, request, project, brief, references, existing assets, previous versions and comments.
4. Internal QA is enforceable: a job cannot be moved to Customer Review without completing the QA step.
5. The internal library retains superseded versions and working assets with traceability to the job that used them.
6. No Studio vocabulary appears on any customer surface.
7. Cross-customer Studio views are unavailable to customer principals in all access paths.
---

### Phase 5 — Hardening + Launch: Definition of Done

**Objective.** The system is secure, isolated, observable, performant, accessible and ready for real customers.

**Capabilities.** No new product capability. Hardening of everything built in Phases 1–4: security, audits, file security, performance, responsive behaviour, accessibility, error handling, logging, backups, monitoring, deployment, E2E tests and UX polish.

**Security expectations.** Completed authorisation audit across every route, action and data path. Completed data-isolation audit across customers, workspaces and contexts, including files. File security reviewed (private objects, authorised access, safe uploads). Backups configured **and restored in a test**. Monitoring and logging in place without leaking sensitive content. No forbidden authorisation pattern remains anywhere in the codebase (§19.2).

**UX expectations.** Accessibility review complete (keyboard operability, focus states, contrast, semantic structure). Responsive behaviour verified on real small and large viewports. Empty, loading and error states polished everywhere. Copy audited against §24 (customer vocabulary, no excluded terms). No dead ends, no unexplained states, no placeholder text.

**Technical expectations.** E2E tests cover the critical journeys (brand document journey, artist release journey, request-changes cycle, Studio access control). Error handling reviewed on the server and surfaced usefully on the client. Performance work done on preview-heavy surfaces. Deployment process documented and repeatable. Remaining known issues recorded explicitly rather than left undocumented.

**Acceptance criteria.**
1. Authorisation audit report exists and every finding is fixed or explicitly accepted.
2. Data-isolation audit report exists, with automated tests demonstrating cross-customer and cross-context denial.
3. A backup has been restored successfully in a non-production environment.
4. E2E tests pass for: sign-up and profile journey, brand request → delivery, artist release → delivery, request-changes cycle, and Studio access denial for a customer principal.
5. Accessibility review completed with findings fixed or explicitly accepted; keyboard-only operation is possible for the critical journeys.
6. Error, empty and loading states verified on every customer surface.
7. Terminology audit passes: no excluded vocabulary in customer-facing surfaces.
8. Monitoring and logging verified against a deliberately triggered production error.
9. `npm run lint`, `npx tsc --noEmit`, `npm run build` and the full test suite pass on the release commit.

---

## 30. Non-goals — what KeedoHub will not become

These are explicit refusals. Each is a product decision, not a temporary limitation. Changing one requires a recorded decision in this document with a stated reason.

| # | Non-goal | Implication |
| --- | --- | --- |
| 1 | **Not a Canva clone.** | No customer-facing template-composition or drag-and-drop layout tool. Templates may guide requests; they never become an editing surface. |
| 2 | **Not a Photoshop clone.** | No layer, mask, brush or image-editing tooling for customers. |
| 3 | **Not a generic AI image generator.** | KeedoHub produces deliberate, professional, brief-driven work. No "type a prompt, get images" customer feature. |
| 4 | **Not a campaign-management platform.** | No campaign entities, campaign builders, campaign calendars or campaign architecture. |
| 5 | **Not a social-media scheduling platform** unless deliberately added later as a recorded decision. | No scheduling, calendar or publishing integrations by default. |
| 6 | **Not a generic project-management SaaS.** | No boards, backlog management, sprint tooling or arbitrary task systems for customers. |
| 7 | **Not a marketplace.** | No open talent marketplace, bidding, tenders or self-service seller profiles. |
| 8 | **Not a customer-facing creative production engine.** | Production capability is internal. Customers never see, configure or operate production machinery. |
| 9 | **Not multiple disconnected Brand/Artist applications.** | One unified customer workspace with brand and artist contexts. Never fork into separate products. |
| 10 | **Not a microservices system at the beginning.** | One well-structured application with clear domain boundaries. Split only if a real, demonstrated constraint requires it. |
| 11 | **Not a design tool in disguise.** | Any feature that asks a customer to compose, arrange or render their own creative work is out of scope. |
| 12 | **Not an internal-terminology product.** | No engine/OS/pipeline/system vocabulary anywhere in the customer experience. |

### 30.1 Features explicitly out of scope unless decided later

- Customer-facing editors of any kind (canvas, document, image, motion).
- Automated publishing or scheduling to external platforms.
- Public team/collaboration features for customer workspaces (FUTURE/OPTIONAL).
- Billing, subscriptions or payments (not yet scheduled; requires a recorded decision).
- Multi-language localisation (FUTURE/OPTIONAL).
- Native mobile applications (FUTURE/OPTIONAL; responsive web first).

---

## Appendix A — Conceptual entity chain

```text
User
  → Workspace                       (single per customer; isolation boundary)
      → Brand Context / Artist Context
          → Request                 (customer intent; validated before production)
              → Project             (customer-visible container, derived status)
                  → Production Job  (internal unit of production, queue states)
                      → Deliverable (versioned artefact; reviewable, deliverable)
                          → Asset   (files and resources; versions preserved)
                              → Review   (Approve | Request Changes)
                                  → Delivery (approved work into the library)
```

Lifecycle summary:

| Concept | Owner | Vocabulary |
| --- | --- | --- |
| Request | Customer | My Requests |
| Project | Shared | My Projects / status in customer language |
| Production Job | KeedoHub (internal) | internal queue states only |
| Deliverable | Shared | work item, version, format |
| Asset | Shared | My Assets |
| Review | Customer | Review / Approve / Request Changes |
| Delivery | Shared | Delivered |
| Library | Customer | My Documents / My Releases / My Assets / Delivered |

## Appendix B — Status summary

| Area | Status |
| --- | --- |
| Next.js application, App Router, `src/` directory | **CURRENT** |
| TypeScript (strict), ESLint, Tailwind v4, shadcn/ui foundation | **CURRENT** |
| Landing page at `/` ("Creative work, done.") | **CURRENT** |
| Button component and `cn` helper | **CURRENT** |
| Repository documentation (README, this specification) | **CURRENT** |
| Neutral design tokens (placeholder; RED brand values pending) | **CURRENT** |
| Design system (typography, colour, components, motion) | **PLANNED** (Phase 1) |
| Authentication, database, ORM, validation, storage, permissions | **PLANNED** (Phase 1) |
| Unified workspace, Brand Profile, Artist Profile | **PLANNED** (Phase 1) |
| Customer dashboard, documents, marketing, releases, requests, library | **PLANNED** (Phase 2) |
| Requests, projects, production jobs, deliverables, versions, reviews, approvals, deliveries | **PLANNED** (Phase 3) |
| Private KeedoHub Studio and internal production capabilities | **PLANNED** (Phase 4) |
| Security/isolation audits, monitoring, backups, E2E tests, launch | **PLANNED** (Phase 5) |
| Automation inside production capabilities | **FUTURE/OPTIONAL** |
| Workspace team members, billing, localisation, native apps | **FUTURE/OPTIONAL** |

## Appendix C — Glossary

| Customer-facing term | Internal meaning |
| --- | --- |
| My Projects | Projects in the workspace |
| My Requests | Requests and their validation/lifecycle state |
| My Documents | Document-type deliverables and their source files |
| My Assets | Identity assets, uploads and reusable resources |
| My Releases | Artist releases and their creative packages |
| Review | The review step on a specific deliverable version |
| Approve | Approval action bound to a version |
| Request Changes | Change request with mandatory feedback; returns the job to production |
| Delivered | Delivery completed; files available in the library |
| In Production | A job is being produced (queue states are not shown) |
| Brand DNA | Structured brand profile data used internally during production |
| Artist identity | Structured artist profile data used internally during production |
| Studio | The private KeedoHub production environment |
| Production Job | Internal unit of production for one deliverable or tight group |
| Internal QA | Internal quality gate before customer review |

## Appendix D — Quick reference for coding agents

**Read first:** this specification and `README.md`. Do not inspect or reuse any other product's code, schema or terminology.

**Never do:**

1. Do not add a customer-facing editor, canvas, layer tooling or visual generator.
2. Do not introduce campaign concepts, entities, navigation or vocabulary.
3. Do not expose internal vocabulary in customer-facing strings (§24.3).
4. Do not build later-phase systems early (no database/auth/storage/Studio before their phase).
5. Do not implement authorisation with hardcoded admin booleans, email checks, hidden buttons or frontend-only permissions.
6. Do not let data access run without an explicit workspace scope.
7. Do not overwrite versions, or delete customer work, or deliver unapproved work.
8. Do not introduce microservices, speculative folders or unnecessary abstraction.
9. Do not describe planned work as complete in documentation.
10. Do not invent a brand palette: the brand colour is RED, with values defined in the design-system phase.

**Always do:**

1. Keep the customer experience small, calm and outcome-focused.
2. Keep production capability inside the Studio.
3. Enforce authorisation server-side, fail closed, and make scope explicit in data access.
4. Preserve versions, feedback history and state transitions.
5. Validate input at every boundary.
6. Provide intentional empty, loading and error states.
7. Keep customer copy in approved vocabulary.
8. Run `npm run lint`, `npx tsc --noEmit` and `npm run build` before declaring work complete.
9. Update this specification when a decision changes; do not leave it contradicting the code.

**Phase gates:** exactly five phases (§28), each with a Definition of Done (§29). Do not start a phase before the previous one's criteria are met.

## Appendix E — Document change log

| Version | Change |
| --- | --- |
| 1.0 | Initial master specification: product vision, principles, customer experience, domain models (workspace, brand, artist, request, project, production job, deliverable, asset, review, delivery, library), Studio, security, isolation, storage, notifications, design and terminology rules, technical architecture, testing, operations, five-phase roadmap, definitions of done, non-goals and appendices. |

---

*End of specification.*
