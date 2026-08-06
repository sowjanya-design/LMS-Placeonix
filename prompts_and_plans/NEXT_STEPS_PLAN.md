# Placeonix Frontend — Next Steps Plan

> Companion to [`BRAIN.md`](./BRAIN.md) — that file is the historical "what happened
> and why," this file is the forward-looking "what to build next, in what order, with
> what exact fields/endpoints." Update `BRAIN.md`'s changelog when you complete an
> item here; check items off or delete them from this file as they land so it never
> goes stale.

## How to use this document
Each item below is scoped to be independently shippable: one entity, one page, one
clear "done" condition. Work top to bottom unless the user redirects — the order is
priority, not dependency (nothing here blocks anything else). Every item that touches
the frontend should follow the established patterns already in the codebase:

- **Design tokens**: use `globals.css`'s CSS vars (`text-ink`, `text-muted`, `bg-bg`,
  `bg-purple-lt`, `text-purple`, `border-line`, etc.) and `lib/roles.ts`'s
  `ROLE_COLOR` — never Tailwind's default black/white/`dark:` utilities. This caused
  a real regression twice (see `BRAIN.md` 2026-08-06 brand-fix entries).
- **Role-aware single component per route** where a nav item is shared across roles
  (see `assignments/page.tsx` for the 3-way branch pattern: student / mentor / admin).
- **Real GET, real mutations** — no fake/demo data. If a mutation isn't backed by a
  real endpoint yet, don't build a form for it; note it as a backend gap instead (see
  §7 below for the current backend gaps).
- **Verify in-browser, not just `tsc`/lint/build** — screenshot or `browse` the actual
  page after building it, ideally as more than one role. Restart the dev server before
  trusting a "broken" render — Turbopack's dev cache has silently served stale
  Tailwind utilities before (`BRAIN.md` 2026-08-06 Calendar entry).
- **Watch the rate limiter during testing** — rapid successive page navigations can
  trip the global 100 req/15min limiter (`backend/src/app.js`) or the 10 req/15min
  auth limiter. Restarting the backend clears the in-memory store; don't loop-test
  faster than a real user would without expecting this.
- **Check field units, not just field presence** — `PlacementDrive.package.min/max`
  and `highestPackage` are stored in LPA (e.g. `5.5`), not raw rupees. This exact
  class of bug (field exists, wrong assumed unit, silently wrong display, no error
  thrown) has already happened once — assume it could happen again with any new
  numeric field and check the seed data / schema comment before assuming a unit.

---

## Priority 1 — Create/Edit forms for entities that only have list + delete

These six pages currently render real data and support delete (where applicable) but
have no way to create or edit a record from the UI. Each needs a modal or inline form,
following the `AddStudentModal` pattern in `dashboard/students/page.tsx` as the
reference implementation (controlled inputs, inline validation error display, submit
disables + shows a loading label, closes and prepends to the list on success).

### 1.1 — Create Batch (`dashboard/batches/page.tsx`)
- **Endpoint**: `POST /api/v1/batches` (admin only)
- **Required fields**: `name` (text), `code` (text, must be unique — surface the
  backend's 409/validation error if a duplicate is submitted), `course` (select,
  populate from `GET /courses`), `mentor` (select, populate from
  `GET /users?role=mentor`), `startDate` (date), `endDate` (date)
- **Optional fields worth including**: `capacity` (number, default 30 per
  `MAX_BATCH_SIZE`), `mode` (select: online/offline/hybrid), `venue` (text, only
  relevant if mode ≠ online), `schedule.days` (multi-select Mon–Sun),
  `schedule.startTime`/`schedule.endTime` (text, e.g. "09:00")
- **Done when**: a new batch appears in the grid immediately after creation, with the
  course title and mentor name resolved (not just raw ids) — this requires either
  re-fetching the list or having the create response populate `course`/`mentor`
  before prepending to state.

### 1.2 — Create Course (`dashboard/courses/page.tsx`)
- **Endpoint**: `POST /api/v1/courses` (admin only)
- **Required fields**: `title`, `category` (select — reuse the existing category pill
  list already rendered on this page as the option source), `description`,
  `duration` (text, e.g. "4-6 Months"), `fee.amount` (number)
- **Optional fields worth including**: `shortDescription`, `level` (select:
  Beginner/Intermediate/Advanced/All), `isPublished` (checkbox — note published
  defaults to `false` per the model, so an admin creating a course expecting it to
  show up publicly needs this surfaced, not hidden)
- **Done when**: new course appears in the catalog grid and is filterable by its
  category immediately (client-side filter already exists on this page — verify the
  new course's `category` string exactly matches an existing pill or a new pill
  appears for it).

### 1.3 — Issue Certificate (`dashboard/certificates/page.tsx`, admin view)
- **Endpoint**: `POST /api/v1/certificates/issue` (admin only)
- **Required fields**: `enrollmentId` — this is the tricky one: the form needs an
  enrollment picker, not a student picker, since the backend looks up
  `Enrollment.findById(enrollmentId)`. Practical approach: a two-step select
  (student → their enrollments via `GET /users/:id/enrollments`, or reuse
  `GET /users/me/enrollments`-shaped data by admin-fetching a specific student), OR
  simpler for v1: a raw enrollment-id text input with a note, since building a full
  student→enrollment cascading selector is real UI work.
- **Optional fields**: `type` (select: completion/merit/internship/specialization,
  default completion), `grade` (text), `score` (number)
- **Backend behavior to surface in the UI**: issuing fails with 409 "Certificate
  already issued" if the enrollment already has one — show this as a normal inline
  error, not a crash.
- **Done when**: a real certificate with a real `certificateNumber` appears in the
  admin list after issuing, and the *student* who owns that enrollment sees it on
  their own `/certificates/me` view without needing a backend change.

### 1.4 — Add Company (`dashboard/companies/page.tsx`)
- **Endpoint**: `POST /api/v1/companies` (admin only)
- **Required fields**: `name` (text, must be unique)
- **Optional fields**: `website` (url), `industry` (text), `location` (text),
  `contactPerson`, `contactEmail`, `contactPhone`
- **Done when**: new company appears in the list; this is the simplest form in this
  section — good one to build first if sequencing by effort rather than priority.

### 1.5 — Edit / Delete Announcement, Post as Mentor
- Post-and-delete already work (`dashboard/announcements/page.tsx`). Missing: **edit**.
- **Endpoint**: `PATCH /api/v1/announcements/:id` (admin, mentor)
- Add an "Edit" affordance per announcement (inline expand, matching the assignment
  submit-form pattern) with `title`, `body`, `type` (select) fields pre-filled.
- **Done when**: editing a published announcement updates it in place without a full
  page reload, and the edit is visible to other roles who can see announcements.

### 1.6 — Schedule Mock Interview
- **Endpoint**: `POST /api/v1/mock-interviews` (admin, mentor)
- **Required fields**: `student` (select — populate from mentor's own students via
  `GET /users/my-students` for a mentor, or `GET /users?role=student` for admin),
  `title`, `scheduledAt` (datetime-local input)
- **Optional fields**: `role` (target role text), `company`, `type` (select:
  technical/hr/aptitude/group-discussion/system-design), `mode` (online/offline),
  `meetingLink`
- **Done when**: new mock interview appears in the list for both the scheduler and
  the assigned student.

---

## Priority 2 — Admin Assignments oversight page
Currently `assignments/page.tsx`'s admin branch is a placeholder ("admin assignment
oversight hasn't been migrated yet"). Decide what admin actually needs here before
building — options, roughly in order of likely value:
1. **Read-only cross-batch view**: every assignment across every batch, with
   submission counts and average scores — a supervisory view, not a grading one
   (mentors already grade). `GET /assignments` with no batch filter already returns
   everything for an admin per the backend's role-aware `listAssignments`.
2. **Create assignment as admin**: currently `POST /assignments` is
   `authorize('mentor', 'admin')` already — so admin *can* create, the frontend just
   doesn't expose it. Reuse mentor's implicit permission; the missing piece is purely
   a "Create Assignment" form (title, description, course, batch, dueDate, maxScore).
3. Given the ambiguity, **ask the user which of these two admin actually wants**
   rather than guessing — this is exactly the kind of product decision that shouldn't
   be assumed silently.

---

## Priority 3 — Wire the search bar to real data
Currently `dashboard/layout.tsx`'s search input is decorative.
- **Endpoint**: `GET /api/v1/search?q=` — **admin and mentor only**
  (`authorize('admin', 'mentor')`). Students will 403 on this endpoint — the search
  box should either be hidden entirely for the student role, or degrade to a
  client-side no-op, but must not fire a doomed request (same class of bug as the
  Attendance role-gating fix in `BRAIN.md` 2026-08-06 — gate the *fetch*, not just
  what's rendered).
- Response shape: `{ results: [{ type, id, label, sub, page }] }` where `type` is one
  of `student`/`mentor`/`course`/`batch`/`placement` and `page` is the nav id to
  route to (e.g. `"students"`, `"courses"`).
- **Implementation approach**: debounce input (the legacy portal used a 220ms
  `setTimeout` debounce — reasonable default), fire the search on ≥2 characters,
  render a dropdown under the input with grouped/typed results, clicking a result
  navigates to `/dashboard/{page}` (optionally with a query param or client-side
  scroll-to-id if you want to highlight the specific record — not required for v1).
- **Done when**: typing "arjun" as admin returns the seeded student Arjun Reddy in a
  dropdown, clicking it navigates to Students.

## Priority 4 — Wire the notification bell to real data
- **Endpoints**: `GET /notifications` (list), `GET /notifications/unread-count`,
  `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`,
  `DELETE /notifications/:id`, `DELETE /notifications/clear` — all authenticated,
  no role restriction, scoped to the logged-in user server-side.
- **Implementation approach**: poll `unread-count` on an interval (or just on page
  navigation — a real-time WebSocket push is out of scope, matches the documented
  "no real-time chat on serverless" limitation already in `BRAIN.md`) and show a red
  dot on the bell icon when count > 0. Clicking the bell opens a dropdown/panel
  listing recent notifications with a "mark all read" action.
- **Done when**: the red dot appears when there's a real unread notification (you can
  manufacture one via the backend's `Notification.notify()` static helper in a quick
  script, or trigger a flow that creates one — e.g. assignment grading already calls
  `Notification.notify` per `assignmentController.reviewSubmission`), and clicking it
  marks it read and the dot disappears.

## Priority 5 — Add a resume field to Profile, unblock placement applications
Currently a student cannot apply to a placement drive because
`placementController.applyToDrive` requires `studentProfile.resume` to be set, and
the frontend `Profile` page (`dashboard/profile/page.tsx`) only exposes
firstName/lastName/phone.
- **Endpoint**: same `PATCH /users/:id` already used by Profile — the backend's
  `STUDENT_PROFILE_FIELDS` allowlist (`userController.js`) already includes
  `resume`, `degree`, `college`, `graduationYear`, `skills`, `linkedIn`, `github`,
  `portfolio`. The route accepts these nested under `studentProfile` in the request
  body — check the exact nesting the `pick()` helper expects before wiring this up.
- **Minimum viable**: add just a `resume` (url or text) field to the student's
  Profile view, gated on `user.role === 'student'` (mirroring how `AttendancePage`
  already branches).
- **Stretch**: expose the other `STUDENT_PROFILE_FIELDS` too (skills, LinkedIn,
  GitHub, portfolio) since they're already backend-supported and would round out the
  profile page meaningfully.
- **Done when**: a student without a resume can add one via Profile, then
  successfully apply to a placement drive without hitting the "add your resume"
  error — verify this exact flow end-to-end since it's the whole point.

## Priority 6 — Fix root `package.json` scripts
`dev`/`start`/`seed`/`portal` may still reference paths from before the reorg
(`placeonix-hub-backend`, `_serve.js`). Verify against the current `backend/` and
`frontend/` layout and fix, or just document that `cd backend && npm run dev` /
`cd frontend && npm run dev` is the reliable path and simplify the root scripts to
match. Low effort, low risk — good filler task between bigger items.

## Priority 7 — Backend gaps that block frontend work if picked up later
Not asked for yet, but worth knowing about before promising a feature that needs
them:
- No endpoint to reorder/manage Course modules from a generic admin UI beyond what
  `courseController`'s module/topic sub-routes already provide (`POST/PATCH/DELETE
  /courses/:id/modules[/:moduleId/topics/:topicId]`) — these exist but have no
  frontend at all. Only relevant if course-content authoring becomes a priority.
- No institute-wide `Settings` backend (branding, notification toggles, etc.) —
  current `Settings` page only does profile + password via existing user/auth
  endpoints, which is honest but limited. A real settings backend would need new
  models/routes — don't build a frontend for settings that don't exist server-side.
- Payments: `updatePayment` (admin editing a payment's status/notes) has no frontend
  yet — only `recordPayment` (create) and `refundPayment` are wired. Consider if
  admin needs to correct a payment's status/notes without a full refund.

---

## Longer-term / deferred (not technical blockers — need a business decision first)
Per `docs/PLATFORM_UPGRADE_PLAN.md` (path may have moved in the reorg — check
`prompts_and_plans/` if not found at that path):
- **Phase 4 — Finance/CRM depth**: Invoices/Transactions/Coupons, full CRM
  (Counselling/Admissions/FollowUps beyond the current simple `Lead` model). Gated on
  actually picking a payment gateway (Razorpay was the named candidate) — don't build
  speculative UI against a gateway that isn't chosen yet.
- **Phase 5 — Comms queues**: Email/SMS/WhatsApp queue collections. Pointless without
  real SMTP/SMS/WhatsApp provider keys, which aren't configured (see `BRAIN.md`
  "Known limitations").
- **Multi-branch / feature flags / analytics depth**: lowest priority, no evidence
  Placeonix operates more than one branch today.

---

## Suggested order if picking this up fresh next session
1. Quick wins to build momentum: **1.4 Add Company** (simplest form), **Priority 6**
   (package.json fix, 10 minutes).
2. **1.1 Create Batch** and **1.2 Create Course** — these unblock realistic demo-data
   growth for everything else (more batches/courses to enroll students into,
   generate sessions/assignments for, etc.).
3. **Priority 5 (resume field)** — small, and it fixes a genuinely broken user flow
   (placement applications are currently dead-ended for every seeded student).
4. **1.3 Issue Certificate** and **1.6 Schedule Mock Interview** — round out the
   remaining create forms.
5. **1.5 Edit Announcement**.
6. **Priority 2 (Admin Assignments)** — after checking with the user which variant
   they want.
7. **Priority 3 (search) and 4 (notifications)** — larger, more polish-oriented,
   reasonable to do last of the "real work" items.
