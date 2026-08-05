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
