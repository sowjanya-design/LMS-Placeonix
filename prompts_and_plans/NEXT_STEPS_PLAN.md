# Placeonix Hub — Completion Plan (Frontend + Backend)

> Goal: bring the Next.js frontend to full feature parity with the backend so every
> role can **create, read, update, and delete** every entity it owns, plus wire the
> two remaining stubbed UI controls (header search, notification bell) and the
> student resume field that currently hard-blocks placement applications.
>
> Grounded in a full read-only recon of `backend/src` and `frontend/src` (2026-08-07).
> This is the executable version of the "What's next" list in `BRAIN.md`.

## 0. Headline finding — the backend is already complete

Recon of every route file + controller + model confirms the API already exposes
**full CRUD for every entity the UI needs**:

| Entity | POST | PATCH | DELETE | Notes |
|---|---|---|---|---|
| courses, batches, companies, sessions, placements, alumni, mock-interviews | ✅ | ✅ `/:id` | ✅ `/:id` | |
| announcements | ✅ | ✅ `/:id` | ✅ `/:id` (admin only) | |
| resources | ✅ (multipart) | ✅ `/:id` | ✅ `/:id` | |
| leads | ✅ (public) | ✅ `/:id` | ✅ `/:id` | + `POST /:id/notes` |
| payments | `POST /` (record), `POST /:id/refund` | ✅ `/:id` | — | |
| certificates | `POST /issue`, `POST /:id/revoke` | — | — | revoke = POST, not DELETE |
| reviews | ✅ (student) | ✅ `/:id` | ✅ `/:id` | + `POST /:id/respond` |
| office-hours | ✅ (slot) | ❌ **missing** | ✅ `/:id` | mutate via `/:id/book`,`/:id/cancel` |
| users | ✅ (admin) | ✅ `/:id` | ✅ `/:id` | `updateUser` whitelists `studentProfile.resume` etc. |

**Resume is already fully supported server-side**: `User.studentProfile.resume`
exists, `PATCH /users/:id` accepts `{ studentProfile: { resume } }`, and
`placementController.applyToDrive` already gates on it. The frontend just never
exposed the field.

**⇒ No backend code changes are required to complete the website.** The single
missing verb (`PATCH /office-hours/:id`) is not needed — slots are create + delete +
book + cancel, which is a complete lifecycle. We will NOT build speculative backend
features (finance depth, comms queues, multi-branch) — those remain deferred per
`PLATFORM_UPGRADE_PLAN.md` pending real business need.

## 1. What's actually missing (frontend only)

Every nav item already renders a real page, and every list is real `GET` data. The
gap is **mutations**: create/edit forms barely exist. Today only Add-Student,
New-Announcement, assignment submit/grade, and a handful of status dropdowns are
real. Everything else is read + (sometimes) delete.

Two in-page placeholders remain: **admin `/assignments`** and **mentor/admin
`/attendance`**. Header **search** and **notification bell** are visual-only. The
student **Profile** has no resume field.

## 2. Shared frontend contract (build first, everyone consumes)

To keep ~17 pages consistent and let the work parallelize without divergent modals,
we introduce a small shared UI kit **before** the page work, extracted verbatim from
the existing `students/page.tsx` styling (brand tokens, gradient buttons):

- `frontend/src/components/ui/modal.tsx` — `<Modal title onClose>{body}</Modal>`
  (fixed overlay, click-outside close, white rounded card, `stopPropagation`).
- `frontend/src/components/ui/form.tsx` — `Field({label,children})`, `Input`,
  `Textarea`, `Select`, `PrimaryButton`, `SecondaryButton`, `DangerButton`,
  `ErrorText`. All use the exact existing brand classes.

Conventions every page follows (already the house style):
- `"use client"`, data via `@/lib/api` (`api.get/post/patch/delete`), `ApiError`.
- `useEffect` → `api.get` into state; optimistic update or refetch after a mutation.
- Role branching inline on `useAuth().user.role`.
- `confirm()` for deletes, inline `ErrorText` for form errors.
- **Do not edit `lib/types.ts`** except the Profile slice (owned by Phase A);
  define local payload types in-page to avoid write conflicts.
- Agents must **not** run build/lint/tests (validation is a single consolidated pass
  at the end).

## 3. Phase A — foundations (done inline, sequential prerequisite)

1. Create `components/ui/modal.tsx` + `components/ui/form.tsx` (the kit above).
2. `lib/types.ts`: extend `User.studentProfile` with `resume?, skills?, college?,
   degree?, graduationYear?, linkedIn?, github?, portfolio?`; add `bio?` to `User`.
3. `dashboard/layout.tsx`:
   - **Search** (admin/mentor only — `/search` is `authorize(admin,mentor)`): debounced
     input → `GET /search?q=`, dropdown of `{type,label,sub,page}` results, each row
     links to `/dashboard/{page}`. Hidden for students.
   - **Notification bell**: `GET /notifications/unread-count` for the badge; click opens
     a panel (`GET /notifications`), `PATCH /:id/read`, `PATCH /read-all`,
     `DELETE /:id`, `DELETE /clear`.
4. `dashboard/profile/page.tsx` + `dashboard/settings/page.tsx`: add resume link,
   skills, college/degree/gradYear, linkedIn/github/portfolio, bio to the student
   profile editor → `PATCH /users/:id` with `{ studentProfile: {...} , bio }`.

## 4. Phase B — per-entity CRUD (parallel fan-out, one page per agent)

Each row = one page file, one agent. Endpoints + required create fields are exact.

| # | Page | Role(s) | Add | Required create fields |
|---|---|---|---|---|
| 1 | courses | admin | create/edit/delete | `title, category, description, duration, fee.amount` |
| 2 | batches | admin | create/edit/delete (+enroll) | `name, code, course(id), mentor(id), startDate, endDate`; fetch course+mentor selects |
| 3 | sessions | admin,mentor | create/edit/delete (+start/complete) | `batch(id), title, startTime, endTime`; meetingLink optional |
| 4 | placements | admin | create/edit | `company, role, applicationDeadline, package.min, package.max` (LPA units) |
| 5 | companies | admin | create/edit | `name`; website optional |
| 6 | mentors | admin | create/edit | `firstName,lastName,email,password,role:mentor`; specialization/experience optional |
| 7 | students | admin | **edit** (create/delete exist) | patch `firstName,lastName,phone,status` |
| 8 | leads | admin | create/delete/notes | `firstName,lastName,email,phone` |
| 9 | payments | admin | record/edit/refund | `enrollmentId(id), amount>0, method(enum)` |
| 10 | certificates | admin | issue/revoke | issue: `enrollmentId(id), type`; revoke: `reason` |
| 11 | resources | mentor,admin | upload/create + edit | inspect `createdResource`: support link-type (`title,type,url`) via JSON or FormData if file required |
| 12 | reviews | student / mentor,admin | student create; mentor/admin respond; delete | `targetType(enum), target(id), rating 1-5`, comment |
| 13 | announcements | admin,mentor | **edit** (create/delete exist) | patch `title, body, type` |
| 14 | mock-interviews | admin,mentor | create/edit | `student(id), title, scheduledAt` |
| 15 | office-hours | mentor,admin | create-slot + delete | `startTime`; endTime optional |
| 16 | assignments | mentor,admin | create/edit/delete + **admin oversight** | `title, batch(id), dueDate`; replace admin placeholder with real list |
| 17 | attendance | mentor,admin | **batch attendance view** (replace placeholder) | `GET /attendance/batch/:id`; read + summary; edit optional |

Cross-cutting for every page: add loading/empty/error states where missing; keep the
existing list rendering; hide mutation controls the current role can't perform.

## 5. Verification (consolidated, after fan-out)

1. `cd frontend && npx tsc --noEmit` — fix all type errors.
2. `npm run build` (frontend) — must pass clean.
3. `cd backend && npm test` — 50 Jest tests still green (no backend change expected).
4. Start backend (:5000, Atlas via the non-SRV `MONGO_URI` workaround) + frontend
   (:3000). Browser smoke as admin: create → edit → delete one entity per page,
   confirm it round-trips (reload shows persisted state). Spot-check mentor + student.
5. Confirm search returns results and notification bell badge + panel work.
6. Confirm a student can add a resume link in Profile and then apply to a placement
   (the exact block `BRAIN.md` flagged).

## 6. Out of scope / deferred (explicit)

- Backend feature work — none needed.
- Razorpay / online payment gateway, SMTP/SMS/WhatsApp senders, real-time chat
  (no WebSocket on serverless), S3 file persistence — all gated on external
  credentials/decisions, unchanged.
- `PATCH /office-hours/:id` — unnecessary (create/delete/book/cancel is complete).
- Finance depth, full CRM, comms queues, multi-branch (Phase 4–7) — deferred pending
  business need.

## 7. Definition of done

Every nav item for every role supports the full set of operations the backend allows
for that role; no in-page "not migrated" placeholders remain; search + notifications
are live; a student can self-serve a resume and apply to a placement; frontend
`tsc`/`build` clean and backend tests green; a browser smoke test proves at least one
create→edit→delete round-trip per entity persists to Atlas.
