# Placeonix LMS Vercel Deployment Documentation & "Brain"

This document serves as the "brain" for future AI assistants or developers working on this codebase. It details the infrastructure migration from Railway to Vercel, the environment configurations, and the critical "gotchas" resolved during deployment.

## 1. Infrastructure Overview

The application is a monorepo consisting of:
*   **Backend:** Node.js / Express
*   **Frontend:** Next.js (React)

Both have been successfully migrated and deployed to **Vercel** under a new account (`sowjanya-designs-projects`).

### Active Production URLs
*   **Frontend (Canonical):** [https://frontend-three-jade-53.vercel.app](https://frontend-three-jade-53.vercel.app)
*   **Frontend (Alias/Project Name):** [https://placeonix-frontend-v2.vercel.app](https://placeonix-frontend-v2.vercel.app)
*   **Backend API Base URL:** [https://backend-pearl-seven-77.vercel.app](https://backend-pearl-seven-77.vercel.app)

---

## 2. Backend Configuration (`/backend/vercel.json`)

The backend requires specific routing to operate in a serverless environment.

### Critical Environment Variables
*   `NODE_ENV`: Must be set to `"production"`.
*   **CRITICAL FIX - `CLIENT_URL`**: The backend has a strict CORS policy configured in `src/app.js`. If `CLIENT_URL` is omitted or left as `*` in production, **the backend server will purposefully crash on boot**.
    *   *Fix applied:* `CLIENT_URL` is explicitly defined in `backend/vercel.json` as a comma-separated list of allowed frontend domains.
    *   *Current Value:* `"https://placeonix-frontend-v2.vercel.app,https://frontend-three-jade-53.vercel.app,https://frontend-qw52b5sa0-sowjanya-designs-projects.vercel.app"`

### Routing
All requests are rewritten to hit `api/index.js` which serves as the Express entry point.

---

## 3. Frontend Configuration (`/frontend/vercel.json`)

The frontend is a standard Next.js deployment but relies on statically injected API URLs.

### Critical Environment Variables
*   **CRITICAL FIX - `NEXT_PUBLIC_API_BASE`**: Next.js bakes `NEXT_PUBLIC_` variables into the static bundle at **build time**.
    *   *Issue Encountered:* When the backend was redeployed, the frontend was caching the old, broken deployment hash URL.
    *   *Fix Applied:* The frontend was forcefully redeployed without cache (`vercel deploy --force --prod`) to permanently bake the canonical alias `https://backend-pearl-seven-77.vercel.app/api/v1` into the JS bundles.
*   `NEXT_PUBLIC_APP_URL`: Set to the canonical frontend domain (`https://placeonix-frontend-v2.vercel.app`).

---

## 4. Known Issues & Troubleshooting History

If an AI or developer runs into issues, check these historical context points:

1.  **"You Need Access" Error on Vercel URLs:**
    *   *Symptom:* Clicking a specific deployment URL (e.g., `frontend-qw52b5sa0-something.vercel.app`) shows a Vercel Protection screen.
    *   *Reason:* Vercel enables SSO/Authentication protection on specific *deployment hashes* by default for Team accounts.
    *   *Solution:* Always use the **Canonical Aliased Domain** (e.g., `frontend-three-jade-53.vercel.app`). These bypass deployment protection and are fully public.

2.  **"Something went wrong (is the backend running?)" Error on Login:**
    *   *Symptom:* The frontend UI loads but cannot log in.
    *   *Reason:* Either the backend crashed (check `CLIENT_URL`), OR the frontend is trying to talk to an outdated backend deployment hash.
    *   *Solution:* 
        1. Verify the backend is up by curling the `/health` endpoint (e.g., `curl https://backend-pearl-seven-77.vercel.app/health`).
        2. Ensure `NEXT_PUBLIC_API_BASE` matches the *active* backend URL exactly.
        3. Force a fresh, uncached rebuild of the frontend (`vercel deploy --prod --force`).

## 5. URGENT — 2026-09-04: real secrets were committed to this repo

`backend/vercel.json` had the real MongoDB Atlas connection string (username +
password) and `NODE_ENV` hardcoded to `"development"` on the live production
deployment. `JWT_SECRET`/`JWT_REFRESH_SECRET` were the literal placeholder
text from `.env.example`, not real secrets at all — anyone who's seen that
example file already knows them, meaning login tokens could be forged.

**This needs, in order, done by whoever picks it up:**
1. Rotate the Atlas password for `sowjanya_db_user` (Atlas → Database Access → Edit).
2. Generate new random 32+ char `JWT_SECRET` and `JWT_REFRESH_SECRET` (this logs everyone out — expected).
3. Set the new Mongo URI + new JWT secrets + `NODE_ENV=production` as real
   Environment Variables in Vercel's dashboard (Settings → Environment
   Variables) for the **backend** project — never in a committed file again.
4. Redeploy. The values in `backend/vercel.json` were replaced with
   `SET_IN_VERCEL_DASHBOARD_NOT_HERE` placeholders on purpose — the app will
   fail to boot until the dashboard values are set, which is intentional
   (fail loud, not fail open with a leaked credential).

This is also why the `sameSite: "lax"` login-cookie fix (same commit) won't
visibly do anything until `NODE_ENV` is actually `"production"` — that fix
is gated on the same env var.

## 6. Development Credentials
Use these credentials to test the production application safely:
*   **Admin:** `admin@placeonix.in` / `Password123`
*   **Mentor:** `mentor@placeonix.in` / `Password123`
*   **Student:** `student@placeonix.in` / `Password123`
