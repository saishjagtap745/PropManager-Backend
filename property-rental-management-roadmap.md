# Property Rental Management System — Complete Project Roadmap

**Team size:** 4 students | **Stack:** Next.js / Express.js / Supabase PostgreSQL | **Duration:** 11 weeks

---

## Executive Summary

This roadmap takes a 4-person student team from a blank repository to a deployed, demo-ready Property Rental Management System. The system gives Admins full control over users, properties, tenants, agreements and payments; gives Property Managers day-to-day control of their assigned properties; and gives Tenants read-only visibility into their own lease and payment history. The build is sequenced so that Authentication ships first (everything else depends on it), then Property and Tenant management (the core entities), then Agreements and Payments (the modules with real business logic), and finally Dashboards, Testing, Deployment, and Documentation. Each phase below lists objectives, features, deliverables, a timeline slot, team responsibilities, and risks, so the team can use this document as a literal week-by-week checklist rather than just a concept brief.

---

## Phase 1 — Requirements Gathering

**Estimated timeline:** Week 1 (shared across all 4 members) | **Risks:** vague scope leads to feature creep mid-project; mitigate by freezing the MVP list below before coding starts.

### Problem Statement
Property owners and managers currently track properties, tenants, lease terms, and rent payments through spreadsheets or paper records. This causes missed rent collection, confusion over which properties are vacant, lost agreement documents, and no single source of truth for occupancy or revenue. A centralized web platform with role-based access removes this friction.

### Project Goals
- Provide a single system of record for properties, tenants, agreements, and payments.
- Enforce business rules automatically (no double-leasing a property, automatic occupancy status).
- Give each role (Admin, Manager, Tenant) a dashboard relevant to what they need to see.
- Be deployable and demoable within an 11-week academic timeline.

### User Stories

| Role | Story |
|---|---|
| Admin | As an Admin, I want to create and deactivate user accounts so I control who can access the system. |
| Admin | As an Admin, I want to view all properties and agreements across managers so I have a full overview. |
| Admin | As an Admin, I want to see total revenue and outstanding balances so I can assess business health. |
| Property Manager | As a Manager, I want to add and edit only the properties assigned to me so I don't touch others' portfolios. |
| Property Manager | As a Manager, I want to create a rental agreement for a vacant property so I can lease it out. |
| Property Manager | As a Manager, I want to record a payment against an agreement so the tenant's balance updates. |
| Tenant | As a Tenant, I want to view my current lease terms so I know my rent amount and end date. |
| Tenant | As a Tenant, I want to view my payment history so I can confirm what I've paid. |
| Tenant | As a Tenant, I want to update my contact details so my profile stays current. |

### Functional Requirements
- User registration/login via Supabase Auth, with role assigned at creation (admin assigns roles; tenants are typically invited).
- CRUD operations on Properties, Tenants, Agreements, Payments, scoped by role.
- One active agreement per property at any time (enforced at the database level, not just the UI).
- Property status (`vacant` / `occupied` / `maintenance`) updates automatically when an agreement is created, terminated, or expires.
- Payment status tracking (`paid` / `pending` / `overdue`) and outstanding balance calculation per agreement.
- Role-specific dashboards with summary KPIs and charts.

### Non-Functional Requirements
- **Security:** all API routes protected by JWT (Supabase session token) and role checks; Supabase Row-Level Security (RLS) as a second layer of defense.
- **Usability:** responsive UI (desktop + tablet at minimum) using shadcn/ui components for consistency.
- **Maintainability:** TypeScript end-to-end (frontend and backend) to catch schema/type mismatches early.
- **Performance:** acceptable for an academic-scale dataset (hundreds, not millions, of rows) — no need for premature optimization.
- **Auditability:** `created_at` / `updated_at` timestamps on every table for traceability during grading/demo.

### Scope Definition
In scope: the five core entities (Users, Properties, Tenants, Agreements, Payments), three roles, CRUD + business rules + dashboards, deployment to Vercel/Render/Supabase.
Out of scope: online rent payment processing, e-signatures, SMS/email automation, mobile apps, multi-tenant SaaS billing.

### MVP Scope
Auth (3 roles) → Property CRUD → Tenant CRUD → Agreement creation with the "one active agreement per property" rule → Payment recording → one dashboard per role with at least 3 KPIs each.

### Future Enhancements
Automated rent-due email/SMS reminders, online payment gateway (Stripe/Razorpay), e-signature on agreement documents, maintenance request module, multi-property-owner support (an Admin tier above Manager that owns properties but doesn't operate them day-to-day).

---

## Phase 2 — System Design

**Estimated timeline:** Week 1–2 | **Team responsibilities:** Database Lead drives schema and ERD; Backend Lead drives API/architecture; Frontend Lead drives page map | **Risks:** schema rework later if relationships aren't validated against all three roles' needs now — review the schema against every user story above before moving to Phase 3.

### System Architecture

```
┌──────────────────────┐        HTTPS/JSON         ┌──────────────────────┐
│   Next.js Frontend    │ ─────────────────────────▶│  Express.js Backend  │
│  (React + TS + Tailwind)│◀────────────────────────│   (Node.js + TS)     │
│   Deployed on Vercel  │      JWT in Authorization  │  Deployed on Render  │
└──────────────────────┘            header           └──────────┬────────--┘
        │                                                        │
        │ Supabase Auth (login/signup, session, JWT issuance)    │ Supabase client (service role)
        ▼                                                        ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL + Auth)                     │
│   auth.users  ──sync──▶  public.users  ──▶  properties / tenants /   │
│                                              agreements / payments    │
└────────────────────────────────────────────────────────────────────┘
```

- **Frontend architecture:** Next.js App Router. Route groups split by role: `(admin)`, `(manager)`, `(tenant)`, each with its own layout that checks role before rendering. Shared UI in `components/ui` (shadcn/ui), shared data-fetching hooks in `lib/hooks`.
- **Backend architecture:** Express.js with a layered structure — `routes` → `controllers` → `services` → `repositories` (Supabase queries). Middleware handles JWT verification and role-based guard checks before any controller runs.
- **Database architecture:** Supabase PostgreSQL, 5 core tables (below), with foreign keys and check constraints enforcing business rules at the DB layer so they hold even if the API has a bug.
- **Authentication flow:** User signs up/logs in via Supabase Auth → Supabase issues a JWT → frontend stores session via Supabase client and attaches the JWT to every Express API call → Express middleware verifies the JWT against Supabase's public key and reads the `role` claim (synced from `public.users`) to authorize the request.

### Entity Relationship Diagram
The full ERD is provided as a separate Mermaid file (`property-rental-erd.mermaid`) so it can be rendered visually or pasted into the documentation report. Relationships: a user optionally has one tenant profile; a user (manager) manages many properties; a property has many agreements over time but only one active at a time; a tenant has many agreements; an agreement has many payments.

### Database Schema

**users**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, references `auth.users.id` |
| name | text | not null |
| email | text | unique, not null |
| role | text | not null, check in ('admin','manager','tenant') |
| phone | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**properties**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| title | text | not null |
| description | text | nullable |
| address | text | not null |
| city | text | not null |
| type | text | check in ('apartment','house','commercial','studio') |
| bedrooms | int | nullable |
| bathrooms | int | nullable |
| rent_amount | numeric(10,2) | not null |
| status | text | default 'vacant', check in ('vacant','occupied','maintenance') |
| manager_id | uuid | FK → users.id |
| created_at / updated_at | timestamptz | default now() |

**tenants**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → users.id, unique |
| phone | text | nullable |
| emergency_contact | text | nullable |
| id_proof_url | text | nullable |
| created_at | timestamptz | default now() |

**agreements**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| property_id | uuid | FK → properties.id |
| tenant_id | uuid | FK → tenants.id |
| start_date | date | not null |
| end_date | date | not null, check (end_date > start_date) |
| rent_amount | numeric(10,2) | not null |
| deposit_amount | numeric(10,2) | default 0 |
| status | text | default 'active', check in ('active','expired','terminated') |
| document_url | text | nullable |
| created_at | timestamptz | default now() |

A **partial unique index** enforces "one active agreement per property":
```sql
CREATE UNIQUE INDEX one_active_agreement_per_property
ON agreements (property_id)
WHERE status = 'active';
```

**payments**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| agreement_id | uuid | FK → agreements.id |
| amount | numeric(10,2) | not null |
| due_date | date | not null |
| payment_date | date | nullable (null until paid) |
| status | text | default 'pending', check in ('paid','pending','overdue') |
| payment_method | text | nullable |
| created_at | timestamptz | default now() |

---

## Phase 3 — Project Setup

**Estimated timeline:** Week 2 | **Team responsibilities:** all 4 members pair up — 2 set up backend/Supabase, 2 set up frontend/Vercel — then sync.

### GitHub Repository & Branch Strategy
- One monorepo, two top-level folders (`frontend/`, `backend/`).
- `main` is always deployable. `develop` is the integration branch. Each feature gets `feature/<module>-<short-desc>` branched from `develop`, merged via pull request with at least one teammate review.
- Protect `main` and `develop`: require PR + passing checks before merge.

### Folder Structure
```
property-rental-management/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/  (auth)/register/
│   │   ├── (admin)/dashboard/ (admin)/properties/ (admin)/users/ ...
│   │   ├── (manager)/dashboard/ (manager)/properties/ (manager)/agreements/ ...
│   │   └── (tenant)/dashboard/ (tenant)/agreement/ (tenant)/payments/
│   ├── components/ui/        # shadcn/ui components
│   ├── lib/supabaseClient.ts
│   ├── lib/api.ts            # fetch wrapper attaching JWT
│   └── lib/hooks/
├── backend/
│   ├── src/
│   │   ├── routes/           # properties.routes.ts, tenants.routes.ts, ...
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/     # Supabase queries
│   │   ├── middleware/       # auth.middleware.ts, role.middleware.ts
│   │   └── server.ts
│   └── package.json
├── docs/
│   ├── erd.png
│   └── api-spec.md
└── README.md
```

### Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Public anon key for client auth |
| `NEXT_PUBLIC_API_URL` | frontend | Render backend URL |
| `SUPABASE_URL` | backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Server-side key (bypasses RLS for trusted backend operations) — never exposed to frontend |
| `JWT_SECRET` / Supabase JWKS | backend | For verifying incoming JWTs |
| `PORT` | backend | Render assigns this automatically |

### Supabase Setup
1. Create a new Supabase project, note the URL and keys.
2. Run the schema SQL from Phase 2 in the SQL editor (tables, constraints, the partial unique index).
3. Enable Row-Level Security on all 5 tables; write policies so tenants can only `SELECT` their own agreement/payment rows, managers only their assigned properties, admins everything.
4. Set up a Postgres trigger or Supabase Edge Function to sync new `auth.users` rows into `public.users` on signup.

### Vercel Setup
1. Import the GitHub repo, set root directory to `frontend/`.
2. Add the `NEXT_PUBLIC_*` environment variables in Vercel project settings.
3. Connect `main` branch for production deploys, `develop` for preview deploys (every PR gets a preview URL automatically — useful for grading/demo).

### Render Setup
1. Create a new Web Service from the GitHub repo, root directory `backend/`.
2. Build command `npm install && npm run build`, start command `npm start`.
3. Add the backend environment variables above in Render's dashboard.
4. Note Render's free tier spins down on inactivity — mention this during the live demo so a "cold start" delay isn't mistaken for a bug.

---

## Phase 4 — Authentication Module

**Estimated timeline:** Week 2–3 | **Team responsibilities:** 1 backend dev builds middleware/API, 1 frontend dev builds pages | **Risks:** role-checking bugs (a tenant reaching a manager route) are the most embarrassing demo failure — write tests for this specifically.

### API Design

| Method | Route | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Create user via Supabase Auth, insert into `public.users` | Public |
| POST | `/api/auth/login` | Delegate to Supabase Auth, return session | Public |
| POST | `/api/auth/logout` | Invalidate session | Authenticated |
| POST | `/api/auth/reset-password` | Trigger Supabase password reset email | Public |
| GET | `/api/auth/me` | Return current user's profile + role | Authenticated |

### Database Requirements
Relies on `users` table plus Supabase's built-in `auth.users`. A database trigger (`on_auth_user_created`) inserts a matching row into `public.users` with a default role (e.g. `tenant`) whenever someone signs up; Admins can later promote a user to `manager` or `admin`.

### Frontend Pages
`/login`, `/register`, `/forgot-password`, plus a `middleware.ts` (Next.js) that checks the session and redirects unauthenticated users to `/login`, and redirects authenticated users to the dashboard matching their role.

---

## Phase 5 — Property Management Module

**Estimated timeline:** Week 3–4 | **Team responsibilities:** 1 backend dev (API), 1 frontend dev (UI) | **Risks:** forgetting to scope queries by `manager_id` for the Manager role lets one manager see another's properties.

### Features
Property CRUD, search by title/city, filters (type, status, rent range), and manual status override (e.g. moving a property to `maintenance`).

### APIs

| Method | Route | Access |
|---|---|---|
| GET | `/api/properties` | Admin: all; Manager: only `manager_id = self` |
| GET | `/api/properties/:id` | Admin, assigned Manager |
| POST | `/api/properties` | Admin, Manager |
| PUT | `/api/properties/:id` | Admin, assigned Manager |
| DELETE | `/api/properties/:id` | Admin only |
| GET | `/api/properties?search=&type=&status=&minRent=&maxRent=` | Admin, Manager |

### UI Pages
Property list (table with filters/search bar), property detail page, create/edit property form (shadcn/ui `Dialog` or dedicated page), status badge component reused across the app.

### Database Interactions
Standard CRUD against `properties`; status field is also written indirectly by the Agreement module (Phase 7) when leases are created or end.

---

## Phase 6 — Tenant Management Module

**Estimated timeline:** Week 4 | **Team responsibilities:** same pairing as Phase 5 | **Risks:** a tenant record without a linked `users` row breaks the "tenant logs in and sees their own data" flow — always create both in one transaction.

### Features
Tenant CRUD (Admin/Manager), tenant-to-property assignment (handled formally via the Agreement, but the tenant list should show "currently assigned property" as a convenience), tenant self-service profile editing.

### APIs

| Method | Route | Access |
|---|---|---|
| GET | `/api/tenants` | Admin, Manager |
| GET | `/api/tenants/:id` | Admin, Manager, the tenant themself |
| POST | `/api/tenants` | Admin, Manager (creates `users` row with role=tenant + `tenants` row) |
| PUT | `/api/tenants/:id` | Admin, Manager, the tenant themself (profile fields only) |
| DELETE | `/api/tenants/:id` | Admin only |

### Validation Rules
Phone number format validation, required fields (`name`, `email`) before account creation, prevent deletion of a tenant who has an active agreement (return a 409 with a clear message instead).

---

## Phase 7 — Rental Agreement Module

**Estimated timeline:** Week 5–6 | **Team responsibilities:** most logic-heavy module — pair both backend devs on this one | **Risks:** this is the highest-risk module in the whole project; the double-leasing and auto-occupancy rules need real test cases, not just happy-path manual checks.

### Features
Agreement creation, renewal (close old agreement as `expired`, open a new one), termination (early end, sets property back to `vacant`).

### Business Rules & Implementation
- **One active agreement per property:** enforced by the partial unique index from Phase 2. The API should also pre-check and return a friendly 409 error rather than relying solely on the DB error message.
- **No double leasing:** before creating an agreement, verify the property's current `status = 'vacant'`. Wrap the property-status update and agreement insert in a single database transaction so they can't desync.
- **Automatic occupancy updates:** on agreement creation → property status becomes `occupied`. On termination/expiry → property status becomes `vacant`. Implement this as a Postgres trigger on the `agreements` table (fires on INSERT/UPDATE of `status`) so it holds true even if a teammate's API code has a bug — this is the safest way to guarantee the rule for grading purposes.

### APIs

| Method | Route | Access |
|---|---|---|
| GET | `/api/agreements` | Admin: all; Manager: own properties; Tenant: own agreement |
| POST | `/api/agreements` | Admin, Manager |
| PUT | `/api/agreements/:id/renew` | Admin, Manager |
| PUT | `/api/agreements/:id/terminate` | Admin, Manager |

---

## Phase 8 — Payment Management Module

**Estimated timeline:** Week 6 | **Team responsibilities:** 1 backend dev (logic), 1 frontend dev (UI) | **Risks:** outstanding-balance math is easy to get wrong if partial payments exist — for MVP, keep it simple (one payment row per due period, full amount or nothing) and note partial payments as a future enhancement.

### Features
Payment recording (Manager marks a due payment as paid), payment history per agreement, outstanding balance calculation, monthly revenue tracking for dashboards.

### APIs

| Method | Route | Access |
|---|---|---|
| GET | `/api/payments?agreementId=` | Admin, Manager, the tenant on that agreement |
| POST | `/api/payments` | Admin, Manager (record a payment) |
| PUT | `/api/payments/:id` | Admin, Manager (mark status, set payment_date) |
| GET | `/api/payments/summary?month=&year=` | Admin, Manager (revenue rollups) |

### Database Logic
A scheduled job (or simply a computed check on read) marks `pending` payments whose `due_date` has passed as `overdue`. Outstanding balance for an agreement = sum of `amount` where `status != 'paid'`.

### UI Design
Payment table with status badges (green/paid, amber/pending, red/overdue), a "Record Payment" action button for Managers, and a read-only history view for Tenants.

---

## Phase 9 — Dashboard & Analytics

**Estimated timeline:** Week 7 | **Team responsibilities:** 1 backend dev (aggregation endpoints), 2 frontend devs (charts) | **Risks:** chart libraries can eat time — use shadcn/ui's chart components (built on Recharts) rather than building custom visualizations from scratch.

### Admin Dashboard
KPIs: total properties, occupied count, vacant count, total revenue (sum of paid payments this month), total outstanding balance. Charts: revenue trend (line, last 6 months), occupancy split (pie).

### Property Manager Dashboard
KPIs: assigned properties count, active agreements count, payments collected this month. Chart: payments collected vs. due, last 6 months (bar).

### Tenant Dashboard
Current lease summary card (property, rent, end date), payment history table, next due payment highlighted.

### Implementation Note
Build one aggregation endpoint per dashboard (`/api/dashboard/admin`, `/api/dashboard/manager`, `/api/dashboard/tenant`) that returns pre-computed numbers, rather than having the frontend pull raw rows and compute KPIs client-side — faster to build, easier to test, and keeps business logic in one place.

---

## Phase 10 — Testing

**Estimated timeline:** Week 8 | **Team responsibilities:** all 4 members test their own modules, then cross-test each other's | **Risks:** running out of time for testing is the most common student-project failure — don't let this phase get skipped if earlier phases run late.

### Unit Testing Plan
Backend: Jest tests for service-layer functions (e.g. outstanding balance calculation, the "one active agreement" check) — these are pure logic and the highest-value tests to write. Frontend: component tests for form validation (React Testing Library) where time allows.

### Integration Testing Plan
Use Supertest against a test Supabase instance (or a local Postgres test DB) to verify: agreement creation correctly flips property status, terminating an agreement correctly flips it back, role-based route protection actually blocks the wrong role (test all three roles against all protected routes).

### User Acceptance Testing Plan
Walk through each user story from Phase 1 as a manual test script with one teammate playing each role; confirm every story's acceptance criteria are met before moving to deployment.

### Bug Tracking Workflow
Use GitHub Issues with labels (`bug`, `priority-high`, `module:agreements`, etc.) and a simple Kanban project board (To Do / In Progress / Review / Done) so the team has a visible backlog during grading.

---

## Phase 11 — Deployment

**Estimated timeline:** Week 9 | **Team responsibilities:** Database/DevOps lead drives this phase, others support | **Risks:** environment variable mismatches between local and production are the #1 cause of "works on my machine" deploy failures — double-check every env var listed in Phase 3 is set in Vercel and Render before the first deploy attempt.

### Frontend (Vercel)
Push to `main` → Vercel auto-builds and deploys. Confirm `NEXT_PUBLIC_API_URL` points to the live Render URL (not localhost) before final deploy.

### Backend (Render)
Push to `main` → Render auto-builds and deploys (if auto-deploy is enabled on the service). Confirm CORS is configured on the Express app to allow the Vercel domain.

### Database (Supabase)
Already live from Phase 3 — no separate deploy step, but double-check RLS policies are active (not just defined) before the demo, since a misconfigured policy can either lock everyone out or leave data wide open.

### CI/CD with GitHub Actions
A minimal workflow that runs backend tests on every PR before allowing merge:

```yaml
name: Backend CI
on:
  pull_request:
    branches: [develop, main]
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test
```
Frontend and backend deploys themselves are handled by Vercel's and Render's own GitHub integrations — no separate deploy job is needed in Actions.

---

## Phase 12 — Documentation & Presentation

**Estimated timeline:** Week 10 | **Team responsibilities:** split writing across all 4 members, then one person edits for consistency

### Deliverables
- **Technical documentation:** architecture overview (reuse Phase 2 diagram), setup instructions (reuse Phase 3), module-by-module feature summary.
- **ERD documentation:** the Mermaid ERD plus a short explanation of each relationship and why the partial unique index exists.
- **API documentation:** a table per module (reuse the API tables from Phases 4–8) — consider also generating a Postman collection for the live demo.
- **User manual:** short walkthroughs per role with screenshots (login → dashboard → core action).
- **Presentation structure:** Problem → Solution Overview → Architecture → Live Demo (all 3 roles) → Challenges & Learnings → Future Work → Q&A.
- **Demo script:** log in as Admin (show dashboard + user management) → log in as Manager (create a property, create an agreement, record a payment) → log in as Tenant (view lease + payment history) — this sequence naturally proves every business rule works end-to-end.

---

## Team Management

### Role Assignments (4 students)

| Student | Primary Role | Secondary Role |
|---|---|---|
| A | Backend Lead (Auth, Properties API) | Project Manager (timeline, standups) |
| B | Backend Dev (Agreements, Payments API, DB triggers) | Database Designer |
| C | Frontend Lead (Auth pages, Property/Tenant UI) | DevOps support (Vercel) |
| D | Frontend Dev (Agreement/Payment UI, Dashboards) | QA & Documentation Lead |

### Sprint Plan (11 weeks, weekly check-ins)

| Week | Sprint Focus | Phase(s) | Key Output |
|---|---|---|---|
| 1 | Requirements + design kickoff | 1, 2 (start) | User stories, draft schema |
| 2 | Finalize design + project setup | 2 (finish), 3 | ERD finalized, repo + Supabase + Vercel + Render live |
| 3 | Authentication | 4 | Login/register/RBAC working end-to-end |
| 4 | Property + Tenant modules | 5, 6 | Property & Tenant CRUD complete |
| 5 | Agreements (part 1) | 7 | Agreement creation + business rules |
| 6 | Agreements (part 2) + Payments | 7, 8 | Renewal/termination + payment recording |
| 7 | Dashboards | 9 | All 3 role dashboards live with real data |
| 8 | Testing | 10 | Unit + integration tests passing, UAT script run |
| 9 | Deployment | 11 | Live production URLs for frontend + backend |
| 10 | Documentation | 12 | Full written deliverables drafted |
| 11 | Polish, rehearsal, presentation | 12 | Demo rehearsed, final submission |

### Milestones
- **M1 (end of Week 2):** Schema frozen, infra live, nobody blocked on setup.
- **M2 (end of Week 4):** Auth + Property + Tenant modules fully working.
- **M3 (end of Week 6):** Agreements + Payments fully working — this is the riskiest milestone, treat slippage here as urgent.
- **M4 (end of Week 9):** Live deployment, all roles demoable on production URLs.
- **M5 (end of Week 11):** Final submission and presentation delivered.

### Gantt-Style Timeline

| Phase | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Requirements | ▓ | | | | | | | | | | |
| 2. System Design | ▓ | ▓ | | | | | | | | | |
| 3. Project Setup | | ▓ | | | | | | | | | |
| 4. Authentication | | | ▓ | | | | | | | | |
| 5. Properties | | | | ▓ | | | | | | | |
| 6. Tenants | | | | ▓ | | | | | | | |
| 7. Agreements | | | | | ▓ | ▓ | | | | | |
| 8. Payments | | | | | | ▓ | | | | | |
| 9. Dashboards | | | | | | | ▓ | | | | |
| 10. Testing | | | | | | | | ▓ | | | |
| 11. Deployment | | | | | | | | | ▓ | | |
| 12. Docs & Presentation | | | | | | | | | | ▓ | ▓ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep beyond MVP | High | High | MVP list frozen in Phase 1; new ideas go into "Future Enhancements" |
| Double-leasing / occupancy bugs | Medium | High | Enforce via DB constraint + trigger, not app logic alone; dedicated integration tests |
| Role-based access bugs (wrong role reaches a route) | Medium | High | Centralized middleware, explicit test matrix (every role × every route) |
| Render free-tier cold starts during demo | Medium | Medium | Ping the backend a few minutes before presenting, or mention it upfront |
| RLS misconfiguration (data exposed or locked out) | Medium | High | Test each policy with a real token from each role before deployment |
| Uneven team workload near deadline | Medium | Medium | Weekly check-ins against the sprint plan; rebalance tasks early, not in Week 10 |
| Testing phase skipped due to earlier delays | High | High | Treat Week 8 as non-negotiable; if behind, cut a "future enhancement," not testing |

---

## Appendix — Consolidated API Structure

```
/api/auth          register, login, logout, reset-password, me
/api/properties     GET (list, filtered/searched), GET/:id, POST, PUT/:id, DELETE/:id
/api/tenants        GET (list), GET/:id, POST, PUT/:id, DELETE/:id
/api/agreements     GET (list), POST, PUT/:id/renew, PUT/:id/terminate
/api/payments       GET (by agreement), POST, PUT/:id, GET/summary
/api/dashboard      GET/admin, GET/manager, GET/tenant
```
