# Migration notes: Firebase/Firestore → Next.js/Prisma/PostgreSQL

## Old → New

| | OLD | NEW |
|---|---|---|
| Data | 1 Firestore doc `records/core` (+ a `media` collection) | Normalized PostgreSQL tables via Prisma |
| Auth | Firebase anonymous auth + client-side role check | Signed HttpOnly JWT session cookie (`lib/auth.ts`) + bcrypt password hashes |
| Authorization | UI-only (`if (user.role==="ADMIN")`) — documented in the old README as bypassable from devtools | Re-checked server-side in every API route (`lib/permissions.ts`), against DB state, not client-sent role |
| Hosting | Static files on any host | Next.js on Vercel |
| Realtime sync | Firestore `onSnapshot` | Not yet ported — see "Remaining work" |
| Photos/logo/signatures | Base64-ish docs in a `media` Firestore collection | `Media.url` references; point this at Vercel Blob/S3/Cloudinary at deploy time (`lib/media.ts` — not yet written, see below) |

## Why the schema looks the way it does

The original app stored everything as arrays/maps inside one JSON blob
(`state.scores`, `state.classSubjectStatus`, `state.classApproval`, etc. —
see `source/01-seed.js` and `source/02-state.js` in the original ZIP for the
exact shapes). `prisma/schema.prisma` normalizes each of those into a real
table with foreign keys, while preserving every field:

- **`classSubjectStatus[key]`** (a map keyed by `classArmId_subjectId_sessionId_termId`)
  → `SubjectResultStatus`, unique on those four columns.
- **`classApproval[key]`** (keyed by `classArmId_sessionId_termId`) →
  `ClassApproval`, same idea, plus real FKs to `User` for
  `reviewedBy`/`approvedBy`/`publishedBy`/`reopenedBy` instead of bare ids.
- **`student.enrollmentHistory[]`** → `StudentEnrollment`, a real table so
  history is queryable and — critically — **never overwritten** when a
  student is promoted (see `PATCH /api/students/[id]` — a "move" appends a
  new row and updates the student's current pointers, it never edits old rows).
- **Score blank/absent/excused/zero** → `Score.components` (JSON:
  `{ [componentId]: number | null }`, `null`/missing = genuinely blank, never
  coerced to 0) + `Score.attendanceState` (`ABSENT | EXCUSED`, which overrides
  the whole row) — this is a direct 1:1 port of `computeSubjectTotal()` from
  `source/04-engine.js`, now living in `lib/calculations.ts`. **Do not
  "simplify" this** — it's exactly the distinction section 14 of the brief
  asked to preserve.
- **Subjects/schemes/templates scoped to multiple sections** (`sectionIds: []`
  arrays in the original) → real join tables (`SubjectSection`,
  `AssessmentSchemeSection`, `GradingSchemeSection`, `ReportTemplateSection`,
  `CustomFieldSection`) instead of Postgres array columns, so they stay
  query-able and FK-constrained.

## Result status machine

Two separate states, matching the original exactly:

**Per subject/class/session/term** (`SubjectResultStatus.status`):
`PENDING → DRAFT → SUBMITTED → (RETURNED → SUBMITTED again) → FORM_APPROVED`

**Per class/session/term** (`ClassApproval.status`):
`IN_PROGRESS → FORM_APPROVED → ADMIN_REVIEW → APPROVED → PUBLISHED → LOCKED`
(with `reopenedBy`/`reopenedAt`/`reopenReason`/`previousStatus` recording any
reopen, same as the original `reopenClassApproval` in `source/12-approvals.js`).

`app/api/scores/route.ts` locks score entry once
`SubjectResultStatus.status` is `PUBLISHED` or `LOCKED` — matching the
original's `locked = ["PUBLISHED","LOCKED"].indexOf(currentStatus) > -1`
exactly. Submission, Form Teacher return/approve, and re-submission are all
allowed right up to that point.

## Permissions ported

`lib/permissions.ts` is a direct, server-enforced port of the role logic in
the original `source/03-auth.js`:

- `isWholeSchoolRole` — Super Admin/Admin/Principal/Academic Supervisor bypass
  most scoping checks, same as before.
- `canEnterScores(user, subjectId, classArmId, sessionId, termId)` — a
  Teacher must have an **active** `TeacherAssignment` row for that exact
  combination. This used to be a client-side `assertPermission()` call that
  a technical user could skip; it's now checked inside the API route itself.
- `isFormTeacherOf(user, classArmId, sessionId)` — same idea for
  `FormTeacherAssignment`.

Every new API route you add should call one of these (or add a new
`assert*` helper here) rather than trusting a role sent from the client.

## Remaining work (this migration is a vertical slice, not full parity yet)

Done since the first pass: Form Teacher subject approve/return
(`/api/approvals/subject`), Form Teacher class approval
(`/api/approvals/class`, `/form-review`), Admin/Principal publish — single,
selected, and "all eligible" (`/api/approvals/publish`, `/approvals`), and
reopen-with-reason (`/api/approvals/reopen`). Form Teacher comments now save
through `/api/comments`. The score-entry lock condition was corrected to
match the original exactly: subject teachers can keep editing/resubmitting
right up until a class is **Published/Locked** — submission and even Form
Teacher return/approve are not one-way doors before that point.

**Phase 3 (this pass) added:**

- **Full settings suite** (`/settings`): school branding + current
  session/term + ranking tie-method, structure (sections/departments/class
  arms), subjects (with section/department links), assessment schemes
  (configurable components + live weight-sums-to-100 check), grading schemes
  (configurable bands), comment templates, report templates (all 10 styles
  selectable, default-per-section), skill domains, user management
  (create/activate/deactivate/reset password), academic sessions/terms, and
  a JSON backup export + demo-data removal. All routes require
  `canChangeSettings`/`canManageUsers` server-side.
- **Teacher & Form Teacher assignment UI** (`/teachers`) plus a bulk
  endpoint (`/api/settings/bulk-teacher-assignment`) for assigning one
  teacher to many subject×class combinations at once.
- **Report cards** (`/reports`, `/reports/print`): all 10 named themes from
  the original (`components/ReportCard.tsx` + a `THEMES` lookup of
  colors/fonts/frame style per `ReportTemplate.style`), per-subject
  class-average/position (`computeSubjectClassResults` in `lib/overview.ts`,
  a direct port of the original's per-subject ranking), skills/behaviour
  grid, attendance, fees, signatures, watermark logo. Preview one student,
  print selected, or print a whole class (page-break between each,
  auto-triggers `window.print()`).
- **Photo/logo/signature/stamp upload** (`lib/media.ts`,
  `/api/media/upload`): wraps Vercel Blob (`@vercel/blob`), gated behind
  `BLOB_READ_WRITE_TOKEN` — returns a clear 501 telling you to configure it
  or swap in your own storage client if that env var isn't set. Wired into
  the student photo (`/students`) for now; logo/stamp/signature uploads have
  the API ready but no settings-tab file-input yet (see below).
- **Audit log dashboard** (`/audit`) — read-only, most-recent-first.
- **Skills/Behaviour ratings + attendance + fees entry**
  (`/form-review/[studentId]`, `/api/domain-scores`, `/api/attendance`),
  Form-Teacher-scoped like everything else in the review flow.

**Still open / needs a decision from you, not just more porting:**

1. **Logo/stamp/signature upload UI** — the API (`/api/media/upload`) and
   the DB wiring (`SchoolSetting.logoUrl`/`stampUrl`, `User.signatureUrl`)
   are both done; only the actual `<input type="file">` in the Settings →
   School tab and a Settings → Signatures tab are left. Same pattern as the
   student-photo uploader in `app/students/StudentsClient.tsx` — copy it.
2. **`CustomFieldDef`** (admin-defined extra student fields) has a schema
   and no UI yet — the original's use of this was fairly light (a handful
   of school-specific fields), so it's lower priority than everything above.
3. **Realtime cross-device updates**: the original's Firestore
   `onSnapshot`-driven "updated from another device" toast has no direct
   Postgres equivalent here. Cheapest option: polling (`useSWR`/interval
   refetch) on score-entry/approvals; true push would mean adding a small
   pub/sub layer (Postgres `LISTEN/NOTIFY`, or Pusher/Ably) — a real
   architectural addition, not a port, so flagging rather than guessing at
   what you want.
4. **Offline support**: `public/service-worker.js` only caches the app
   shell (see its top comment) — score entries made while offline are
   **not currently queued**. The original never silently loses an entry;
   before relying on this in a spotty-connectivity setting, add an
   IndexedDB-backed retry queue in `ScoreSheet.tsx`'s `saveRow()` (catch the
   fetch failure, queue it, flush on the `online` event).
5. **Report card visual fidelity**: the 10 themes are implemented as a real,
   distinct color/font/frame lookup (`THEMES` in `components/ReportCard.tsx`)
   producing genuinely different-looking cards, but they're a fresh
   Tailwind-based layout, not a pixel-for-pixel port of the original's
   `.rc-theme-*` CSS. Adjust `THEMES` / the component's JSX directly if you
   want a closer visual match to a specific one.

None of the above requires touching the Prisma schema or the auth/permission
layer — build directly on what's here.
