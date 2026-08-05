# Phase 0 — Project Inventory

Date: 2026-07-19

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS, no framework, no bundler, no build step | Two static files served directly |
| Backend | Node.js 18+, Express 4.18, Mongoose 8.0 | REST API, MongoDB |
| Package manager | npm | No workspaces; root `package.json` just delegates to `placeonix-hub-backend` |
| Hosting | Vercel — static frontend + serverless API function | `vercel.json` at repo root |
| Version control | **None** — not a git repository at any level under `D:\Placeonix` | See "Blockers" below |

## How to run things

| Task | Command | Works? |
|---|---|---|
| Backend dev server | `npm run dev` (root) → `nodemon src/server.js` | Yes, needs `.env` with `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| Frontend static server | `npm run serve` (root) → `node _serve.js`, port 8080 | Yes, no build step needed |
| Backend tests | `npm test` (inside `placeonix-hub-backend`) → Jest + Supertest + in-memory Mongo | **Yes — 8 suites / 36 tests, all passing** (verified just now) |
| Backend lint | `npm run lint` → `eslint src/` | **Broken** — `eslint` is not installed (not in `devDependencies`, no binary in `node_modules/.bin`), and there is no `.eslintrc*` config file anywhere in the repo. Running it fails immediately with "'eslint' is not recognized". |
| Frontend build | — | N/A — static files, nothing to build |
| Frontend lint | — | N/A — no linter configured for frontend JS at all |

## Routing / pages

**Frontend has no server-side routing.** Three static HTML entry points:

| URL | File | What it is |
|---|---|---|
| `/` | `frontend/landing.html` | Public SEO marketing landing page (added last session) |
| `/portal`, `/portal.html` | `frontend/placeonix-hub-portal.html` | The LMS app shell — login screen + client-side SPA router, `noindex` |
| everything else (SPA catch-all) | `frontend/placeonix-hub-portal.html` | Same app shell, so deep-linked/bookmarked in-app routes still resolve |

**Inside `placeonix-hub-portal.html`**, navigation is entirely client-side JS (`showPage()` swaps a `render*()` function's output into the DOM — no URL changes, no history API). 35 internal views exist as `render*` functions, role-gated (student / mentor / admin):

`renderStudentDash`, `renderMentorDash`, `renderAdminDash`, `renderDashboard`, `renderCourses`, `renderCatalog`, `renderCatalogInto`, `renderMyLearning`, `renderBatches`, `renderSessions`, `renderAttendance`, `renderAttendanceAdmin`, `renderMarkAttendance`, `renderAssignments`, `renderExams`, `renderPlacements`, `renderCompanies`, `renderMockInterviews`, `renderAlumni`, `renderOfficeHours`, `renderAnnouncements`, `renderLeads`, `renderReviews`, `renderResources`, `renderCertificates`, `renderPayments`, `renderStudents`, `renderMentors`, `renderLeaderboard`, `renderReports`, `renderProfile`, `renderSettings`, `renderSupport`, `renderCalendar`, `renderJoinRequests`, `renderPage`.

**Backend API** — 22 route groups under `/api/v1/`: `auth`, `users`, `courses`, `batches`, `sessions`, `assignments`, `attendance`, `placements`, `announcements`, `notifications`, `leads`, `reviews`, `resources`, `join-requests`, `payments`, `certificates`, `uploads`, `analytics`, `search`, `companies`, `mock-interviews`, `alumni`, `office-hours`.

## Content / assets / metadata

- No CMS, no markdown content pipeline — all copy is inline in the HTML files.
- `frontend/assets/` holds 3 static files (logo, hub logo, login illustration SVG). No other images in the app.
- SEO metadata (title/description/canonical/JSON-LD) currently exists only on `landing.html` (added last session) and a minimal `noindex` block on `placeonix-hub-portal.html`. No metadata inside individual SPA views (not applicable — they're not separately crawlable URLs).
- **No `robots.txt` or `sitemap.xml` anywhere in the repo.**

## Test coverage

- Backend: 8 Jest suites, 36 tests — covers auth, courses, sessions, assignments, payments, join-requests, mock-interviews, and a placement-stats consistency regression test. All passing as of this audit.
- Frontend: **zero automated tests.** No Playwright/Cypress/Jest-DOM setup exists. All frontend verification in this project so far has been manual (via the `browse` skill) or static parse-checks (Node `new Function()` on extracted `<script>` blocks).
- No CI configuration (no `.github/workflows`, no other CI config found).

## Tooling available in this environment for Phase 1

| Tool | Status |
|---|---|
| Jest/Supertest (backend) | Installed, working |
| ESLint | **Not installed**, no config — would need to be added (a dependency + config addition, which per the ground rules ("do not restructure architecture... unless a check specifically requires it and I approve it first") I'm flagging rather than silently doing) |
| Lighthouse | Not installed locally; `npx lighthouse` would need to download it fresh (network is available in this environment) |
| axe-core | Not installed; same as above |
| Browser automation | The `browse` skill (headless Chromium) — used successfully in earlier sessions for live-site QA and screenshots |

## Known pre-existing findings from prior sessions (not re-discovered, just carried forward)

These were already found and fixed in earlier work this project, noted here so Phase 1 doesn't re-flag them as new:
- Dummy/test data confirmed live in Mentors, Students, Batches, Companies, Leads, Announcements (data-hygiene script exists at `placeonix-hub-backend/src/scripts/dataHygieneReport.js`, not yet run against a real database by me — no DB access).
- A large batch of security/ownership/XSS/validation fixes already applied across ~20 backend controllers (see prior commits — except there are no commits, since there's no git repo; see prior conversation history for the full list).
- SEO landing page + JSON-LD already added.

## Blockers / things I need your call on before Phase 1 starts

1. **No git repository.** The ground rules require "small, reviewable commits grouped by concern." I cannot make commits without version control. I'd suggest `git init` + an initial commit capturing current state as the baseline, then every fix in Phase 2 becomes its own commit. **I will not run `git init` without your go-ahead** since it changes the project's structure.
2. **ESLint is configured to run but not actually installed/configured.** Phase 1 asks me to "run lint" — right now that just fails immediately. Fixing this means adding a new dependency + a config file, which is exactly the kind of change the ground rules say needs your approval first ("do not restructure architecture... unless a check specifically requires it and I approve it first").
3. **No database access.** I can't run the app against real data, can't execute the data-hygiene script for real, and can't verify anything that requires a live MongoDB. Phase 1/1's "cross-screen data consistency" and "auth/session" checks can be verified in code and via a local Mongo (I can spin up `mongodb-memory-server` or ask you for a `MONGO_URI`), but not against your actual production data.
4. **No Lighthouse/axe-core installed.** I can install them via npx on demand (network works in this environment) — flagging so you know that's an on-the-fly install, not a pre-vetted local tool.
5. **This is a single-file, ~7,500-line vanilla-JS SPA with 35 internal views**, each with multiple interactive controls, plus a 22-route-group backend. "Click every interactive control on every page across 5 breakpoints" (Phase 1B/C) is achievable but will take many rounds of browser automation — I want to confirm you want the full exhaustive pass rather than a risk-prioritized subset (dashboards, forms, and payment/auth flows first) before I commit to that scope.

## Recommendation

Given the above, I'd suggest before Phase 1 starts:
- **Yes** to `git init` + baseline commit (needed for the "small reviewable commits" rule to mean anything).
- **Decide** on ESLint: add a minimal config now (quick, low-risk) or skip lint entirely and rely on the Node syntax-check + Jest suite as the safety net (what's been used successfully so far).
- **Confirm** scope for the manual click-through pass: full exhaustive (35 views × 5 breakpoints) vs. risk-prioritized (auth, payments, admin CRUD, forms first — matches what real users hit most).
