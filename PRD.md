# Playflow / Pleyflow — Gamified Marketing Automation Platform
## PRD (AI-Agent Ready)

> **Purpose:** Build a Vercel-first, no-code gamified marketing platform combining Scratcher/Playable (games + templates), Triggerbee/OptiMonk (onsite popups + targeting), and Drip-style (automation + segmentation).
>
> **Primary users:** Marketers, agencies, and large enterprises (especially webshops/e-commerce).
>
> **Top priorities:** (1) Game variety, (2) Ease of use, (3) Integrations + automation.

---

## 1. Product Summary

### 1.1 Vision
Enable marketers to launch high-converting gamified experiences (popups, embedded, landing pages) with automation and integrations—without code—while capturing zero/first-party data and driving conversion.

### 1.2 Outcomes
- Increase email/SMS capture and conversion rates
- Improve engagement time and brand interaction
- Collect preference/quiz data (zero-party)
- Trigger follow-up journeys in ESP/CRM (Drip-style)

### 1.3 Non-goals (initial)
- Building a full CDP replacement
- Complex real-time collaborative editing (Google-docs level)
- Fully bespoke game development for each customer (start template-based)

---

## 2. Target Users & Personas

### 2.1 Personas
1. **E-commerce Growth Marketer**
   - Wants onsite popups (exit intent/cart), gamified discounts, list growth
2. **Agency Campaign Manager**
   - Needs fast template creation, multi-client workspaces, approvals, reporting
3. **Enterprise CRM/Martech Lead**
   - Needs integrations, compliance, SSO, RBAC, data governance

### 2.2 Top Use Cases
- Spin-to-win popup to capture email + deliver coupon
- Scratchcard for product launch & discount reveal
- Quiz for lead qualification + segmentation tags (ESP/CRM)
- Advent calendar for daily returning traffic
- Mystery box/instant win for cart recovery
- Embedded “game section” on site (always-on engagement hub)
- Campaign links for email/social + QR code for offline → online

---

## 3. Product Scope (MVP-to-Scale)

### 3.1 Core concept: Flow + Blocks
All campaigns are defined as **Flows** composed of **Blocks**.

**Flow examples**
- Trigger → Popup → Game → Form → Outcome → Integration Action
- Trigger → Embedded Game → Outcome → Integration Action
- Landing Page → Quiz → Segment Assignment → ESP Sync

**Block types (minimum)**
- TriggerBlock (time, scroll, exit-intent, click, URL rules)
- ContainerBlock (popup layout, embedded container, landing page)
- GameBlock (template + config)
- FormBlock (email/SMS + custom fields + consent)
- OutcomeBlock (win/lose messaging, reward reveal)
- CTAActionBlock (buttons, links, product CTA)
- IntegrationActionBlock (webhook, ESP/CRM sync, tags, events)

---

## 4. Functional Requirements

### 4.1 Game Library & Templates
**Requirement:** Provide a library of game templates categorized by type:
- Luck: Spin-to-win, scratchcard, lottery/draw
- Knowledge: Quiz, poll, survey, product recommender quiz (phase 2)
- Skill: Memory match, simple arcade (phase 2+)
- Seasonal: Advent calendar (phase 2+), countdown, etc.

**MVP game set**
- Spin-to-win
- Scratchcard
- Quiz (simple linear)
- Poll/Survey
- Instant win “mystery box” (optional MVP if time permits)

**Template behavior**
- Each game template includes default styling + content placeholders
- Templates must be fully reskinnable (brand colors, fonts, imagery)
- Prize logic must be configurable (probability, inventory)

**Acceptance Criteria**
- A marketer can create and publish a working “spin-to-win” campaign in under 30 minutes
- Games function on mobile and desktop; responsive by default

---

### 4.2 No-Code Builder (Campaign Studio)
**Requirement:** Visual editor to build campaigns without coding:
- Choose template → customize → publish
- Drag/drop blocks (or block list + layout editor)
- Brand kit (colors/fonts/logo)
- Preview mode with test playthrough
- Versioning and drafts (Phase 2: approvals)

**Builder must support**
- Multi-step flows (page/step navigation)
- Real-time validation (missing required fields, invalid prize setup)
- Reusable templates (“Save as Template”)

**Acceptance Criteria**
- Campaign config is always valid JSON per schema (cannot publish invalid config)
- Preview matches published experience (same config)

---

### 4.3 Onsite Popups (OptiMonk/Triggerbee-style)
**Requirement:** Campaigns deployable as onsite popups with triggers + targeting.

**Popup display modes**
- Modal center
- Slide-in corner
- Top/bottom bar
- Fullscreen takeover (phase 2)

**Triggers (MVP)**
- Time delay
- Scroll %
- Exit intent
- Click trigger

**Targeting (MVP)**
- URL contains/equals
- Device type
- New vs returning (cookie)

**Targeting (Phase 2)**
- UTM/referrer/source
- Cart value / cart presence (Shopify integration)
- Audience segments from ESP/CRM attributes

**Acceptance Criteria**
- Frequency capping works (e.g., show once per 7 days)
- Trigger rules work across major browsers

---

### 4.4 Data Capture (Forms + Zero-Party Data)
**Requirement:** Collect lead data and enrichment fields.
- Email/SMS fields
- Custom fields (text, dropdown, multi-select)
- Consent checkbox (GDPR-friendly)
- Double opt-in support (phase 2)

**Acceptance Criteria**
- All submissions stored with workspace + campaign + version
- Field mapping supports integrations

---

### 4.5 Rewards & Prize Engine
**Requirement:** Support prize definition + delivery + inventory enforcement.

**Prize types (MVP)**
- Coupon code (static or unique)
- “No win” / consolation message

**Prize configuration**
- Probability/odds per prize
- Quantity limits for unique codes
- Prize assignment logged with user/session

**Delivery**
- Show code on screen
- Email code (MVP optional; Phase 2 robust email module)

**Acceptance Criteria**
- No code is issued twice (unique codes)
- Probability behaves as configured until inventory exhausted

---

### 4.6 Analytics & Reporting
**MVP metrics**
- Impressions, opens, plays, completions, submissions
- Conversion rate (submission / impression, submission / play)
- Prize claim counts
- Breakdown by campaign version

**Phase 2+**
- Funnel breakdown by step
- Segment performance comparison
- Export (CSV)
- Scheduled reports

**Acceptance Criteria**
- Dashboard updates within minutes of activity
- Export produces correct schema, consistent IDs

---

### 4.7 Integrations & Automation (Drip-style)
**MVP integrations**
- Webhooks (generic)
- Zapier-like integration path (can be webhooks first)
- 1–2 native: Klaviyo + HubSpot (recommended early for webshops/enterprise)

**Integration actions**
- Create/update contact
- Add tag / list
- Send event (e.g., “played_game”, “won_prize”)
- Attach custom properties (quiz answers, preferences)

**Automation (MVP)**
- Simple triggers:
  - On submission → send webhook / sync contact
  - On prize → send event to ESP/CRM
- Phase 2: multi-step drip workflows + delays + branching

**Acceptance Criteria**
- Idempotency for repeated sync events
- Retry with backoff for integration failures + logs visible to user

---

### 4.8 Workspaces, RBAC, and Enterprise Readiness
**MVP**
- Workspaces (tenants)
- Basic roles: Owner/Admin/Editor/Analyst
- Audit log for publishes

**Phase 2+**
- SSO (SAML/OIDC)
- Advanced permission sets
- Data residency options

**Acceptance Criteria**
- Strict tenant isolation
- Role permissions enforced on all endpoints

---

### 4.9 Security Requirements (Vibe Security Compliance)

> **Reference:** Based on vibe security checker guidelines. 45% of AI-generated code contains vulnerabilities (Veracode 2025).

**Authentication & Authorization**
- All password hashing must use bcrypt or Argon2 (no MD5/SHA1)
- Tokens stored in HttpOnly cookies only (never localStorage)
- All API routes must check resource ownership, not just auth status (IDOR prevention)
- Row-Level Security (RLS) enabled on all tenant-scoped database tables
- Session cookies: `httpOnly=true`, `secure=true`, `sameSite=strict`
- Rate limiting on auth endpoints (login, signup, password reset)

**Injection Prevention**
- All database queries must use parameterized queries (Prisma handles this)
- No `dangerouslySetInnerHTML` without DOMPurify sanitization
- No `eval()`, `new Function()`, or dynamic code execution with user input
- All user input sanitized before logging (prevent log injection)
- No template literals in raw SQL queries

**Infrastructure Security**
- CORS configured with explicit allowed origins (no `*` in production)
- All API keys/secrets in environment variables (never hardcoded)
- Separate environment configs for dev/staging/production
- Service role keys (Supabase/Firebase) server-side only, never in frontend
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`
- HTTPS enforced everywhere

**Secrets Management**
- No secrets in code repositories (use `.env` files + `.gitignore`)
- No API keys in frontend bundles (except public keys like Clerk publishable key)
- Webhook secrets validated with HMAC signatures
- All third-party API keys stored encrypted at rest

**Supply Chain Security**
- Dependencies audited before installation (`npm audit`)
- No packages from unknown/hallucinated names
- Lock file (`package-lock.json`) committed to repository
- Dependabot or similar for automated security updates

**Acceptance Criteria**
- Security scan passes with no CRITICAL findings before deployment
- All HIGH severity issues documented with remediation timeline
- Manual review checklist completed for auth flows

---

## 5. Technical Architecture & Stack (AI-Agent Ready)

### 5.1 Technology Stack (Required)

**Frontend / Admin UI**
- Next.js (App Router) + React + TypeScript
- TailwindCSS + shadcn/ui
- Zod for schema validation
- TanStack Query (or tRPC if chosen)

**Backend / Control Plane APIs**
- TypeScript API layer (Next.js route handlers OR dedicated API via Fastify/NestJS)
- Prisma ORM
- PostgreSQL (Neon recommended)

**Auth & Multi-tenancy**
- Clerk (default) or Auth0 (enterprise option)
- Workspace/tenant isolation via `workspace_id` required on all core tables
- RBAC roles: Owner / Admin / Editor / Analyst

**Edge + Delivery**
- Cloudflare CDN for `snippet.js` + game assets
- Optional: Cloudflare Worker for low-latency config fetch + caching

**Event Ingestion & Processing**
- Ingestion endpoint: Cloudflare Worker (preferred) or lightweight Node service
- Queue: Upstash Redis (fast start) or AWS SQS (later)
- Workers: BullMQ on a container host (Fly.io/Railway) or Trigger.dev

**Analytics**
- MVP: PostHog for funnels, cohorts, feature flags
- Later: ClickHouse for raw event storage at scale

**Observability**
- Sentry (errors)
- Structured logs (JSON) with request IDs
- OpenTelemetry + APM (optional later)

---

### 5.2 System Boundaries (Must Follow)
AI agents must keep system components separated:

1. **Control Plane (Vercel)**
   - Campaign builder UI
   - Campaign CRUD APIs
   - Integration setup UI (OAuth, API keys)
   - Template and asset management

2. **Delivery Plane (CDN + snippet)**
   - A single customer-installed JavaScript snippet loads campaign config and renders experiences

3. **Event Plane (ingest + queue + workers)**
   - All runtime events (views, clicks, plays, submissions, conversions) go to ingest → queue → processing

4. **Analytics Plane**
   - Aggregated metrics exposed to dashboard
   - Optional: mirror key events into PostHog

---

### 5.3 Required Runtime Components

#### 5.3.1 Customer Snippet (`playflow.js`)
**Requirements**
- Must be < 50KB gzipped (target) and async loaded
- Loads config JSON for current page/context
- Renders popup/embedded experience
- Handles triggers: time, scroll, exit intent, click (cart rules later)
- Batches and retries events (best-effort offline safe)
- Versioned URL support: `/playflow.v1.js`, `/playflow.v2.js` for safe rollouts

**Events emitted (minimum)**
- `impression`
- `open`
- `close`
- `start_game`
- `finish_game`
- `form_submit`
- `prize_awarded`
- `cta_click`

#### 5.3.2 Campaign Config Format (Declarative)
All campaigns must be stored as a **validated JSON config**.

**Core abstraction**
- A campaign is a **Flow**
- A Flow contains **Blocks**
- Blocks include: Trigger, Popup Container, Game, Form, Outcome, Integration Action

**Implementation rule**
- AI agents must implement config schema first (Zod + DB persistence), then build UI around it.

#### 5.3.3 Event Ingestion
- Endpoint must accept batched events
- Must validate schema and attach `workspace_id`, `campaign_id`, `session_id`
- Must push to queue for processing (no heavy compute inline)

#### 5.3.4 Workers
Workers consume queued events and perform:
- Aggregations (counts, funnels, conversions)
- Trigger checks (drip / follow-ups)
- Integration sync actions (webhooks, CRM writes)
- Prize inventory enforcement (prevent over-issuing)

---

### 5.4 Data Model Requirements (Minimum Tables)
AI agents must create these tables early:

- `workspaces`
- `users`
- `workspace_members` (RBAC)
- `campaigns` (metadata)
- `campaign_versions` (immutable configs + published pointer)
- `assets` (images, audio, etc.)
- `prizes` + `prize_codes`
- `submissions` (form/quiz answers)
- `events_raw` (optional) OR event stream storage strategy
- `events_agg_daily` (or equivalent aggregates)
- `integrations` (credentials + settings)
- `integration_jobs` (sync logs + retries)

---

### 5.5 Deployment Topology (Recommended)
- `app.playflow.com` → Vercel (Next.js)
- `cdn.playflow.com` → Cloudflare (snippet + assets)
- `ingest.playflow.com` → Cloudflare Worker
- `workers.playflow.com` → Fly.io/Railway (BullMQ workers)

---

### 5.6 Non-Functional Requirements
- P95 config fetch < 200ms (edge cached)
- Snippet must not block page rendering
- GDPR: data deletion by user identifier
- Audit logs for campaign publish changes
- Rate limiting on ingest + API
- Version rollback for campaigns

---

## 6. Security & Compliance
- Tenant isolation mandatory (workspace_id scoping)
- Encrypt secrets (integration credentials) at rest
- Least privilege RBAC
- Audit logs for publish/config changes
- GDPR deletion/export flows (phase 2 for UI, MVP can be admin tool)

---

## 7. Phased Rollout Plan

### Phase 1 — MVP (8–12 weeks target, flexible)
**Goal:** Ship a working platform that creates & deploys gamified popups + captures leads + sends to integrations.

**Includes**
- Workspaces + basic RBAC
- Campaign Studio (basic block builder + templates)
- Games: spin-to-win, scratchcard, quiz, poll/survey
- Popup triggers: time, scroll, exit intent, click
- Lead capture forms + consent checkbox
- Prize engine: coupon codes (static + unique import), odds, inventory
- Publishing: snippet embed + landing page link
- Events + basic analytics dashboard
- Integrations: webhooks + 1 native (Klaviyo OR HubSpot)

**Excludes**
- Advanced targeting, cart rules, loyalty wallet, advanced A/B testing, deep ecom integrations

### Phase 2 — Growth (templates + targeting + integrations)
- Expand game library (20–40 total)
- Advanced popup formats + targeting rules
- Multi-language campaigns
- Email module (winner delivery, reminders, opt-in flows)
- More native integrations (HubSpot, Salesforce, Mailchimp, Shopify)
- Improved analytics funnels + exports + scheduled reports
- Multi-client agency workflows (multiple workspaces, approvals)

### Phase 3 — Enterprise + AI Optimization
- SSO (SAML/OIDC), advanced permissions
- Advanced automation workflows (delays, branching, multi-step drip)
- A/B testing + variant management
- AI campaign copilot (generate flows/blocks/copy)
- ClickHouse analytics at scale + insights recommendations

---

## 8. AI-Agent Execution Plan (Build Order)

### 8.1 Guardrails
- All endpoints must be workspace-scoped
- Campaign publishing requires immutable `campaign_versions`
- No direct writes to aggregates from client; all via event pipeline
- All configs validated via Zod before persistence or publish

### 8.2 Work Breakdown (Recommended Sequence)
1. **Data model + Prisma** (workspaces, campaigns, versions, prizes, submissions, integrations)
2. **Auth + RBAC middleware**
3. **Campaign config schema (Zod) + versioning**
4. **Basic Campaign Studio UI** (template select, edit, preview)
5. **Snippet v1** (load config, render popup container, trigger logic, event batching)
6. **Event ingest + queue + worker** (store events + compute aggregates)
7. **Prize engine** (odds + unique codes + issuance logging)
8. **Form capture + submission storage**
9. **Webhook integration + logs**
10. **Analytics dashboard**
11. **Polish** (templates, brand kit, QA, docs)

---

## 9. Definition of Done (MVP)
A campaign can be:
- created from a template
- branded
- configured with triggers
- published
- embedded on a webshop via snippet
- played by users on mobile/desktop
- captures email + consent
- issues a coupon code (unique)
- sends webhook or sync to one ESP/CRM
- displays analytics within minutes

---
