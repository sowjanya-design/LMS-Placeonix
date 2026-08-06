# Placeonix Hub — Project Brain

> Living memory of this project. Read this first when picking up work here.
> **Rule: every meaningful change (feature, fix, refactor, decision) gets a dated entry
> added to the top of the [Changelog](#changelog) section below.**

## What this is
Role-based (Admin / Mentor / Student) training-and-placement portal for **Placeonix**,
an IT training & placement institute. Vanilla frontend, no build step; Node/Express +
MongoDB API. Deployed on Vercel (static + serverless) with MongoDB Atlas.

- Live: https://placeonix-dashboard.vercel.app
- Repo: https://github.com/sowjanya-design/Placeonix_Dashboard
- Not currently a git repo on this machine (no `.git` found in the working copy).

## Structure
```
frontend/                     vanilla HTML/CSS/JS SPA, no framework/build
  placeonix-hub-portal.html     the whole dashboard (single-file SPA)
  landing.html                  marketing/landing page
  manifest.json, sw.js          PWA (installable, network-only service worker)
  assets/                       logos, illustrations
placeonix-hub-backend/
  api/index.js                  Vercel serverless entrypoint
  src/
    server.js                   local entry (app.listen) — API on :5000
    app.js                      Express app + middleware
    config/                     constants.js, database.js
    models/                     20 Mongoose schemas (see Data model below)
    controllers/, routes/       one pair per resource, mounted under /api/v1
    middleware/                 auth (protect/authorize), validate, errorHandler
    services/                   email (Nodemailer), cron (node-cron), upload, notifications
    seeders/seed.js             demo data loader
    scripts/                    migrateAlumniRefs.js, dataHygieneReport.js
    __tests__/                  Jest + Supertest API tests
docs/                          ARCHITECTURE.md, FEATURES.md, TEST_CASES.md, SETUP_GUIDE.txt,
                                DEPLOY_VERCEL.md, postman collection, audit/00-inventory.md
_serve.js                      tiny static server for frontend/ on :8080
vercel.json                    deploy config (static frontend + serverless API)
```

## Stack
- **Frontend:** vanilla JS/CSS/HTML, `fetch()` to `/api/v1`, PWA.
- **Backend:** Node ≥18, Express, MongoDB/Mongoose, JWT (access+refresh) + bcryptjs,
  express-validator, helmet/cors/rate-limit/mongo-sanitize/hpp/xss-clean, Multer (+ S3
  support via `@aws-sdk/client-s3`, `multer-s3`), Nodemailer, node-cron, Winston/morgan.
- **Tests:** Jest + Supertest, `mongodb-memory-server` for isolated test DB.
- **Hosting:** Vercel (GitHub `main` push → auto-deploy) + MongoDB Atlas.

## Data model (20 collections)
User, Course, Batch, Enrollment, Session, Attendance, Assignment, Announcement,
PlacementDrive, Notification, Lead, Review, Resource, Payment, Certificate,
JoinRequest, Company, MockInterview, Alumni, OfficeHourSlot.

## Auth & roles
`POST /auth/login` → `{ accessToken, user }`, sent as `Authorization: Bearer <token>`.
Roles: `admin`, `mentor`, `student`, enforced by `protect` + `authorize(...roles)`
middleware. Token currently in `localStorage` (httpOnly-cookie migration pending —
see Known limitations).

## Demo/test logins (seeded)
| Role | Email | Password |
|---|---|---|
| Admin | admin@placeonix.in | Password123 |
| Mentor | mentor@placeonix.in | Password123 |
| Student | student@placeonix.in | Password123 |

## Run locally
```bash
cd placeonix-hub-backend && npm install
copy .env.example .env      # set MONGO_URI + JWT secrets
npm run seed && npm run dev  # API → :5000
# repo root, separate terminal:
node _serve.js               # portal → :8080
```
Root `package.json` also exposes `npm run dev|start|seed|portal` as delegating scripts.

## Known limitations (as of last audit)
- File uploads are link-based by default; S3 deps exist (`@aws-sdk/client-s3`,
  `multer-s3`) but persistence on serverless isn't guaranteed unless S3 is wired up.
- No SMTP/provider keys configured → email/WhatsApp/SMS not actually sent, notifications
  stay in-app only.
- No Razorpay/payment gateway integration; admin records payments manually.
- "Real-time chat" is simulated — no WebSocket server on serverless (Vercel).
- Auth token in `localStorage`, not httpOnly cookies.
- Demo-mode fallback: if API/DB unreachable, frontend loads with sample data (can look
  like a real outage if seen in prod — hard refresh usually fixes stale service-worker
  "Demo Mode" banners).

## Where things are tracked
- Bugs: `Placeonix-Hub-Bug-Tracker.xlsx`, `Placeonix_Bug_Register.xlsx` (root).
- Audit reports: `Placeonix-Hub-Dashboard-Audit-Report.pdf`, `docs/audit/00-inventory.md`.
- SEO: `Placeonix_SEO_Keywords.pdf`.
- Reports: `16jul report (1).docx`.

---

## Changelog
> Newest entries at the top. Format: `### YYYY-MM-DD — short title` then 1-3 bullets:
> what changed, why, anything the next session should know.

### 2026-08-06 — Backend fix: assignment-list submission leak + Frontend: student Assignments (submit flow)
- **Security fix found while building the frontend, not a planned task**: `GET
  /assignments` (`backend/src/controllers/assignmentController.js`) returned full
  `Assignment` docs including the *unfiltered* `submissions` array to every role —
  meaning any student could see every classmate's submission content, GitHub links,
  and mentor feedback/scores for assignments in their own batch, just by listing
  assignments. `getAssignment` (single-assignment fetch) already masked this
  correctly; the list endpoint never got the same treatment. Fixed by applying the
  identical per-student masking there. Added a regression test
  (`assignments.test.js`) that seeds two students' submissions and asserts student A
  never sees student B's content via the list endpoint (and that a mentor still sees
  both, since mentors are supposed to). Full suite: 50 tests passing, lint clean.
- `app/dashboard/assignments/page.tsx` — student-only real page (mentor/admin see a
  short "not migrated yet" notice, consistent with the placeholder pattern rather
  than pretending to support grading). Lists assignments with a status badge (Not
  submitted / Overdue / Submitted / Late / Graded with score), shows mentor feedback
  inline when present, and an inline submit form (notes + GitHub link) that posts to
  `POST /assignments/:id/submit` then refetches that one assignment so the UI
  reflects the real server state rather than assuming success.
- Verified in-browser end-to-end as the seeded student: submitted "Node REST API"
  through the real form, badge updated to "Submitted" immediately, **and stayed
  "Submitted" after a full page reload** (proof it round-tripped through Atlas, not
  just local state). Mentor fallback message also verified. Zero console errors.
  `tsc`/lint/build all clean.
- Next session: same graduation pattern as My Courses — add a real page at the
  matching route. Mentor's Assignments (grading/review UI, `POST
  /assignments/:id/submissions/:submissionId/review`) is still a placeholder and a
  reasonable next target, or continue down the student list (Attendance, Sessions).

### 2026-08-06 — Next.js frontend: Student "My Courses" (first real content page)
- `app/dashboard/my-courses/page.tsx` — first real content page (not a placeholder),
  fetches `GET /users/me/enrollments`, renders each enrollment as a card: course
  title/category, status badge, progress bar, batch name/mode/mentor, and a fee-due
  callout only when `fee.due > 0`. Next.js file-based routing means this static route
  automatically takes precedence over the `[section]` catch-all placeholder — no
  extra wiring needed to "graduate" a section from placeholder to real page.
- Added `Course`/`Batch`/`Enrollment` types to `lib/types.ts` matching the backend's
  `Enrollment` model shape (`backend/src/models/Enrollment.js`).
- Verified in-browser as the seeded student (`student@placeonix.in`): both real
  enrollments render correctly (SAP FICO 40%, Full Stack Web Development 72%, the
  latter showing "₹5,000 due of ₹25,000"), sidebar highlights "My Courses" as active,
  zero console errors. `tsc`/lint/build all clean.
- Next session: this is the pattern for graduating any other placeholder section —
  add a real `page.tsx` at the matching route, fetch the relevant endpoint, done.
  Good next candidates: student Assignments/Attendance (both already fully backed by
  the existing API), or start on admin's Students/Mentors/Courses tables.

### 2026-08-06 — Next.js frontend: role-aware sidebar navigation
- `lib/nav.ts`: the exact `ROLES[role].nav` config from
  `frontend/legacy_html/placeonix-hub-portal.html` (admin 20 items, mentor 14,
  student 17), ported as typed data instead of inline JS objects — so the new
  frontend's nav is feature-parity-by-construction with what each role could already
  see, not a guess at what they need.
- `components/icons.tsx`: the old portal's `iconSvg()` path data, ported to React
  components (added one missing icon — `message`, used by student's "Feedback" nav
  item but absent from the original icon map, which silently fell back to the home
  icon there).
- `components/sidebar.tsx`: renders `NAV[user.role]`, active-route highlighting via
  `usePathname`. Every item links to `/dashboard/{id}` (`dashboard` itself → `/dashboard`).
- `app/dashboard/[section]/page.tsx`: catch-all placeholder for every nav item that
  doesn't have a real page yet — resolves the id back to its role-specific label via
  `NAV[user.role]` and shows "not yet migrated" rather than a 404. This is deliberate:
  every sidebar link should resolve to *something* honest as pages get built one at a
  time, instead of either 404s or fake content.
- Verified in-browser for both admin and mentor: distinct nav sets render correctly,
  `Link` client-side navigation to a placeholder route works, active-item highlighting
  updates. `tsc --noEmit`, lint, and `next build` all clean.
- Next session: no real content pages exist yet except `/dashboard` itself — every
  other nav item is still a placeholder. Next natural slice per the earlier
  discussion: student "My Courses" (ties into the Quiz/Coding-Challenge work from
  Phases 2-3) or admin's Students/Mentors/Courses tables.

### 2026-08-06 — MongoDB Atlas connected + Next.js frontend: auth flow (Phase 6 start)
- **Atlas connected.** `backend/.env` didn't exist; found real credentials in
  `atlas-credentials.env` (repo root, gitignored). `mongodb+srv://` failed with
  `ECONNREFUSED` on the SRV DNS lookup — this dev environment's Node resolver is
  pinned to `127.0.0.1`, which refuses SRV queries even though the OS resolver works.
  Fixed by resolving the SRV/TXT records manually (`nslookup -type=SRV`/`-type=TXT`)
  and using a standard (non-SRV) `mongodb://` connection string with the shard hosts,
  replica set, and authSource read directly from those records — same cluster,
  different connection string shape. If this breaks after an Atlas cluster change,
  redo the nslookup and update `backend/.env`'s `MONGO_URI`.
- Ran `npm run seed` against the real Atlas cluster — full demo dataset now live
  (courses, batches, enrollments, payments, leads, certificates, roles/permissions).
  Demo logins: `admin@placeonix.in` / `mentor@placeonix.in` / `student@placeonix.in`,
  all password `Password123`.
- **Next.js frontend: first real feature (auth flow).** The `frontend/` scaffold from
  the reorg was still the default `create-next-app` starter. Built: `lib/api.ts` (fetch
  wrapper, `credentials: 'include'`, never touches the token directly — same
  cookie-only approach as the Phase 0 fix, this time built in from the start instead
  of retrofitted), `lib/auth-context.tsx` (React context wrapping `/auth/me`, `login`,
  `logout`), `components/auth-guard.tsx` (redirects to `/login` if no session),
  `/login` page, `/dashboard` layout+page (role-aware header, live stats from
  `/users/me/stats`). Root `/` redirects to `/dashboard` or `/login` based on session.
- Also updated `backend/.env`'s `CLIENT_URL` from `:8080` (old vanilla portal) to
  `:3000` (Next.js dev default) — required for the CORS+cookie flow to work at all.
- **Verified in an actual browser** (not just curl): full login → dashboard-with-real-data
  → reload-persists-session → logout → direct-nav-to-/dashboard-while-logged-out-redirects
  flow, zero console errors at every step. `tsc --noEmit`, `next lint`, and `next build`
  all clean.
- Next session: this is the *first slice* of Phase 6, not a finished frontend — only
  auth + an empty dashboard shell exist. The old `frontend/legacy_html/placeonix-hub-portal.html`
  is the feature-complete reference for everything still to migrate (all the
  role-specific modules listed in `docs/FEATURES.md`, if that file survived the reorg —
  check `prompts_and_plans/` or wherever docs/ ended up).

### 2026-08-06 — Repo reorg: placeonix-hub-backend → backend/, fresh Next.js frontend/
- Mid-session, the working tree changed outside of this conversation:
  `placeonix-hub-backend/` became `backend/` (same content, including everything
  through Phase 2 above), the old vanilla-JS SPA moved to `frontend/legacy_html/`,
  a fresh Next.js app now lives at `frontend/`, and the loose root-level report/xlsx
  files (including this BRAIN.md) moved into `prompts_and_plans/`. Confirmed
  intentional by the user before proceeding — not something this session did.
- **This file (`BRAIN.md`) now lives at `prompts_and_plans/BRAIN.md`, not the repo
  root.** Update the pointer in your head accordingly; the "Structure" section above
  still describes the pre-reorg layout and needs a refresh by whoever owns the
  reorg — deliberately left alone here to avoid clobbering in-progress work.
- Root `package.json`'s `dev`/`start`/`seed`/`portal` scripts still point at the old
  `placeonix-hub-backend` path and `_serve.js` — now stale, not fixed as part of this
  entry since it's part of the broader reorg, not the Phase 3 feature work below.
- All backend work below (Phase 3) was written against the new `backend/` path.

### 2026-08-06 — Phase 3: Coding Challenges — sandboxed code execution (highest-risk item, handled carefully)
- **Execution approach, decided with the user before writing any code**: a managed
  third-party sandboxed-execution API, not a self-hosted Docker sandbox — no sandbox
  infra for us to build/harden/own the container-escape risk of. Using **Piston**
  (open-source, free, no API key, self-hostable if ever needed —
  github.com/engineer-man/piston, public instance at emkc.org). Swappable for a paid
  provider later by changing one env var (`CODE_EXEC_API_URL`) — `codeExecutionService.js`
  is the only file that talks to the executor.
- Untrusted student code is **never executed on this server** — always forwarded to
  the external sandbox. Three specific guardrails, each deliberate:
  1. **Server-side language/version whitelist** (`config/codeLanguages.js`) — the
     client sends a short code like `'python'`, never a raw executor language/version
     string, so a request can't target an unreviewed runtime.
  2. **Timeouts are hardcoded server-side**, never taken from the client — otherwise a
     request could ask for an unbounded run and exhaust the executor.
  3. **Hidden test cases never leak their expected output or the program's actual
     stdout/stderr** — only pass/fail + points. Verified by a test.
- New `CodingChallenge` (test cases embedded, capped at 20 — each submission executes
  every case sequentially, so this bounds per-submission latency/cost) and
  `CodingSubmission` (one doc per attempt) models. `codingChallengeController.js` /
  `codingChallengeRoutes.js` (`/api/v1/coding-challenges`) mirror the Quiz/Assignment
  shape: role-aware listing, mentor ownership guard, mentor/admin CRUD, student
  `run` (manual test, ungraded, not persisted) and `submit` (graded, persisted) flow.
- **Grading is entirely server-side**, comparing trimmed stdout to the stored
  `expectedOutput` — never trusts any correctness claim in the submitted payload.
  Covered by a test that mocks the executor to return wrong output and asserts the
  score is still computed correctly (not from client input).
- `run`/`submit` are on their own strict rate limiter (15/min by default, separate
  from the global API limiter) since each call spends real external-executor quota —
  this is the one part of the API that isn't "free" per request.
- 7 new tests, all mocking `codeExecutionService` (no real network calls in tests).
  Full suite now 49 tests passing, lint clean.
- **Not committed to git by this session** — see the reorg entry above; `backend/` is
  currently untracked pending the reorg's own commit, so committing just the Phase 3
  slice would produce a confusing partial state. Code is done, tested, and lint-clean
  on disk; committing is deferred until the reorg itself is committed.
- Next session: this was the last item explicitly flagged as high-risk in the
  original phased plan (`docs/PLATFORM_UPGRADE_PLAN.md` — note: that file's path may
  have moved in the reorg too, check `prompts_and_plans/` and the new `frontend/`
  app's own docs). Remaining phases (finance/CRM depth, comms queues, multi-branch)
  were already flagged as lower-priority / gated on real business decisions.

### 2026-08-06 — Phase 2: Quizzes (auto-graded assessments, no execution risk)
- New `Quiz` model (questions + options **embedded**, same pattern as
  `Assignment.submissions` — one document read/write instead of a 3-collection join;
  trades away question-bank reuse across quizzes for simplicity) and `QuizResult`
  (one doc per student attempt, unique on `(quiz, student, attemptNumber)`).
- `quizController.js` / `quizRoutes.js` (`/api/v1/quizzes`) mirror the Assignment
  controller's shape: role-aware listing, `assertTeachesBatch` ownership guard for
  mentors, mentor/admin CRUD, student attempt flow.
- **Security-critical design point**: `Quiz.toStudentView()` strips every
  `option.isCorrect` before a student can see a question — verified by a test that
  greps the raw JSON response for `isCorrect` and asserts it's absent. Grading itself
  (`submitAttempt`) recomputes correctness server-side from the stored answer key and
  **ignores** any `isCorrect`/`pointsAwarded` fields a client submits — covered by a
  test that deliberately sends a tampered "this wrong answer is correct" payload and
  asserts the server-computed score is still right. This is the same class of bug
  that would make the Phase 3 IDE/coding-assessment work dangerous if rushed — grading
  logic must never trust the client, full stop.
- `maxAttempts` enforcement, `isOpen` (status + availability window) gating, and
  resume-in-progress-attempt behavior all covered by tests.
- 6 new tests in `quizzes.test.js`; full suite now 42 tests, all passing (lint clean).
- Skipped for this pass, consistent with keeping scope tight: audit-logging quiz
  events (not finance/security-sensitive like Phase 0's targets) and a question bank /
  free-text grading workflow — MCQ/multi-select only, auto-graded.
- Next session: **Phase 3 (IDE / code execution) is next per the plan, and is flagged
  as the highest-risk item in the whole roadmap** — it needs real sandboxing
  (isolated, no-network, resource-capped execution), not just schema. Don't start it
  without deciding on an execution/sandboxing approach first; see
  [docs/PLATFORM_UPGRADE_PLAN.md](docs/PLATFORM_UPGRADE_PLAN.md) §3 Phase 3.

### 2026-08-06 — Phase 1: RBAC (Roles/Permissions), additive on top of the 3 existing roles
- New `Permission` (catalog) and `Role` (code → array of permission codes) models.
  `User.role` is unchanged — still the plain `admin`/`mentor`/`student` string; Role
  documents are keyed by that same code, so this is purely additive, no data migration.
- New `can(...permissionCodes)` middleware in `middleware/auth.js`, sitting alongside
  the existing `authorize(...roles)` (untouched). `admin` always passes `can()`
  (hardcoded bypass — matches today's behavior). For everyone else it checks the
  Role doc's `permissions` array; if no Role doc exists yet, it fails closed rather
  than silently allowing.
- Swapped `authorize('admin')` → `can(...)` on the routes we audit-log (Phase 0):
  `DELETE /users/:id` → `users.delete`, `PATCH /users/:id/role` → `users.manage_role`,
  `POST /payments` → `payments.record`, `POST /payments/:id/refund` →
  `payments.refund`, `GET /audit-logs` → `audit_logs.view`. Default role grants mirror
  the old admin-only behavior exactly, so nothing changes for existing users — the
  point is these can now be granted to mentor/student later via one Role edit, no
  code change.
- `seedRoles.js`: idempotent upsert of the permission catalog + default roles.
  Runs via `npm run seed` (full reseed), standalone via `npm run seed:roles`, **and
  automatically on every DB connect** (`config/database.js` for local/server.js,
  `api/index.js` for the Vercel serverless entrypoint) — so `can()` never fails
  closed just because an environment was never manually seeded.
- New admin-only role-management API: `GET /roles`, `GET /roles/permissions`,
  `PATCH /roles/:code` (body: `{ permissions: [...] }`). The `admin` role's grants
  can't be edited — it's hardcoded to always pass in `can()`, so a partial admin
  grant list there would be misleading. No frontend UI for this yet.
- All 36 backend tests + lint pass unchanged (tests all authenticate as admin on the
  routes that changed, which bypasses `can()` either way).
- Next session: no frontend surface for role/permission management exists yet — if
  the next phase needs it, it's plain CRUD against the new `/roles` endpoints. Phase 2
  (Quizzes/Questions/Options/Results) is next per the upgrade plan.

### 2026-08-06 — Phase 0 foundations: audit logging + cookie-only auth on frontend
- **AuditLog**: new model (`src/models/AuditLog.js`) + `auditLog()` helper
  (`src/utils/audit.js`, fire-and-forget, never throws) wired into the highest-value
  write paths: auth (login success/failure, register, logout, password
  change/reset), user admin actions (role change, delete), and payments
  (record/status-change/refund). Read via new admin-only `GET /api/v1/audit-logs`.
- **Auth**: the backend already set httpOnly cookies on login (good — no change
  needed there). The gap was the *frontend*, which additionally stored the raw JWT
  in `localStorage` (`plx_token`) and sent it via `Authorization: Bearer`, defeating
  the httpOnly protection. Removed that: `apiFetch` now sends `credentials: 'include'`
  and relies solely on the cookie; `localStorage` only keeps non-secret markers
  (`plx_had_session`, `plx_demo_session`) to decide whether to attempt silent
  auto-login on page load. Backend response body still includes `accessToken` for
  Postman/API-tool consumers and existing tests — only the frontend stopped reading it.
- Updated `.env.example`'s `CLIENT_URL` default from `:3000` to `:8080` to match the
  actual local dev port (`_serve.js`) — cross-origin cookies need an exact origin
  match, not a guess.
- **Scoped down from the original Phase 0 plan**: did not build a full
  controller→service→repository layering refactor this pass — kept it to targeted
  audit-log calls in the controllers that matter most (auth/users/payments) rather
  than restructuring every controller. Full service-layer extraction is still open
  if/when it's worth the churn — see [docs/PLATFORM_UPGRADE_PLAN.md](docs/PLATFORM_UPGRADE_PLAN.md).
- All 36 backend Jest tests pass unchanged after these changes.
- Next session: RBAC (Phase 1 — Roles/Permissions/RolePermissions) is the next
  planned step per the upgrade plan.

### 2026-08-05 — Platform upgrade plan drafted
- Analyzed `LMS database.docx` (target architecture: Next.js + layered Node backend +
  RBAC/audit/IDE-assessment/CRM/finance modules) and `LMS Database schemas.xlsx` (71
  schemas + infra/cost sheet: Atlas M10/M20, Redis on VPS, Cloudflare R2, Bunny/
  Cloudflare Stream, Hostinger KVM4, Docker/Nginx/Cloudflare, GitHub Actions).
- Wrote a phased plan + UI audit + deploy/security recommendations to
  `docs/PLATFORM_UPGRADE_PLAN.md`. Key call: this is a large target (full frontend
  rewrite + 71 collections vs. today's ~20) — treat it as phased work, not one project.
  The in-browser IDE/code-execution subsystem is flagged as the single highest
  technical-risk item (needs real sandboxing, not just schema).
- Next session: before building any Phase 4+ item (finance depth, comms queues,
  multi-branch), confirm with the business that it's an actual near-term need — the
  source docs read as an aspirational target architecture, not a committed backlog.

### 2026-08-05 — Brain created
- Created this file by reading README, docs/ARCHITECTURE.md, docs/FEATURES.md, backend
  source tree, and package.json manifests. No git history was available (not a git repo
  in this working copy), so this snapshot is based on current file state only.
- Next session: if this becomes a git repo, prefer `git log` for recent-change context
  over re-deriving it from files, and keep appending dated entries here for anything
  non-obvious from the diff (why, not just what).
