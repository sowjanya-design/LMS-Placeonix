# Placeonix Platform — Upgrade Plan (from `LMS database.docx` + `LMS Database schemas.xlsx`)

Source docs analyzed: `LMS database.docx` (target architecture: Next.js frontend +
layered Node/Express backend + MongoDB, "71 Schemas") and `LMS Database schemas.xlsx`
(infra/cost recommendations sheet + full schema/field list). This plan reconciles that
target with what's actually running today (single-file vanilla-JS SPA + Express +
Mongoose, ~20 collections — see [BRAIN.md](../BRAIN.md)).

## 1. What the docs actually specify

**Target architecture (docx):**
- Frontend → Next.js (currently: one 7,300-line vanilla HTML/JS/CSS file)
- Backend → layered: `routes → controllers → services → repositories → models`, with
  dedicated `modules/` per domain (auth, users, roles, permissions, courses, learning,
  batches, **ide**, assessments, placements, certificates, crm, notifications, finance,
  analytics, settings, audit)
- New capabilities not in the current app: **role/permission tables (RBAC beyond 3
  hardcoded roles), audit logs, an in-browser IDE/coding-assessment subsystem
  (ProgrammingLanguages, CodingSessions, Executions, TestCases, HiddenTestCases),
  quizzes/assessments, CRM (Leads/Counselling/Admissions/FollowUps — current app has a
  simpler Lead model only), finance (Invoices/Transactions/Refunds/Coupons vs. current
  Payment-only model), multi-branch org support (Organization/Branches), feature flags,
  and per-channel comms queues (EmailQueue/SMSQueue/WhatsAppQueue)**.

**Infra sheet (xlsx):**
- DB: MongoDB Atlas M10/M20 (paid — backups, replica sets, monitoring)
- Cache/queue: Redis, self-hosted on the VPS
- Search: MongoDB Atlas Search (included on paid tier)
- Object storage: Cloudflare R2 (docs/images), Bunny Stream or Cloudflare Stream (video)
- Compute: existing Hostinger KVM4 VPS + Docker + Nginx + Cloudflare (proxy/CDN)
- CI/CD: GitHub Actions
- Ops: Uptime Kuma now, Grafana + Prometheus later

**71 schemas**, grouped: core (Users/Permissions/Roles/Sessions/AuditLogs), academic
(Profiles/Courses/Modules/Lessons/Videos/Resources), learning progress
(Enrollments/LessonProgress/Bookmarks/WatchHistory), batch/ops
(Batches/Schedules/Attendance/Assignments-as-mentor-student mapping), **IDE**
(ProgrammingLanguages/CodingTemplates/CodingSessions/Executions/Submissions/TestCases/
HiddenTestCases), assessment (Assignments/AssignmentSubmissions/Quizzes/Questions/
Options/Results/CodingAssessments), placement (Companies/Recruiters/Jobs/Applications/
Interviews/Offers), certificate (Certificates/Templates/VerificationLogs), comms
(Notifications/Announcements/EmailQueue/SMSQueue/WhatsAppQueue), finance (Payments/
Invoices/Transactions/Refunds/Coupons), CRM (Leads/Counselling/Admissions/FollowUps),
admin (Organization/Branches/Settings/Integrations/FeatureFlags), analytics (Learning/
Placement/Revenue/IDE).

## 2. Gap vs. today (grounded in the current repo)

| Area | Today | Target | Verdict |
|---|---|---|---|
| Frontend | 1 file, 7,287 lines, no build | Next.js, componentized, per-role route trees | Full rewrite, highest effort |
| Backend layering | `controllers → models` directly (no service/repository layer) | `controller → service → repository → model` | Refactor, medium effort, incremental |
| RBAC | 3 hardcoded roles in JWT | Roles + Permissions + RolePermissions tables | New subsystem |
| Audit trail | None found in `src/` | `AuditLogs` collection, `audit` module | New subsystem, do early (cheap, high value) |
| IDE / coding assessments | Not present | 7 dedicated collections + execution sandboxing | Highest risk item — needs a sandboxed code runner, not just schema |
| CRM | `Lead` model only | Leads/Counselling/Admissions/FollowUps | Extend existing, moderate |
| Finance | `Payment` model only | Payments/Invoices/Transactions/Refunds/Coupons | Extend existing, moderate — **don't build this before a real payment gateway decision** |
| Comms | In-app `Notification` only, no email actually sent (per FEATURES.md) | Multi-channel queues | Needs SMTP/SMS/WhatsApp provider keys first — queues are pointless without a working sender |
| Multi-branch | Single-tenant implied | Organization/Branches | Only build if there's an actual second branch/franchise on the roadmap — else deferred complexity |
| Cache | None | Redis | Needed once traffic/session volume justifies it |

**Read this table as a priority signal, not a to-do list to build in order** — several
target items (multi-branch, full CRM, comms queues) are speculative scale features that
cost real complexity. Confirm business need before building them.

## 3. Recommended phased plan

**Phase 0 — Foundations (1–2 weeks, do regardless of anything else)**
- Add `AuditLogs` (who/what/when on writes) — cheap, immediately useful for support/debugging.
- Introduce a thin service layer between controllers and models for the highest-churn
  modules only (auth, users, payments) — don't do a big-bang layering refactor across
  all 20+ controllers at once.
- Move JWT off `localStorage` to httpOnly cookies (already flagged as a known gap).
- Lock down `.env`/secrets rotation, confirm `CLIENT_URL` allowlist is set correctly in
  prod (the existing fail-fast check in `app.js` is good — keep it).

**Phase 1 — RBAC expansion**
- Add `Roles` / `Permissions` / `RolePermissions` collections; keep `User.role` as a
  denormalized fast-path field, resolve fine-grained permission checks through the new
  tables. Ship additive — don't break existing `authorize('admin'|'mentor'|'student')`
  middleware calls, just extend it to also accept permission strings.

**Phase 2 — Assessments before IDE**
- Build Quizzes/Questions/Options/Results first (pure CRUD + grading logic, no sandboxing
  risk). This unlocks most of the "assessments" value without the IDE's execution risk.

**Phase 3 — IDE / code execution (highest technical risk)**
- This is not a schema problem, it's a **sandboxed execution problem**. Needs an isolated
  runner (e.g., Docker containers per submission with strict CPU/memory/time/network
  limits, or a managed code-execution API) before `CodingSessions`/`Executions` collections
  mean anything. Treat this as its own mini-project with a security review before launch —
  arbitrary code execution is the single highest-risk feature in this whole plan.

**Phase 4 — Finance/CRM depth**
- Only after a payment gateway (Razorpay, per the existing known-limitations note) is
  actually selected. Build Invoices/Transactions/Refunds/Coupons against the real gateway's
  webhook model, not speculatively.

**Phase 5 — Comms queues**
- Only after SMTP/SMS/WhatsApp provider keys exist. Otherwise EmailQueue/SMSQueue/
  WhatsAppQueue collections just accumulate messages nothing sends.

**Phase 6 — Frontend rewrite (Next.js)**
- Do this in parallel with backend phases, not before them — a framework migration is
  independent of and shouldn't block the RBAC/audit/assessment work above. Migrate by
  role-section (student first, since it's the largest user count) rather than a full
  rewrite-and-cutover; keep the current SPA live behind a route until each section's
  parity is confirmed in prod.

**Phase 7 — Multi-branch / feature flags / analytics**
- Lowest priority; build only when there's a confirmed second branch or A/B testing need.

## 4. UI audit (current `placeonix-hub-portal.html`, 7,287 lines, single file)

**Structural**
- One monolithic HTML file mixing markup, CSS, and all-role JS is the biggest
  maintainability risk right now — any change risks breaking an unrelated role's view.
  This is the strongest argument for Phase 6 (Next.js) sooner rather than later, since
  every UI fix until then compounds file complexity.
- No component reuse across Admin/Mentor/Student despite near-identical patterns
  (tables with row actions, stat-card grids, modals, CSV export) — expect duplicated
  markup/logic in each role section.

**UX gaps flagged by existing docs (`FEATURES.md` known limitations) — confirm still true:**
- Auth token in `localStorage` — also an XSS exposure, not just an architecture nit.
- "Demo Mode" banner can appear on a real outage and look like intended behavior —
  needs a clearer visual distinction between "demo/offline fallback" and "logged in,
  live data" so users/admins aren't misled about data freshness.
- Resources are view-only for students with no download — verify this is a deliberate
  DRM-style decision and not just an unfinished feature; if deliberate, surface *why*
  in the UI (e.g., "Streaming only — download disabled by your institute") instead of
  silently omitting the button.

**Accessibility / responsiveness (check directly in-browser, don't take on faith):**
- Verify color contrast on the "brand-purple accents, neutral surfaces" theme meets
  WCAG AA, especially on stat badges/status pills — light-on-light or purple-on-white
  low-contrast text is the most common miss in dashboards like this.
- Confirm all modals trap focus and are dismissible via Escape/keyboard, and that the
  mobile hamburger drawer doesn't leave background content tabbable while open.
- Test the CSV import/export and PDF certificate flows on mobile — table-heavy admin
  views frequently break on small screens if not explicitly designed for them.

**Recommended immediate UI fixes (don't need the Next.js rewrite):**
1. Componentize the "stat card row" and "data table + actions" patterns as JS
   functions/partials even within the current single-file setup — reduces duplication
   before the eventual framework migration.
2. Add loading/error/empty states consistently — audit whether every list view
   (students, batches, sessions, leads, etc.) handles the empty-result and API-error
   cases distinctly from the demo-mode fallback.
3. Add a visible "environment/data source" indicator (Live API vs Demo data) distinct
   from a generic banner, so admins never mistake stale cached data for live state.

## 5. Deployment & security plan for the target architecture

**Environments:** keep 3-tier — local (docker-compose), staging (same VPS, separate
Docker Compose project + subdomain, separate Atlas cluster/DB), production.

**Compute/infra (matches the xlsx recommendations — sound choices, adopt as-is):**
- Hostinger KVM4 VPS + Docker + Nginx reverse proxy + Cloudflare in front (DDoS/CDN/TLS).
- MongoDB Atlas M10 (paid tier) for production once live traffic justifies it — M0/free
  is fine for staging only.
- Redis self-hosted on the VPS for sessions/refresh-tokens/OTP/rate-limit counters/queue
  data — don't put this on Atlas, it's a VPS-local cache by design in the sheet.
- Cloudflare R2 for documents/images; Bunny Stream or Cloudflare Stream for video — both
  cheaper and more appropriate than storing large media in MongoDB or on VPS disk.

**CI/CD:** GitHub Actions — build/test/lint on PR, deploy to staging on merge to a
`develop`/`staging` branch, deploy to production on tag/release (manual approval gate
recommended given this is a live paid platform, not a side project).

**Security checklist (build on what's already good in `app.js` — helmet, CORS
allowlist with fail-fast, rate limiting, mongo-sanitize, hpp — don't re-invent these):**
- Move auth token from `localStorage` to httpOnly, `SameSite=Strict/Lax`, `Secure`
  cookies (highest-priority security fix, already flagged as a known gap).
- Add per-route RBAC via the new Permissions tables (Phase 1) rather than only
  role-string checks, so future modules (finance, CRM) get fine-grained access control
  from day one instead of bolted on later.
- IDE/code-execution sandboxing (Phase 3) is the biggest new attack surface in this
  whole plan — isolate with gVisor/Firecracker/Docker-with-strict-limits (no network
  egress, capped CPU/mem/time, ephemeral filesystem), never execute in the same
  container/process as the API.
- Secrets: move from `.env` files on the VPS to a proper secrets manager if budget
  allows (Doppler, Infisical, or even Vercel/Hostinger's own env-var store with
  restricted access) — `.env` on a VPS is fine for now but should not sprawl as more
  services (Redis, R2, Bunny, SMTP, SMS, WhatsApp, payment gateway) each add credentials.
- Add `AuditLogs` (Phase 0) before RBAC/finance features go live — audit trail must
  exist *before* the features that need auditing, not retrofitted after an incident.
- Backups: confirm Atlas automated backups are actually enabled on the paid tier (it's
  a checkbox, not automatic by default on all tiers) and test a restore at least once
  before go-live.
- Uptime Kuma now, Grafana+Prometheus later (per the sheet) — reasonable sequencing;
  don't over-invest in observability tooling before there's production traffic to watch.
- Dependency hygiene: run `npm audit` / Dependabot on both frontend (once Next.js lands)
  and backend in CI, not ad hoc.

## 6. Suggested next step

Given the size of this (71 schemas, IDE subsystem, full frontend rewrite), don't
attempt this as one project. Recommend: lock Phase 0 + Phase 1 as a scoped sprint,
get sign-off on which "target" features (multi-branch, full CRM, comms queues) are
actually near-term business needs vs. aspirational, and treat Phase 3 (IDE) as a
separate initiative with its own security review before scheduling it.
