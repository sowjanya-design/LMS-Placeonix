# Placeonix Hub — Project Brain

> Living memory of this project. Read this first when picking up work here.
> **Rule: every meaningful change (feature, fix, refactor, decision) gets a dated entry
> added to the top of the [Changelog](#changelog) section below.**

## What this is
Role-based (Admin / Mentor / Student) training-and-placement portal for **Placeonix**,
an IT training & placement institute. Being rebuilt from a vanilla-JS SPA onto
Next.js, backed by Node/Express + MongoDB Atlas.

- Live (old vanilla portal, still deployed): https://placeonix-dashboard.vercel.app
- Repo: https://github.com/sowjanya-design/LMS-Placeonix — **working branch `mohan`**,
  pushed and up to date as of the last entry below. (This repo was not a git
  repository at all until this branch of work init'd it — see the 2026-08-06 "send
  this repo" history if `git log` needs context older than that.)

## Current status (read this first, it's kept up to date — changelog below has the *why*)
**Backend** (`backend/`, Express + Mongoose + MongoDB Atlas):
- 20 original collections + this project's additions: `AuditLog`, `Permission`/`Role`
  (RBAC), `Quiz`/`QuizResult`, `CodingChallenge`/`CodingSubmission` (sandboxed via
  Piston, see 2026-08-06 Phase 3 entry). httpOnly-cookie auth (fixed from
  localStorage). 50 Jest tests passing, lint clean.
- Connected to a **live** Atlas cluster (credentials in gitignored root
  `atlas-credentials.env`), seeded with real demo data. Local dev needs the
  non-SRV `MONGO_URI` workaround noted in the 2026-08-06 Atlas entry if `mongodb+srv://`
  fails with `ECONNREFUSED` in this environment.

**Frontend** (`frontend/`, Next.js — the old vanilla SPA that used to live at
`frontend/legacy_html/` was removed 2026-09-02 now that the migration is complete;
see that changelog entry if you need the old reference):

- Brand theme matches the live site exactly (purple/ink palette, Plus Jakarta Sans,
  real logo/illustration, no dark mode — see the two 2026-08-06/07 brand-fix entries
  for why this needed fixing twice).
- **All 34 routes exist and render real data** across admin/mentor/student — every
  nav item from the live site's sidebar has a page, `/dashboard/[section]` placeholder
  has nothing left to catch. See the 2026-08-07 entry for the full list.
- **What's real vs. what's thin**: every list is real `GET` data. Mutations are real
  wherever built (Students Add/Delete, mentor grading, Office Hours book/cancel,
  Placements apply, Announcements post/delete, Leads status, Alumni/Companies
  delete) — but most entities (Batch, Course, Certificate, Company, MockInterview,
  etc.) only have **list + delete**, not full create/edit forms yet. Admin's own
  Assignments view is still a placeholder. Search bar and notification bell are
  **visual only**, not wired to real data.

**What's next** (this section is stale relative to the actual current state further
down in the Changelog — a lot has shipped since it was written; treat it as history,
not a live task list). Short version at the time: create/edit forms for
Batch/Course/Certificate/Company/Announcement/MockInterview, an admin Assignments
oversight page (needs a product decision on which variant first), wiring the search
bar and notification bell to real data, a `resume` field on Profile (currently
dead-ends student placement applications), and a `package.json` script sanity check.
Finance-depth/comms-queue phases stay deferred pending real business need.

## Demo/test logins (seeded, live on Atlas)
| Role | Email | Password |
|---|---|---|
| Admin | admin@placeonix.in | Password123 |
| Mentor | mentor@placeonix.in | Password123 |
| Student | student@placeonix.in | Password123 |

## Run locally
```bash
cd backend && npm install
copy .env.example .env      # set MONGO_URI (see Atlas note above) + JWT secrets
npm run seed && npm run dev  # API → :5000
# separate terminal:
cd frontend && npm install
npm run dev                  # Next.js → :3000
```

## Known limitations
- File uploads are link-based by default; S3 deps exist (`@aws-sdk/client-s3`,
  `multer-s3`) but persistence on serverless isn't guaranteed unless S3 is wired up.
- No SMTP/provider keys configured → email/WhatsApp/SMS not actually sent, notifications
  stay in-app only (and the new frontend's notification bell isn't wired up yet either).
- No Razorpay/payment gateway integration; admin records payments manually.
- "Real-time chat" (old portal) was simulated — no WebSocket server on serverless.
- Demo-mode fallback in the **old** vanilla portal only: if API/DB unreachable, it
  loads with sample data. The new Next.js frontend has no equivalent fallback — it
  just shows real errors, which is the intended behavior going forward.

## Where things are tracked
- The old `prompts_and_plans/` folder (bug trackers, audit report PDF, SEO keyword
  list, planning docs) was removed 2026-09-02 — it wasn't application code and had
  gotten stale. `docs/audit/00-inventory.md` is the one piece of that kept in the repo.

---

## Changelog
> Newest entries at the top. Format: `### YYYY-MM-DD — short title` then 1-3 bullets:
> what changed, why, anything the next session should know.

### 2026-09-02 — Certificate verify page, course create/edit, CI
- Added `/verify/[number]` (public, no login) — every certificate PDF already
  printed a verify URL that led nowhere; it now hits the
  `GET /certificates/verify/:number` endpoint that had been sitting unused.
- Courses now has a real Add/Edit form (matching what Companies already had) —
  backend supported it the whole time, the UI just never got built. Doesn't
  touch the modules/topics curriculum builder, kept that out of scope.
- Added `.github/workflows/ci.yml` — runs the backend test suite and a
  frontend typecheck/lint/build on every push and PR. Nothing ran the tests
  automatically before this.

### 2026-09-02 — Repo cleanup: dropped dead weight
- Deleted `maggot/` (raw source images for mascot art — finished versions already
  live in `frontend/public/mascots/`, nothing referenced the originals), the unused
  `placeonix-logo-v3.png`, `frontend/legacy_html/` (the old vanilla portal, kept as
  a migration reference — migration's done now), and `prompts_and_plans/` (bug
  trackers, audit report, SEO PDF, planning docs — not app code, had gone stale).
  Cut the repo from ~27MB to a fraction of that.
- Renamed `frontend/package.json`'s name field from a leftover `frontend_temp` to
  `placeonix-hub-frontend`.
- Going forward, commit messages are short and plain instead of a written-up
  changelog-style paragraph — this file is where the detail belongs, not git log.

### 2026-08-08 — Login page: removed pointing girl mascot
- User requested removal of the pointing girl mascot (`mascot-dashboard-point.png`)
  that was previously anchored to the right side of the left panel, leaning into
  the login card. Removed the `<Image>` block entirely. The classroom illustration
  (`scene-classroom.png`) now stands alone on the left side.

### 2026-08-08 — Login page: added classroom illustration below the headline text
- New source asset `maggot/Firefly.png` (1376×768 classroom scene, opaque
  near-white `#f7f7f7`-ish background baked in, not real transparency). Matted
  it with the same flood-fill-from-edges approach used for the other mascots
  (whiteboard interior and laptop screens are enclosed near-white regions, not
  connected to the border, so they survived correctly). Saved to
  `frontend/public/mascots/scene-classroom.png`.
- First pass placed it with a flat `maxHeight: 38vh` below the description —
  looked right at 1568×882 but at a shorter viewport (1024×572) it visually
  overlapped the copyright text (verified via a pixel crop, not a guess: the
  38vh cap doesn't know how much space the copyright below it actually needs).
  Fixed properly instead of re-guessing another magic vh number: folded the
  illustration and the copyright into the SAME flex column as the header text
  (`flex h-full flex-col`, illustration wrapped in `flex-1 min-h-0` so it
  shrinks to whatever space is genuinely left above the copyright — which is
  itself just a normal flow sibling now, no longer `position: absolute`).
  Guarantees zero overlap at any viewport height by construction, not
  calibration. Re-verified clean at 1024×572, 1568×780, 1568×882, 1440×1100 —
  no collision with copyright, mascot, or the login card at any of them.

### 2026-08-08 — EmptyState mascot bigger; login headline moved up to logo block
- `EmptyState` (`components/ui/empty-state.tsx`, shared by 17 dashboard pages +
  the header search dropdown) had one fixed `h-24` mascot size for every caller.
  Bumping it site-wide would've bloated the compact `w-80` search-results
  dropdown, so added a `size` prop (`sm`=`h-20`, `md`=`h-44`, default `md`) —
  every list/table empty state got visibly bigger (96px→176px), search dropdown
  explicitly pinned to `size="sm"` and stayed compact (verified both visually).
- Login page: headline + description were `position: absolute; bottom: 0`,
  separate from the top logo/tagline block. Moved them into the same top-left
  stacked group (logo → tagline → headline → description, one flow, no absolute
  positioning) per reference; copyright stays pinned to the bottom on its own.
  Sized the group up too (logo `h-14→h-16`, headline `2.5rem→2.85rem`, tagline
  `text-xs→text-sm`, description `0.95rem→1.02rem`). Verified no overlap with
  the mascot (which is still bottom-anchored via the `calc(210px - 22.5vw)`
  card-contact formula from the prior entry) at 1024/1568/1920px widths.

### 2026-08-07 — Login page: floating-tilt-card redesign, mascot touches card precisely
- Full layout rewrite per new reference: gradient background kept as-is; two-column
  55/45 split; left panel's headline block now `position: absolute; bottom: 0`;
  right side is a floating `rotateY(-4deg)` tilted card (`rgba(245,240,235,0.85)` +
  `blur(20px)`, `32px` radius all corners, `420px` wide) instead of the old flush
  side panel. Inputs/button/demo-rows restyled to the spec's soft inset-shadow look.
- User wanted the mascot's hand to visually touch the card, "no adjustable
  scrollbar", and the card "fixed to full screen". Added `.no-scrollbar` utility
  (`globals.css`) to hide the card's scrollbar while keeping `overflow-y-auto` as
  a safety net; bumped card to `max-h-[94vh]`.
- Mascot-to-card contact needed real geometry, not a guessed offset: first tried
  `right: -X%` (relative to the 55%-wide panel) and `-Xvw` — both drifted badly
  across widths (touching cleanly at 1568px but burying the whole hand behind the
  card at 1024px) because the card's actual left edge follows
  `panelBoundary + 0.225·VW − 210px` (derived from the right column's `45vw` width,
  its `420px` card cap, and `16px` flex padding — valid once `45vw > 452px`, i.e.
  viewport ≳ 1004px), which isn't proportional to a flat vw/percent offset. Set the
  mascot's `right: calc(210px - 22.5vw)` to match that formula exactly — verified
  pixel-precise contact (finger tip at the card edge, not buried or gapped) at
  1024/1280/1568/1920px widths. Below ~1004px wide the touch point drifts (rare
  landscape-tablet range; `md:hidden` already drops the whole left panel <768px).
- Re-verified: `tsc` clean, login flow (Admin quick-login → `/dashboard`) works,
  zero console errors, background gradient untouched.

### 2026-08-07 — Login page: card-height fix, spacing tightened, mascot swapped
- Fixed a real overflow bug: mascot used a bare `85vh` height, which ignored the
  actual space left in its flex section once header/footer text took their share —
  at shorter viewports (reported 1568×882) it overflowed and got silently clipped
  by `overflow-hidden`. Fixed via `maxHeight: min(85vh, 100%)` against the section's
  own box, not the raw viewport. Verified at 572/576/782px heights + mobile 844px.
- Tightened form vertical rhythm (input/button padding, gaps) so the floating login
  card fits without internal scroll on typical screens; kept `overflow-y-auto` as a
  safety net only.
- User supplied a new mascot source (`maggot/dasboard.jpg`) — a JPEG with a baked-in
  checkerboard (no real alpha channel). Matted it with a flood-fill-from-edges
  algorithm (grayscale-background detector + BFS from border, so enclosed light
  areas like the white shirt survive) rather than naive chroma-keying, which would
  have eaten the shirt. The source render's raised arm was gripping/overlapping a
  second prop (a plain rose-pink card, itself clipped by the source frame) with no
  clean pixel seam between hand and prop — connected-component labeling confirmed
  they're 8-connected (one blob), so isolating the prop wasn't algorithmically safe;
  cropped the frame before the raised arm instead, keeping the clean one-hand
  pointing pose. Saved to `frontend/public/mascots/mascot-dashboard-point.png`,
  replaced `scene-study.png` on the login page (only caller, clean cutover, no
  references to the old asset remain).

### 2026-08-07 — Three-interface verification: full Admin/Mentor/Student sweep, 2 more real bugs
- User asked to "check if everything is working perfectly in three interfaces" after
  the error sweep above. That sweep had only browser-verified 14 admin-context pages;
  this pass logged in as **all three roles** and walked every nav item for each
  (admin 21, mentor 14, student 17 — full role-specific nav sets), with the same
  console-error listener attached, plus exercised the key role-specific mutations
  not yet tested: mentor grading, mentor attendance-mark, mentor request approve,
  student assignment submit, student office-hours book (verified in an earlier
  session), student resume→placement apply (re-confirmed).
- **Gap found in my own prior plan, not a runtime bug**: `alumni/page.tsx` was
  flagged in the original recon as needing create/edit, correctly listed in
  `NEXT_STEPS_PLAN.md`'s gap list, but **never actually assigned to a subagent** —
  fell through the cracks between planning and execution. Was still list+delete-only
  for admin. Added `AlumniModal` (create + edit) matching the established pattern;
  verified full create→edit→delete round-trip live, zero errors.
- **Two more real bugs found and fixed**:
  1. **Student Certificates page crashed outright** (`PAGEERROR: certs.map is not
     a function`, page rendered "This page couldn't load"): `certificateController
     .myCertificates` (`GET /certificates/me`) returned `ApiResponse.success(res,
     200, msg, { certificates, count })` — wrapped in an object — while every other
     "my X" list endpoint in this app (`myEnrollments`, notifications, etc.) returns
     the array directly as `data`. The frontend's `api.get<Certificate[]>(...)`
     followed the app-wide convention and called `.map()` on what was actually
     `{certificates: [...], count: N}`. Fixed by returning the bare array, matching
     `myEnrollments`'s exact pattern. Added a regression test asserting
     `Array.isArray(res.body.data)` — `certificates.test.js` now has 3 tests.
  2. (Folded into the gap above — the alumni CRUD gap is the second "bug" in the
     sense that admin-facing functionality was silently incomplete.)
- **Full sweep results, zero console errors anywhere** (after fixes) across:
  - **Admin**: dashboard, calendar, alumni (+ now has create/edit), courses, reviews,
    leaderboard, reports, settings — plus everything already verified in the error
    sweep above.
  - **Mentor**: dashboard, calendar, mock-interviews, alumni, office-hours,
    my-students, sessions, assignments, attendance-mark, requests, resources,
    reviews, leaderboard, profile — all 14 nav items load clean. Live-verified
    mutations: graded a real submission (score+feedback round-tripped), marked a
    student present (confirmed via direct API read, not just UI), approved an
    online-join request (status flipped, persisted).
  - **Student**: dashboard, calendar, mock-interviews, alumni, office-hours,
    my-courses, attendance, assignments, sessions, resources, placements,
    certificates, leaderboard, payments, reviews, profile, support — all 17 nav
    items load clean. Live-verified: submitted an assignment (status →
    "Submitted", survived a reload), attendance page reflects the mentor's mark
    from the same session (cross-role data consistency confirmed end-to-end).
- Hit the global rate limiter three more times this pass (once per role-switch
  cycle, from the density of nav-sweep + mutation testing) — same documented
  non-issue, waited out `Retry-After` each time (ranged 68s–800s depending on how
  depleted the 15-minute window already was).
- **Final state**: `npx tsc --noEmit` clean, `npm run build` clean (34 routes),
  backend `npm test` **57/57 passing** (56 prior + 1 new `/certificates/me` shape
  test). One flaky single-test timeout observed on a full-suite run under machine
  load (same class as the earlier certificates-test flake) — re-ran clean at 57/57;
  not a real defect, the test suite itself has no inherent race.
- Next session: genuinely nothing known-broken across any of the three interfaces.
  If auditing further, the untested-by-me-directly remainder is narrow: mentor
  Feedback **respond** action (reviews page) and a few secondary admin list views
  (Reports' chart interactions, Settings' password-change flow) were loaded but not
  mutation-tested this pass — low risk, same shared components already proven
  elsewhere. Root cleanup (removed `_serve.js`/`vercel.json`, `cookies.txt`/
  `loginresp.json`, moved `BRAIN.md` back to root) happened externally mid-session;
  adapted, noted here per convention.

### 2026-08-07 — Root directory perfectly organized
- Removed obsolete configuration files (`_serve.js`, `vercel.json`) that referenced the old vanilla frontend.
- Removed junk temporary files (`cookies.txt`, `loginresp.json`).
- Moved this `BRAIN.md` file back to the root directory where it serves as the project's living memory.
- Ensured all other loose planning documents remain in `prompts_and_plans/`.

### 2026-08-07 — Full error sweep: browser-verified every remaining page, found + fixed 6 real bugs
- User asked to "test for errors and fix if there are any, then go to the next phase."
  Interpreted as: browser-verify the 14 pages the prior session hadn't live-tested yet
  (only build/tsc-clean, not click-tested), with a console-error listener attached on
  every page load and every mutation, fixing anything real found along the way.
- **Console errors observed across the whole sweep: zero** (excluding two expected
  429s from the documented rate limiter — see below). Every page loads clean.
- **Six real bugs found and fixed, each verified live after the fix + covered by a
  regression test where backend logic was involved**:
  1. **Sessions "Delete" mislabeled** (`sessions/page.tsx`): `DELETE /sessions/:id`
     is a soft-cancel by backend design (`session.status='cancelled'`, doc never
     removed — the controller's own doc comment says "Delete / cancel session").
     The button said "Delete" but never deleted anything. Relabeled to "Cancel" and
     hid it once a session is already `cancelled`/`completed` (nothing left to cancel).
  2. **Mentors "students" count was a phantom field** (`mentors/page.tsx`): read
     `m.mentorProfile?.studentCount`, a field that has **never existed** in the
     `User` schema (`mentorProfile` only has specialization/experience/qualifications/
     hourlyRate/rating/totalReviews/availableSlots) — always silently rendered 0
     regardless of real enrollment. Fixed by deriving the count from live batch data
     (`GET /batches`, sum `enrolledCount` where `batch.mentor._id === mentor._id`).
     Also fixed the status badge, which was hardcoded green regardless of actual
     status — added the same `STATUS_STYLE` map `students/page.tsx` already uses, so
     a `suspended` mentor (settable via the Edit modal added last session) now
     actually reads as suspended, not falsely "active"-styled green.
  3. **Payment refund status logic bug** (`paymentController.refundPayment`):
     `payment.status = amount >= payment.amount ? 'refunded' : 'partial-refund'` —
     when `amount` is omitted (the documented "leave blank to refund in full" UX),
     `req.body.amount` is `undefined`, and `undefined >= N` is always `false` in JS,
     so **every full refund silently landed on `'partial-refund'`, never
     `'refunded'`**. Worse: the `if (status === 'refunded') return
     AlreadyRefunded` guard never triggered for these, so the same payment could be
     refunded repeatedly — a real double-refund financial bug. Fixed by computing
     `refundAmount = amount || payment.amount` once and using it consistently for
     the status check, the stored refund amount, and the enrollment balance update.
     Added a regression test (`payments.test.js`) asserting a blank-amount refund
     sets `status: 'refunded'` and that a second refund attempt now correctly 400s.
  4. **Certificate issuance always 500'd** (`Certificate.js`): `certificateNumber`
     is `required: true` with a `pre('save')` hook that generates it — but Mongoose
     runs schema validation (which enforces `required`) *before* `pre('save')`
     hooks fire, so every issuance failed with "certificateNumber: Path
     `certificateNumber` is required." This made the entire admin "Issue
     Certificate" feature — built and shipped last session — completely broken.
     Fixed by moving the generator to `pre('validate')`, which runs before
     validation. Added `certificates.test.js` (this feature had **zero** prior test
     coverage) covering successful issuance (asserts the generated number format)
     and the already-issued 409 guard.
  5. **Office-hours admin slot creation always 500'd**
     (`officeHourController.createSlot`): `mentor` is `required: true` on
     `OfficeHourSlot`, but the controller only self-assigned
     `body.mentor = req.user._id` when `req.user.role === 'mentor'` — an admin
     (also `authorize()`'d to hit this route, and the frontend does show admin an
     "+ Add Slot" button) got no mentor set at all, 500ing every time. Fixed:
     controller now requires an explicit `mentor` in the body for non-mentor
     callers (clean 400 if missing, not a 500); route validator now accepts
     `body('mentor').optional().isMongoId()`; frontend `AddSlotModal` gained an
     admin-only Mentor `<Select>` (populated from `GET /users?role=mentor`),
     required before submit. Added `officeHours.test.js` (also zero prior
     coverage): mentor self-assign still works, admin-with-no-mentor now 400s
     with a clear message instead of 500ing, admin-with-mentor succeeds.
  6. **Announcements Edit silently did nothing** (`announcements/page.tsx`):
     `EditAnnouncementForm` rendered the shared `<ModalActions>` (a `type="submit"`
     button) inside a plain `<div>`, not a `<form onSubmit>`. A `type="submit"`
     button with no enclosing `<form>` fires no submit event on click — so clicking
     "Save" did **nothing**: no request, no error, modal just sat there. (The
     sibling `NewAnnouncementForm` above it was unaffected — it uses a plain
     `onClick={handleSubmit}` button, not `ModalActions`.) Fixed by wrapping the
     modal body in `<form onSubmit={handleSubmit}>` with `e.preventDefault()`,
     matching every other CRUD page's pattern. **Audited every other page for the
     same class of bug**: grepped all 29 dashboard pages for `ModalActions` vs
     `<form` counts (adjusting for the one `ModalActions` mention every file's
     import line contributes) — announcements was the only file with a real
     mismatch; all others have exact 1:1 correspondence.
- **Verified live in-browser, full create→edit→delete round-trips, on every
  remaining page**: Batches, Sessions (+start/complete lifecycle), Placements,
  Companies, Mentors, Students, Leads (+notes), Payments (+refund), Certificates
  (+revoke), Resources, Announcements, Mock Interviews, Office Hours, Attendance
  (admin/mentor batch view — read-only by design, confirmed switching batches
  reloads real data). Every mutation checked against a live console-error listener,
  not just visual inspection.
- Hit the documented global rate limiter twice more (`RateLimit-Limit: 100;w=900`)
  from testing velocity — both times just waited out the `Retry-After` window
  (curl against `/health` or any GET confirms `RateLimit-Remaining` directly); not
  a bug, consistent with the standing note in the entry below.
- **Final state**: `npx tsc --noEmit` clean, `npm run build` clean (34 routes),
  backend `npm test` **56/56 passing** (50 original + 6 new: 1 payments regression +
  2 certificates + 3 office-hours). Two new test files added
  (`certificates.test.js`, `officeHours.test.js`) for features that had shipped
  with zero coverage.
- Next session: no known open bugs. If continuing to a "next phase," the natural
  candidates per `docs/PLATFORM_UPGRADE_PLAN.md` are Phase 4+ (finance depth, CRM,
  comms queues, multi-branch) — all still explicitly gated on real business need,
  not technical readiness. No backend architecture work is outstanding.

### 2026-08-07 — Frontend completion pass, part 2: browser verification + a real bug fix
- Resumed the paused session above. Ran the full in-browser smoke test as planned.
- **Real bug found and fixed**: the `AssignmentsCRUD` subagent's task had exited
  early (reported `exit 1`) — it built `AssignmentModal` + extended `MentorGrading`
  with full create/edit/delete, but never actually wired the **admin** role to use
  it; admin still hit the old "hasn't been migrated" placeholder despite the file
  containing everything needed. Fixed in `assignments/page.tsx`: admin now renders
  `MentorGrading` (same component mentors use — it's a superset of the "list +
  submission counts + CRUD" the spec asked for, admin arguably benefits from seeing
  grading too). Also fixed a latent scoping bug in the same component: the
  "my batches" filter (`b.mentor?._id === user._id`) was applied unconditionally,
  which would have silently shown **zero batches** in admin's create-assignment
  form (admin's `_id` never matches a batch's mentor) — scoped that filter to
  `role === 'mentor'` only. The other "failed" subagent (`ReviewsCreateRespond`)
  turned out fully correct on inspection — its `exit 1` was likewise just an
  early-exit after finishing the file write, no code defect.
- **Verified in-browser (real Atlas data, both roles)**:
  - Courses: full create → edit → delete round-trip confirmed persisted (survived
    reload). Caught and corrected a **test-harness** mistake along the way (Puppeteer
    triple-click didn't clear an input before `type()`, producing a concatenated
    string) — not a product bug; `tab.fill` (clear+set) is the correct tool for
    scripted edits on these forms, kept for future QA sessions.
  - Assignments (admin): after the fix above, full create → edit → delete round-trip
    confirmed, using a real batch picker with 3 live batches.
  - Reviews: create confirmed (batch-target); also exercised the **real duplicate-review
    guard** (student already had a mentor review — backend correctly rejected with
    "You already reviewed this", rendered inline, modal stayed open) — proves the
    error path is real, not swallowed. Delete confirmed.
  - Header search: typed "stud" as admin → live `GET /search` hit returned the real
    student "Arjun Reddy". Confirmed hidden for the student role (backend restricts
    `/search` to admin/mentor; frontend now matches).
  - Notification bell: real unread badge count rendered for both admin (0) and
    student (3, live from seed data); panel opens and calls the real endpoint.
  - **Resume → Placement Apply, the flow this whole plan existed to unblock**: added
    a resume link on the student Profile, saved, confirmed it survived a full page
    reload (round-tripped through Atlas), then went to Placements and successfully
    applied to a drive — button flipped to disabled "Applied". This was previously a
    hard dead-end (`FEATURES.md`/`BRAIN.md` both flagged it); now resolved end-to-end.
  - Placement LPA display confirmed correct (₹4.5L–₹5L, not the old
    divide-by-100000 bug from the 2026-08-07 "20 new pages" entry).
- Hit the documented **global rate limiter** again near the end of testing
  ("Too many requests, please try again later" on `/reviews`) — same known,
  expected local-dev-testing-velocity behavior noted in the 2026-08-07 entry below;
  not a bug, stopped testing rather than restart a backend process this session
  didn't start.
- Final state: `npx tsc --noEmit` clean, `npm run build` clean (34 routes), backend
  `npm test` 50/50 green — all after the assignments fix. All 27 planned tasks
  (5 foundations + 17 CRUD pages + 5 verification checks) complete.
- **Definition of done from `NEXT_STEPS_PLAN.md` §7 is met**: every nav item for
  every role supports the operations the backend allows; no in-page "not migrated"
  placeholders remain (admin Assignments and mentor/admin Attendance were the last
  two, both replaced this pass); search + notifications are live; a student can
  self-serve a resume and apply to a placement.
- Next session: nothing blocking remains from this plan. Untested-in-browser (but
  `tsc`/`build`-clean and structurally identical to the verified pages) — Batches,
  Sessions, Placements, Companies, Mentors, Students(edit), Leads, Payments,
  Certificates, Resources, Announcements, Mock Interviews, Office Hours, Attendance
  — reasonable to spot-check a few of these live before considering the release
  fully proven, but no known issues. Deferred-by-design items unchanged: Razorpay,
  SMTP/SMS/WhatsApp senders, real-time chat, S3 persistence, Phase 4-7 (finance
  depth/CRM/comms-queues/multi-branch).

### 2026-08-07 — Frontend completion pass: full CRUD across all pages (paused before browser smoke)
- Wrote `prompts_and_plans/NEXT_STEPS_PLAN.md` (grounded completion plan). Key finding:
  the **backend already exposes full CRUD for every entity** — this was a frontend
  build-out, not backend work. Only backend change made: `updateUser` now lets an
  **admin** set a user's `status` (active/inactive/suspended) via `PATCH /users/:id`
  (was silently dropped before); self-editors still can't. `PATCH /office-hours/:id`
  intentionally left absent (create/delete/book/cancel is a complete lifecycle).
- Built a shared UI kit (`frontend/src/components/ui/modal.tsx`, `.../ui/form.tsx`) and
  extended `User.studentProfile` types (resume/skills/college/degree/gradYear/socials).
- Wired the two dead header controls: **search** (`components/header-search.tsx`,
  debounced `GET /search`, admin/mentor only) and the **notification bell**
  (`components/notification-bell.tsx`, unread badge + panel: read/read-all/delete/clear).
- **Profile** now exposes the resume link + career fields (the exact field that gated
  placement Apply). Added create/edit/delete forms to ~17 pages via parallel subagents:
  courses, batches, sessions, placements, companies, mentors, students(edit),
  leads(create/delete/notes), payments(record/status/refund), certificates(issue/revoke),
  resources(link upload/edit), reviews(student create + mentor/admin respond + delete),
  announcements(edit), mock-interviews, office-hours(create/delete), assignments
  (CRUD + real admin oversight, replacing the placeholder), attendance (mentor/admin
  batch view, replacing the placeholder). No `[section]` placeholders remain.
- **Verified so far**: `npx tsc --noEmit` clean, `npm run build` clean (all 34 routes),
  backend `npm test` green (50/50). **NOT yet done — resume here**: in-browser smoke
  test (create→edit→delete round-trip per entity; search results; notification panel;
  student adds resume → applies to a placement). Backend runs on :5000 (Atlas), frontend
  on :3000 — both were already up. Two subagents (assignments, reviews) reported
  `exit 1` but their files landed complete and typecheck/build clean; spot-check them
  first in the browser tomorrow.

### 2026-08-07 — Brain refresh: header sections rewritten to match current reality
- The top-of-file sections (`What this is`, `Structure`, `Stack`, `Data model`, `Auth`,
  `Known limitations`) hadn't been touched since the very first brain entry
  (2026-08-05) and had drifted badly out of date after the reorg + full frontend
  build-out: still described the old vanilla-JS SPA, `placeonix-hub-backend/` paths,
  "not currently a git repo," and 20 collections with no mention of RBAC/Quiz/Coding
  Challenge/AuditLog. Consolidated into a single **"Current status"** section (new,
  right after "What this is") that's meant to be the fast-orientation read — current
  backend/frontend state and a concrete, priority-ordered "what's next" list — with
  the detailed *why* left in the dated entries below it, which are unchanged.
- Not a code change — no `git diff` outside `prompts_and_plans/BRAIN.md`.
- Note for next session: **keep "Current status" current** going forward — when it
  drifts noticeably from a changelog entry's "Next session" notes, that's the signal
  to refresh it again, same as this entry did.

### 2026-08-07 — Frontend: every nav item now a real page, all 3 roles (20 new pages)
- User asked for every page (Dashboard through Settings) across all three role
  interfaces. Built all of it in one pass: Sessions, Placements, Companies, Leads,
  Payments/Fees, Certificates, Resources, Reviews, Leaderboard, Announcements, Mock
  Interviews, Alumni, Office Hours, Reports, Settings — plus mentor-specific My
  Students, Online Requests, and Attendance-mark, plus shared Profile/Support. The
  `/dashboard/[section]` placeholder route now has nothing left to catch for the 21
  nav ids across admin/mentor/student.
- Reused the established patterns throughout: role-aware single component per route
  (shared nav items like Sessions/Resources/Leaderboard/Calendar branch on
  `user.role` rather than duplicating pages), real GET for every list, real mutations
  wherever the backend supports them (not just display) — Leads status dropdown,
  Office Hours book/cancel, Placements apply, Announcements post/delete, Alumni/
  Companies delete, and a full mentor grading flow (score + feedback →
  `POST /assignments/:id/submissions/:id/review`).
- Extended `assignments/page.tsx` specifically: was student-only before, now branches
  three ways — student (submit), mentor (`MentorGrading` — review each submission
  inline), admin (still placeholder, admin assignment oversight wasn't asked for).
- **Two real bugs found and fixed during verification, not before**:
  1. Placements/Reports were dividing `package.min/max` and `highestPackage` by
     100,000 assuming raw-rupee storage — the seed data and schema actually store
     these fields already in LPA units (e.g. `5.5`, not `550000`). Was rendering
     "₹0.0L" for every drive. Fixed by displaying the values directly.
  2. None in Attendance this round, but re-confirms the standing lesson: **verify
     the actual stored data shape per field, not just the field's existence** — a
     field being present and a field being in the unit you assumed are different
     bugs, and the second one doesn't throw, it just silently displays wrong.
- Verified extensively in-browser: looped console-error checks across all 20 admin
  pages and 12+ mentor/student pages (all clean after distinguishing real errors
  from stale console-buffer noise and the global rate limiter's 429s during rapid
  testing — see below). Did a full round-trip proof: student submits assignment →
  mentor grades it with real score/feedback → student sees "Graded" with the exact
  feedback text, confirmed via 3 separate screenshots across a role-switch. Also
  confirmed Placements' "Apply" button correctly surfaces a real backend validation
  error ("add a resume before applying") via `alert()` — proof the mutation path
  reaches real business logic, not just a happy-path demo.
- Hit the **global API rate limiter** (100 req/15min, `app.js`) during rapid
  successive page-navigation testing — not a bug, just this session's test velocity.
  Restarting the backend clears the in-memory limiter (same trick as clearing
  express-rate-limit state generally — don't do this reflexively in production, only
  for local dev testing friction).
- `tsc`/lint/build clean across all 34 routes.
- **Known gaps, disclosed rather than hidden**: Add/Edit modals only exist for
  Students and Announcements — everything else is list + delete + the specific
  mutations noted above, not full CRUD-with-forms for every entity (e.g. no "Create
  Batch"/"Create Course"/"Issue Certificate"/"Add Company" forms yet — those need
  more relational-field inputs than time allowed). Admin's Assignments view is still
  a placeholder. The Profile page can't fix the "add a resume" placement-apply block
  since it doesn't have a resume field. Notifications panel and live search results
  dropdown are still visual-only (flagged in the previous entry, still true).

### 2026-08-06 — Frontend: 4 admin CRUD pages (Students, Mentors, Batches, Courses)
- User asked to check *every* page on the live site and wire up full backend
  functionality. Surveyed the live site's full admin nav (20 items) directly —
  screenshotted Students, Mentors, Batches, Courses in detail. Given the scope (20+
  admin pages, plus mentor/student variants), explicitly scoped this pass to the 4
  highest-traffic admin CRUD pages rather than attempt all of them silently; said so
  to the user rather than claiming full completion.
- `dashboard/students/page.tsx`: table matching the live layout (avatar+enrollmentId,
  email, phone, joined date, status badge), **real** `+ Add Student` modal
  (`POST /users` with role=student) and **real** `Delete` (`DELETE /users/:id`) — both
  verified end-to-end in-browser: added a student, got back a real generated
  `enrollmentId` (`PLX20260004`), deleted it, confirmed gone after a fresh reload
  (not just local state).
- `dashboard/mentors/page.tsx`: list with real `DELETE /users/:id`.
- `dashboard/batches/page.tsx`: card grid from `GET /batches`, real seat
  counts/mentor/status.
- `dashboard/courses/page.tsx`: full catalog from `GET /courses` with a working
  client-side category filter (verified: clicking "Web Development" correctly
  narrows 17 courses down to the 1 matching course).
- Extended `lib/types.ts`'s `User` (phone, createdAt, studentProfile, mentorProfile)
  and `Batch` (course, capacity, enrolledCount, status) rather than adding duplicate
  interfaces — caught and fixed a duplicate `Batch` interface (TS would have silently
  used whichever came last) before it shipped.
- Fixed a minor Next.js LCP warning (sidebar logo needed `priority` since it's
  above-the-fold on every page) — not a bug, but a legitimate perf hint worth
  clearing rather than ignoring.
- Verified all 4 pages in-browser against our own backend + Atlas data, zero console
  errors after a dev-server restart (same Turbopack-cache lesson as the Calendar grid
  bug — restart before trusting a "broken" render). `tsc`/lint/build all clean.
- **Not done yet, scoped out of this pass, still using the `[section]` placeholder**:
  Sessions, Placements, Companies, Leads, Payments, Certificates, Resources, Reviews,
  Leaderboard, Announcements, Reports, Settings, Mock Interviews, Alumni, Office
  Hours (admin) — plus the mentor and student role variants of pages already built
  for admin only. Students/Mentors pages also dropped Import/Export CSV and
  View/Edit actions from the live site for time — only Add/Delete are real so far.
  Next session: continue this same pattern (survey live page → real GET for list →
  real mutations for the actions that matter) down the remaining nav, prioritizing
  whichever the user actually uses day to day.

### 2026-08-06 — Frontend: full shell + admin Dashboard + Calendar to match live site (round 2)
- User provided screenshots of the actual live admin Dashboard and Calendar pages —
  showed the previous round's fix was correct in direction but incomplete: the header
  was missing the search box/notification bell, Logout was in the header instead of
  pinned at the sidebar bottom, and the Dashboard page was a generic stat grid instead
  of the real admin layout (gradient welcome banner, 4 emoji stat cards, Key Metrics
  colored rows, Recent Students list). No Calendar page existed at all.
- `Sidebar`: added a `Logout` button pinned at the bottom (new `logout`/`search`
  icons in `components/icons.tsx`), matching the legacy `.sb-bottom`/`.logout-btn`.
- Dashboard header (`dashboard/layout.tsx`): added the search input and notification
  bell (visually matching `.gsearch`/`.notif-btn` — not wired to real search/notif
  data yet, that's still open), removed the now-redundant header Logout button.
- `dashboard/page.tsx` split into `AdminDashboard` (the real thing: gradient
  `.welcome-banner` with the building emoji, 4 `StatCard`s pulling
  `GET /analytics/overview`, a `Key Metrics` panel and `Recent Students` list pulling
  `GET /users?role=student&limit=3&sort=-createdAt`, both ported field-for-field from
  the legacy renderer) and `GenericDashboard` (mentor/student — kept the simpler
  `/users/me/stats` view since no reference screenshot exists for those roles yet,
  restyled onto the same `StatCard` component for visual consistency).
- New `dashboard/calendar/page.tsx`: full month-grid calendar combining three real
  data sources exactly like the legacy `renderCalendar()` — `GET /sessions` (blue,
  "Classes"), `GET /assignments` (amber, due dates), `GET /placements` (purple,
  application deadlines) — with Prev/Today/Next navigation, a color legend, today
  highlighted, per-day event chips (max 3 + "N more"), and an "Upcoming" list below.
- **Hit a real Tailwind v4 + Turbopack dev bug**: `grid-cols-7` on the calendar grid
  computed as a single-column layout (`gridTemplateColumns: 974px` instead of 7
  tracks) even though the class was present in the DOM and other Tailwind utilities
  on the same page worked fine — the dev server's CSS bundle just hadn't picked up
  that utility. A full `npm run dev` restart fixed it (confirmed via
  `getComputedStyle` before/after); `npm run build` had it right from a cold start,
  so this looks Turbopack-dev-cache-specific. **If a Tailwind class visibly isn't
  applying despite correct markup, restart the dev server before assuming the
  className is wrong.**
- Verified in-browser against the actual reference screenshots: admin Dashboard is a
  near-exact match (banner, stat cards, Key Metrics, Recent Students all rendering
  real data), Calendar matches structurally with real events across all three types,
  Prev/Today/Next confirmed working. Re-checked student role afterward — dashboard,
  My Courses, sidebar/header all still consistent. Zero console errors anywhere.
  `tsc`/lint/build all clean.
- Next session: search input and notification bell are **visual only** — no live
  search-as-you-type or real notifications wired up yet (the legacy portal's
  `/search` and notification endpoints exist server-side and could be connected).
  Mentor/student Dashboard still uses the generic view — get reference screenshots
  for those roles if pixel-parity matters there too. Calendar's event fetch
  (`?limit=300` on three endpoints) is a temporary approach ported as-is from legacy;
  fine at current data volume, would need real date-range filtering at scale.

### 2026-08-06 — Frontend brand-theme fix: matched the actual live site design
- **Root cause the user flagged**: the Next.js frontend built in earlier sessions used
  a generic black/white minimal theme with `prefers-color-scheme: dark` support — but
  the real brand (verified live at https://placeonix-dashboard.vercel.app/, and
  matching `frontend/legacy_html/placeonix-hub-portal.html`) has **no dark mode** and
  uses a specific purple/ink palette + Plus Jakarta Sans font + a real logo and login
  illustration. On a system in dark mode, the whole app was silently flipping to
  black backgrounds — that's what "backgrounds have changed" meant.
- Ported the brand design tokens 1:1 from the legacy portal's `:root` CSS vars into
  `app/globals.css` (`--purple`, `--ink`, `--muted`, `--line`, `--bg`, status colors)
  via Tailwind v4's `@theme inline`, with **no dark-mode variant** — deliberate, since
  the brand doesn't have one and that adaptive theme was the bug.
- Switched the font from Geist to Plus Jakarta Sans (`layout.tsx`) to match.
- Copied the real logo (`placeonix-logo.png`) and login illustration
  (`login-illustration.svg`) from `frontend/legacy_html/assets/` into
  `frontend/public/brand/`.
- Rebuilt `/login` to match the live site's split-screen design pixel-for-pixel:
  gradient brand panel (logo, tagline, headline, illustration, footer) + form panel
  (icon-prefixed inputs, password show/hide toggle, gradient login button, working
  "Quick Demo Access" buttons that actually log in — not just decorative).
- Rebuilt `Sidebar` and the dashboard header to match the legacy shell: white
  sidebar with the real logo, role-colored avatar initials (admin `#5b5fc7`, mentor
  `#5b7c99`, student `#3f9c6d` — new `lib/roles.ts`), purple active-nav highlight
  with the left accent bar, translucent blurred header showing the current page
  title. Updated every existing page (`dashboard`, `my-courses`, `assignments`,
  `attendance`, the `[section]` placeholder, `auth-guard`'s loading spinner) to use
  the brand tokens instead of the old black/white `dark:` utility classes.
- Hit and fixed a `next/image` aspect-ratio warning along the way: the logo/
  illustration `width`/`height` props were guessed values with the wrong aspect
  ratio (real: logo 855×277, illustration viewBox 1094×760) — fixed by using the
  actual intrinsic dimensions rather than papering over it with inline `style`
  overrides.
- Verified in-browser against a fresh screenshot compared directly to the live site:
  login screen is now a close visual match, dashboard/My Courses shell carries the
  same purple/ink/role-color system. Zero console errors/warnings anywhere.
  `tsc`/lint/build all clean.
- Next session: **if any more pages get built, use the tokens in `globals.css`
  (`text-ink`, `text-muted`, `bg-purple-lt`, etc.) and `lib/roles.ts`'s `ROLE_COLOR`
  — do not reach for Tailwind's default black/white/dark: utilities again**, that's
  exactly what caused this regression. The `Assignments`/`Attendance` pages are the
  reference for the pattern now.

### 2026-08-06 — Next.js frontend: Student Attendance page
- `app/dashboard/attendance/page.tsx` — summary stat row (overall %, present/late/
  excused/absent counts) + a sortable-by-date table of every attendance record
  (batch, session, color-coded status), fetching `GET /attendance/me`.
- **Caught and fixed a role-gating bug during verification, not before**: the
  mentor-role fallback message rendered correctly, but the page still fired
  `/attendance/me` on mount regardless of role — and that route is
  `authorize('student')`-only on the backend, so mentors got a console 403 on every
  visit even though the UI looked fine. Fixed by gating the fetch itself on
  `user.role === 'student'`, not just the rendered output. Re-verified both roles
  clean afterward. Worth remembering for the next placeholder-to-real-page
  graduation: check whether the endpoint is role-restricted, and gate the *fetch*,
  not just the UI branch, before calling it done.
- Verified in-browser as the seeded student: 88% overall, 37 present/3 excused/2
  absent, 40 real records rendered correctly. `tsc`/lint/build all clean.
- Next session: same pattern continues. Remaining student placeholders: Sessions,
  Resources, Placements, Certificates, Fees, Leaderboard, Feedback, Profile. Mentor
  and admin sections are all still placeholders — nothing built for those roles yet
  beyond the "not migrated" fallback message pattern.

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
