# Ladybird Whole-School System — Next.js / Prisma / Neon edition

This is the architecture migration of the original Firebase/Firestore
Ladybird app onto the same stack as ASSURAWY:

```
Next.js (App Router, TS) → Prisma → PostgreSQL (Neon) → GitHub → Vercel
```

See **MIGRATION.md** for what's been ported so far, what's left, and why
things were modeled the way they were. **Read that before continuing
development** — it's written for both you and future Claude sessions.

## 1. Local setup

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # fill in DATABASE_URL / DIRECT_URL / AUTH_SECRET
npx prisma migrate dev      # creates the schema in your database
npm run db:seed             # loads the same demo school as the original app
npm run dev
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 48
```

## 2. Demo logins (same as the original app)

Password for every account: `demo123`

| Username     | Role                 |
|--------------|----------------------|
| `superadmin` | Super Admin          |
| `admin`      | Admin                |
| `principal`  | Principal            |
| `supervisor` | Academic Supervisor  |
| `teachera`   | Teacher (English, JSS1A + JSS1B) |
| `teacherb`   | Teacher (Mathematics, JSS1A) |
| `teacherc`   | Teacher + Form Teacher of JSS1A |

## 3. Database: Neon

1. Create a project at neon.tech.
2. Copy the **pooled** connection string into `DATABASE_URL` and the
   **direct** connection string into `DIRECT_URL` (Neon's dashboard labels
   both — the pooled one has `-pooler` in the hostname).
3. `npx prisma migrate deploy` against it, then `npm run db:seed` once if you
   want the demo data.

## 4. Deploying (GitHub → Vercel)

```bash
git add .
git commit -m "Migrate Ladybird to Next.js Prisma PostgreSQL"
git push
```

In Vercel: import the repo, set the same environment variables as `.env`
(`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`), and
deploy. Vercel runs `npm install` (→ `prisma generate`) and `npm run build`
automatically. Run `npx prisma migrate deploy` against the Neon database
once (from your machine, or a one-off Vercel deploy hook) before the first
production deploy.

## 5. What's implemented

This covers the full workflow end to end: login → dashboard → students
(add/list/photo) → teacher & form-teacher assignment → score entry →
Form Teacher review/approve/return → Admin/Principal publish/reopen →
report cards (all 10 themes, preview/print/bulk-print) → settings (school
branding, structure, subjects, assessment/grading schemes, comment
templates, report templates, skill domains, users, sessions, JSON backup)
→ skills/attendance/fees entry → audit log.

See **MIGRATION.md** for what's a direct 1:1 port of the original app's
logic (calculations, permissions, status machine) versus what's new
scaffolding, and for the handful of items (realtime sync, offline queueing,
logo/signature upload UI, custom fields) that are genuinely open design
decisions rather than straightforward ports — read that section before
assuming something's missing by accident.
