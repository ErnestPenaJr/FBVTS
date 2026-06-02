# Netlify Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate FBVTS from frontend-only/localStorage to a shared Netlify DB (Neon Postgres) backend with real email/password auth, a Netlify Functions API, and Drizzle ORM — while keeping `AppContext` as the single client store (hydrate-and-write-through).

**Architecture:** React SPA → Netlify Functions (v2 API, `Request`/`Response`, `config.path` routing) → Drizzle (`neon-http`) → Neon Postgres. Sessions are a signed JWT in an `httpOnly` cookie; roles are re-read from the DB every request and enforced server-side. The client calls `/api/*`; `AppContext` hydrates from `GET /api/state` on load and write-throughs each action.

**Tech Stack:** Vite + React 19 + TypeScript (existing), Netlify Functions v2, `@neondatabase/serverless`, `drizzle-orm` + `drizzle-kit`, `bcryptjs`, `jose` (JWT), Netlify CLI (`netlify dev`).

**Reference spec:** `docs/superpowers/specs/2026-06-02-netlify-backend-foundation-design.md`

---

## Verification convention (read first)

This repo has **no test runner**; per `CLAUDE.md` the gate is `npm run lint` (`tsc -b --noEmit`) plus manual QA. Each task therefore verifies via:
1. `npm run lint` — type-check must stay clean (this is the CI gate).
2. Where a runtime behavior exists, a manual `curl` against `netlify dev` (running at `http://localhost:8888`) or a browser check.
3. `git commit`.

There is **no** pytest/vitest in this plan; do not add one (out of scope).

## Scope note

The existing super-admin Admin page (`src/pages/Admin.tsx`) and its `adminCreateUser/adminUpdateUser/adminDeleteUser` actions already exist. This plan **ports them to the backend** so they keep working. New #2 work (promotion UX beyond the Admin page, impersonation / "view as role") and #3 (messaging) remain out of scope.

## File structure (created/modified)

**Created — backend:**
- `netlify/db/schema.ts` — Drizzle tables (single source of DB truth).
- `netlify/db/client.ts` — Neon connection + Drizzle instance for functions.
- `netlify/db/seed.ts` — idempotent seed (content + super-admin bootstrap).
- `netlify/db/migrations/*` — generated SQL migrations.
- `netlify/functions/_lib/http.ts` — JSON/error response + cookie helpers.
- `netlify/functions/_lib/auth.ts` — JWT sign/verify, bcrypt, `requireAuth`/role guards.
- `netlify/functions/_lib/serialize.ts` — DB-row → client-shape mappers.
- `netlify/functions/auth.ts` — register/login/logout/me.
- `netlify/functions/state.ts` — `GET /api/state` hydrate.
- `netlify/functions/roles.ts`, `campuses.ts`, `service-times.ts`, `events.ts`, `signups.ts`, `profile.ts`, `admin-users.ts` — resource endpoints.
- `drizzle.config.ts` — drizzle-kit config.
- `tsconfig.netlify.json` — type-checking for `netlify/**`.
- `.env.example` — documents required env vars.

**Created — client:**
- `src/lib/api.ts` — typed fetch wrappers for every endpoint.

**Modified:**
- `package.json` — deps + scripts (`dev`→`netlify dev`, `db:*`).
- `netlify.toml` — `NODE_VERSION` already 22; add functions dir; keep SPA fallback.
- `.gitignore` — `.env`, `.netlify`.
- `tsconfig.json` — reference `tsconfig.netlify.json`.
- `src/context/AppContext.tsx` — async hydrate-and-write-through (the big one).
- `src/main.tsx` / `src/App.tsx` — boot/loading + auth-gating.
- `src/pages/Login.tsx` — email+password login/register form.
- `CLAUDE.md` — new workflow/commands/env.

---

## Phase 0 — Tooling, schema, migrations, seed

### Task 1: Add dependencies, scripts, and config

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`, `tsconfig.netlify.json`, `.env.example`
- Modify: `.gitignore`, `tsconfig.json`, `netlify.toml`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless bcryptjs jose
npm install -D drizzle-kit @netlify/functions @types/bcryptjs tsx netlify-cli
```

- [ ] **Step 2: Update `package.json` scripts**

Replace the `scripts` block with:
```json
"scripts": {
  "dev": "netlify dev",
  "dev:vite": "vite",
  "build": "tsc -b && vite build",
  "lint": "tsc -b --noEmit",
  "preview": "vite preview",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "tsx netlify/db/seed.ts"
}
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './netlify/db/schema.ts',
  out: './netlify/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 4: Create `tsconfig.netlify.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["netlify/**/*.ts", "drizzle.config.ts"]
}
```

- [ ] **Step 5: Reference it from the root `tsconfig.json`**

Add `{ "path": "./tsconfig.netlify.json" }` to the `references` array in `tsconfig.json` so `tsc -b` type-checks the backend too. (If `tsconfig.json` has no `references` array yet, add `"references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }, { "path": "./tsconfig.netlify.json" }]` matching the existing referenced configs — inspect the file first and append, do not remove existing references.)

- [ ] **Step 6: Create `.env.example`**

```bash
# Neon Postgres connection string (from Netlify DB / Neon dashboard)
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
# Secret for signing session JWTs (generate: openssl rand -base64 32)
JWT_SECRET=
# Initial password for the bootstrapped super-admin (epena@fallbrookchurch.org).
# If unset, the super-admin account is NOT created by the seed.
SUPER_ADMIN_INITIAL_PASSWORD=
```

- [ ] **Step 7: Update `.gitignore`**

Append:
```
.env
.netlify/
```

- [ ] **Step 8: Ensure `netlify.toml` declares the functions directory**

In `netlify.toml`, under `[build]` (alongside the existing `command`/`publish`), add:
```toml
  functions = "netlify/functions"
```
Leave the existing `[build.environment] NODE_VERSION = "22"` and the SPA `[[redirects]]` rule as-is. (No `/api` redirect is needed — functions declare their own paths via `config.path`.)

- [ ] **Step 9: Type-check**

Run: `npm run lint`
Expected: PASS (no `netlify/**` files yet; config compiles). If `tsx`/types resolve issues appear, confirm `@types/node` is present (it ships with `netlify-cli`'s peer deps; if missing run `npm i -D @types/node`).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts tsconfig.netlify.json tsconfig.json .env.example .gitignore netlify.toml
git commit -m "chore: add backend deps, drizzle/netlify config, env scaffolding"
```

---

### Task 2: Drizzle schema

**Files:**
- Create: `netlify/db/schema.ts`

- [ ] **Step 1: Write the schema**

```ts
import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    photoUrl: text('photo_url'),
    bio: text('bio'),
    role: text('role').notNull().default('volunteer'),
    passwordHash: text('password_hash').notNull(),
    fontScale: text('font_scale').notNull().default('normal'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // case-insensitive uniqueness: emails are always stored lower-cased
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
  }),
)

export const volunteerRoles = pgTable('volunteer_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  defaultNeeded: integer('default_needed'),
  category: text('category'),
})

export const campuses = pgTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
})

export const serviceTimes = pgTable('service_times', {
  id: text('id').primaryKey(),
  campusId: text('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'cascade' }),
  dayOfWeek: text('day_of_week').notNull(),
  time: text('time').notNull(),
})

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  campusId: text('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'cascade' }),
  managerId: text('manager_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  date: date('date').notNull(),
  time: text('time').notNull(),
})

export const positions = pgTable(
  'positions',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => volunteerRoles.id, { onDelete: 'restrict' }),
    needed: integer('needed').notNull(),
    parentKind: text('parent_kind').notNull(), // 'service' | 'event'
    parentId: text('parent_id').notNull(),
  },
  (t) => ({
    parentIdx: index('positions_parent_idx').on(t.parentKind, t.parentId),
  }),
)

export const signups = pgTable(
  'signups',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'service' | 'event'
    refId: text('ref_id').notNull(),
    positionId: text('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    uniqueSignup: uniqueIndex('signups_unique').on(
      t.userId,
      t.kind,
      t.refId,
      t.positionId,
    ),
  }),
)
```

> Note: `positions.parentId` is intentionally a plain `text` (polymorphic to service_times OR events), so it has no FK; orphan cleanup happens in the delete-service/delete-event endpoints (Tasks 10–11), mirroring today's `AppContext` logic. `signups.refId` is likewise polymorphic.

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add netlify/db/schema.ts
git commit -m "feat(db): add drizzle schema for users, catalog, services, events, positions, signups"
```

---

### Task 3: Neon client + initial migration

**Files:**
- Create: `netlify/db/client.ts`
- Create: `netlify/db/migrations/*` (generated)

- [ ] **Step 1: Write the client**

```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
export { schema }
```

- [ ] **Step 2: Provision the database & set env locally**

Provision a Netlify DB (Neon) for the site (Netlify dashboard → Project → Add database → Netlify DB), or create a Neon project directly. Copy its connection string. Create a local `.env` (gitignored) from `.env.example` and fill in `DATABASE_URL` and a generated `JWT_SECRET` (`openssl rand -base64 32`) and a `SUPER_ADMIN_INITIAL_PASSWORD`.

- [ ] **Step 3: Generate the initial migration**

Run: `npm run db:generate`
Expected: a new folder/files under `netlify/db/migrations/` containing the `CREATE TABLE` SQL for all tables. Open the generated SQL and confirm it includes `users`, `volunteer_roles`, `campuses`, `service_times`, `events`, `positions`, `signups`, the unique indexes, and the `restrict`/`cascade` FKs.

- [ ] **Step 4: Apply the migration**

Run: `npm run db:migrate`
Expected: "migrations applied" with no errors. (Verify in the Neon SQL console that the tables exist.)

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/db/client.ts netlify/db/migrations
git commit -m "feat(db): add neon client and initial migration"
```

---

### Task 4: Seed script (content + super-admin bootstrap)

**Files:**
- Create: `netlify/db/seed.ts`

- [ ] **Step 1: Write the seed**

Seeds the existing demo *content* (no demo users/signups, per spec decision A) and bootstraps the super-admin from `SUPER_ADMIN_INITIAL_PASSWORD`. Idempotent via `onConflictDoUpdate`/`onConflictDoNothing`.

```ts
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db, schema } from './client'
import {
  seedCampuses,
  seedServiceTimes,
  seedEvents,
  seedVolunteerRoles,
} from '../../src/data/mockData'
import { SUPER_ADMIN_EMAIL } from '../../src/types'

async function main() {
  // Volunteer role catalog
  for (const r of seedVolunteerRoles) {
    await db
      .insert(schema.volunteerRoles)
      .values({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        defaultNeeded: r.defaultNeeded ?? null,
        category: r.category ?? null,
      })
      .onConflictDoNothing()
  }

  // Campuses
  for (const c of seedCampuses) {
    await db
      .insert(schema.campuses)
      .values({ id: c.id, name: c.name, address: c.address })
      .onConflictDoNothing()
  }

  // Service times + their positions (positions are polymorphic: parentKind 'service')
  for (const st of seedServiceTimes) {
    await db
      .insert(schema.serviceTimes)
      .values({
        id: st.id,
        campusId: st.campusId,
        dayOfWeek: st.dayOfWeek,
        time: st.time,
      })
      .onConflictDoNothing()
    for (const p of st.positions) {
      await db
        .insert(schema.positions)
        .values({
          id: `${st.id}:${p.id}`, // namespace per-parent slot ids to keep them globally unique
          roleId: p.roleId,
          needed: p.needed,
          parentKind: 'service',
          parentId: st.id,
        })
        .onConflictDoNothing()
    }
  }

  // Events + positions (parentKind 'event'); managerId left null (no demo users seeded)
  for (const e of seedEvents) {
    await db
      .insert(schema.events)
      .values({
        id: e.id,
        name: e.name,
        campusId: e.campusId,
        managerId: null,
        date: e.date,
        time: e.time,
      })
      .onConflictDoNothing()
    for (const p of e.positions) {
      await db
        .insert(schema.positions)
        .values({
          id: `${e.id}:${p.id}`,
          roleId: p.roleId,
          needed: p.needed,
          parentKind: 'event',
          parentId: e.id,
        })
        .onConflictDoNothing()
    }
  }

  // Super-admin bootstrap (only if a password is provided)
  const pw = process.env.SUPER_ADMIN_INITIAL_PASSWORD
  if (pw) {
    const hash = await bcrypt.hash(pw, 10)
    await db
      .insert(schema.users)
      .values({
        id: 'u-superadmin',
        name: 'Ernest Peña',
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        phone: '555-0100',
        bio: 'Developer / super admin.',
        role: 'manager',
        passwordHash: hash,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: { passwordHash: hash, role: 'manager' },
      })
    console.log('Super-admin bootstrapped:', SUPER_ADMIN_EMAIL)
  } else {
    console.log('SUPER_ADMIN_INITIAL_PASSWORD unset — skipping super-admin bootstrap')
  }

  console.log('Seed complete.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
```

> **Important seed/id decision:** the demo data reuses per-parent position ids like `p1` across multiple service times. Positions are now a global table with a PK, so the seed namespaces them as `${parentId}:${p.id}`. **The serialize layer (Task 5b) and the create/update endpoints must use this same `${parentId}:${slotId}` scheme** so `Signup.positionId` round-trips. Seed signups are intentionally not created (decision A).

- [ ] **Step 2: Run the seed**

Run: `npm run db:seed`
Expected: logs "Seed complete." and the super-admin line. Re-run it — it must succeed again with no duplicate-key errors (idempotent).

- [ ] **Step 3: Verify in DB**

In the Neon SQL console: `select count(*) from volunteer_roles;` → 10; `select count(*) from positions;` → 13 (8 service + 5 event); `select email, role from users;` → the super-admin row.

- [ ] **Step 4: Type-check & commit**

```bash
npm run lint
git add netlify/db/seed.ts
git commit -m "feat(db): add idempotent seed for demo content + super-admin bootstrap"
```

---

## Phase 1 — Backend lib + auth + hydrate

### Task 5a: HTTP + cookie helpers

**Files:**
- Create: `netlify/functions/_lib/http.ts`

- [ ] **Step 1: Write the helpers**

```ts
export const COOKIE_NAME = 'fbvts_session'

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status)
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export function sessionCookie(token: string): string {
  // 30 days
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
```

> Note: `Secure` cookies are sent over `localhost` by `netlify dev` (treated as a secure context), so local auth works.

- [ ] **Step 2: Type-check & commit**

```bash
npm run lint
git add netlify/functions/_lib/http.ts
git commit -m "feat(api): add http/cookie helpers"
```

---

### Task 5b: Serialize helpers (DB rows → client shapes)

**Files:**
- Create: `netlify/functions/_lib/serialize.ts`

- [ ] **Step 1: Write the mappers**

These convert DB rows into the exact shapes `src/types.ts` defines, including assembling polymorphic `positions` onto their parent and stripping `passwordHash`.

```ts
import type {
  AppEvent,
  Campus,
  Position,
  ServiceTime,
  Signup,
  User,
  VolunteerRole,
} from '../../../src/types'

type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  photoUrl: string | null
  bio: string | null
  role: string
  fontScale: string
}

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? undefined,
    photoUrl: r.photoUrl ?? undefined,
    bio: r.bio ?? undefined,
    role: r.role as User['role'],
  }
}

export function toRole(r: {
  id: string
  name: string
  description: string | null
  defaultNeeded: number | null
  category: string | null
}): VolunteerRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    defaultNeeded: r.defaultNeeded ?? undefined,
    category: r.category ?? undefined,
  }
}

export function toCampus(r: { id: string; name: string; address: string }): Campus {
  return { id: r.id, name: r.name, address: r.address }
}

type PositionRow = {
  id: string
  roleId: string
  needed: number
  parentKind: string
  parentId: string
}

// The client Position id is the global positions.id. Capacity counting keys on it.
export function toPosition(r: PositionRow): Position {
  return { id: r.id, roleId: r.roleId, needed: r.needed }
}

export function assembleServiceTimes(
  rows: { id: string; campusId: string; dayOfWeek: string; time: string }[],
  positions: PositionRow[],
): ServiceTime[] {
  return rows.map((st) => ({
    id: st.id,
    campusId: st.campusId,
    dayOfWeek: st.dayOfWeek,
    time: st.time,
    positions: positions
      .filter((p) => p.parentKind === 'service' && p.parentId === st.id)
      .map(toPosition),
  }))
}

export function assembleEvents(
  rows: {
    id: string
    name: string
    campusId: string
    managerId: string | null
    date: string
    time: string
  }[],
  positions: PositionRow[],
): AppEvent[] {
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    campusId: e.campusId,
    managerId: e.managerId ?? '',
    date: e.date,
    time: e.time,
    positions: positions
      .filter((p) => p.parentKind === 'event' && p.parentId === e.id)
      .map(toPosition),
  }))
}

export function toSignup(r: {
  id: string
  userId: string
  kind: string
  refId: string
  positionId: string
}): Signup {
  return {
    id: r.id,
    userId: r.userId,
    kind: r.kind as Signup['kind'],
    refId: r.refId,
    positionId: r.positionId,
  }
}
```

> **Key invariant:** the client `Position.id` equals the global `positions.id` (e.g. `s-dt-sun9:p1`). `Signup.positionId` references that same value end-to-end, so `positionFilled` (which counts signups by `positionId`) works unchanged on the client.

- [ ] **Step 2: Type-check & commit**

```bash
npm run lint
git add netlify/functions/_lib/serialize.ts
git commit -m "feat(api): add row->client serialize helpers"
```

---

### Task 5c: Auth lib (JWT, bcrypt, guards)

**Files:**
- Create: `netlify/functions/_lib/auth.ts`

- [ ] **Step 1: Write the auth lib**

```ts
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/client'
import { readCookie, COOKIE_NAME } from './http'
import { SUPER_ADMIN_EMAIL } from '../../../src/types'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return typeof payload.userId === 'string' ? payload.userId : null
  } catch {
    return null
  }
}

export type AuthUser = typeof schema.users.$inferSelect

/** Loads the authenticated user from the session cookie, fresh from the DB. */
export async function getSessionUser(req: Request): Promise<AuthUser | null> {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null
  const userId = await verifySession(token)
  if (!userId) return null
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId))
  return rows[0] ?? null
}

export function isSuperAdmin(u: AuthUser): boolean {
  return u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}
export function isManager(u: AuthUser): boolean {
  return u.role === 'manager' || isSuperAdmin(u)
}
export function isEventManager(u: AuthUser): boolean {
  return u.role === 'event_manager' || isManager(u)
}

/** Thrown to short-circuit a handler with an HTTP status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const u = await getSessionUser(req)
  if (!u) throw new HttpError(401, 'Not authenticated')
  return u
}
export async function requireManager(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isManager(u)) throw new HttpError(403, 'Manager access required')
  return u
}
export async function requireEventManager(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isEventManager(u)) throw new HttpError(403, 'Event manager access required')
  return u
}
export async function requireSuperAdmin(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isSuperAdmin(u)) throw new HttpError(403, 'Super admin access required')
  return u
}
```

- [ ] **Step 2: Add a shared `withErrors` wrapper to `_lib/http.ts`**

Append to `netlify/functions/_lib/http.ts`:
```ts
import { HttpError } from './auth'

export async function withErrors(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status)
    console.error(e)
    return error('Internal error', 500)
  }
}
```

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/_lib/auth.ts netlify/functions/_lib/http.ts
git commit -m "feat(api): add JWT/bcrypt auth lib and role guards"
```

---

### Task 6: Auth endpoints (register/login/logout/me)

**Files:**
- Create: `netlify/functions/auth.ts`

- [ ] **Step 1: Write the function**

Single function handling four subpaths via `config.path`.

```ts
import type { Config } from '@netlify/functions'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors, sessionCookie, clearCookie } from './_lib/http'
import { signSession, getSessionUser } from './_lib/auth'
import { toUser } from './_lib/serialize'
import { SUPER_ADMIN_EMAIL } from '../../src/types'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export default async (req: Request) =>
  withErrors(async () => {
    const url = new URL(req.url)
    const path = url.pathname

    if (path.endsWith('/register') && req.method === 'POST') {
      const { name, email, password } = await req.json()
      const cleanName = String(name ?? '').trim()
      const lower = String(email ?? '').trim().toLowerCase()
      const pw = String(password ?? '')
      if (!cleanName || !lower || pw.length < 8)
        return error('Name, email, and an 8+ character password are required', 400)
      if (lower === SUPER_ADMIN_EMAIL.toLowerCase())
        return error('That email is reserved', 400)
      const existing = await db.select().from(schema.users).where(eq(schema.users.email, lower))
      if (existing.length) return error('That email is already registered', 409)
      const hash = await bcrypt.hash(pw, 10)
      const id = uid('u')
      await db.insert(schema.users).values({
        id,
        name: cleanName,
        email: lower,
        role: 'volunteer', // never self-assign elevated roles
        passwordHash: hash,
      })
      const token = await signSession(id)
      const row = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0]
      return json({ user: toUser(row) }, 200, { 'set-cookie': sessionCookie(token) })
    }

    if (path.endsWith('/login') && req.method === 'POST') {
      const { email, password } = await req.json()
      const lower = String(email ?? '').trim().toLowerCase()
      const pw = String(password ?? '')
      const rows = await db.select().from(schema.users).where(eq(schema.users.email, lower))
      const row = rows[0]
      const ok = row ? await bcrypt.compare(pw, row.passwordHash) : false
      if (!row || !ok) return error('Invalid email or password', 401)
      const token = await signSession(row.id)
      return json({ user: toUser(row) }, 200, { 'set-cookie': sessionCookie(token) })
    }

    if (path.endsWith('/logout') && req.method === 'POST') {
      return json({ ok: true }, 200, { 'set-cookie': clearCookie() })
    }

    if (path.endsWith('/me') && req.method === 'GET') {
      const u = await getSessionUser(req)
      if (!u) return error('Not authenticated', 401)
      return json({ user: toUser(u) })
    }

    return error('Not found', 404)
  })

export const config: Config = {
  path: ['/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/auth/me'],
}
```

- [ ] **Step 2: Run `netlify dev` and verify register/login**

Run (in one terminal): `npm run dev`
Then:
```bash
curl -i -X POST localhost:8888/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Test Vol","email":"vol@test.com","password":"password123"}'
```
Expected: `200`, a `set-cookie: fbvts_session=...` header, body `{"user":{...,"role":"volunteer"}}`.
```bash
curl -i -X POST localhost:8888/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"vol@test.com","password":"wrong"}'
```
Expected: `401 {"error":"Invalid email or password"}`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/auth.ts
git commit -m "feat(api): add register/login/logout/me endpoints"
```

---

### Task 7: `GET /api/state` hydrate endpoint

**Files:**
- Create: `netlify/functions/state.ts`

- [ ] **Step 1: Write the function**

```ts
import type { Config } from '@netlify/functions'
import { db, schema } from '../db/client'
import { json, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import {
  toUser,
  toRole,
  toCampus,
  toSignup,
  assembleServiceTimes,
  assembleEvents,
} from './_lib/serialize'

export default async (req: Request) =>
  withErrors(async () => {
    const me = await requireAuth(req)
    const [userRows, roleRows, campusRows, stRows, eventRows, posRows, signupRows] =
      await Promise.all([
        db.select().from(schema.users),
        db.select().from(schema.volunteerRoles),
        db.select().from(schema.campuses),
        db.select().from(schema.serviceTimes),
        db.select().from(schema.events),
        db.select().from(schema.positions),
        db.select().from(schema.signups),
      ])

    return json({
      currentUserId: me.id,
      users: userRows.map(toUser), // safe fields only (no passwordHash)
      volunteerRoles: roleRows.map(toRole),
      campuses: campusRows.map(toCampus),
      serviceTimes: assembleServiceTimes(stRows, posRows),
      events: assembleEvents(eventRows, posRows),
      signups: signupRows.map(toSignup),
      settings: { fontScale: me.fontScale },
    })
  })

export const config: Config = { path: '/api/state' }
```

- [ ] **Step 2: Verify (using the cookie from Task 6 login)**

```bash
# log in and capture the cookie jar
curl -s -c /tmp/fb.cookies -X POST localhost:8888/api/auth/login \
  -H 'content-type: application/json' -d '{"email":"vol@test.com","password":"password123"}' >/dev/null
curl -s -b /tmp/fb.cookies localhost:8888/api/state | head -c 400
```
Expected: JSON with `volunteerRoles` (10), `campuses` (2), `serviceTimes` (3, each with `positions`), `events` (2), and `currentUserId`. Without the cookie, expect `401`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/state.ts
git commit -m "feat(api): add /api/state hydrate endpoint"
```

---

## Phase 2 — Domain endpoints

> **Pattern for all resource endpoints:** Netlify v2 function, `withErrors` wrapper, role guard at top, method switch, returns the created/updated row (client shape) or `{ ok: true }` for deletes. The client `Position` slot ids inside service/event writes are namespaced `${parentId}:${slotId}` to match the global `positions.id` scheme from the seed.

### Task 8: Roles endpoints

**Files:**
- Create: `netlify/functions/roles.ts`

- [ ] **Step 1: Write the function**

```ts
import type { Config } from '@netlify/functions'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireManager } from './_lib/auth'
import { toRole } from './_lib/serialize'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    await requireManager(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const name = String(b.name ?? '').trim()
      if (!name) return error('Name is required', 400)
      const row = {
        id: uid('r'),
        name,
        description: b.description?.trim() || null,
        defaultNeeded: typeof b.defaultNeeded === 'number' ? b.defaultNeeded : null,
        category: b.category?.trim() || null,
      }
      await db.insert(schema.volunteerRoles).values(row)
      return json({ role: toRole(row) })
    }

    if (req.method === 'PATCH' && id) {
      const b = await req.json()
      const name = String(b.name ?? '').trim()
      if (!name) return error('Name is required', 400)
      await db
        .update(schema.volunteerRoles)
        .set({
          name,
          description: b.description?.trim() || null,
          defaultNeeded: typeof b.defaultNeeded === 'number' ? b.defaultNeeded : null,
          category: b.category?.trim() || null,
        })
        .where(eq(schema.volunteerRoles.id, id))
      const row = (
        await db.select().from(schema.volunteerRoles).where(eq(schema.volunteerRoles.id, id))
      )[0]
      if (!row) return error('Role not found', 404)
      return json({ role: toRole(row) })
    }

    if (req.method === 'DELETE' && id) {
      // RESTRICT FK would throw; pre-check to return a clean 409
      const inUse = await db
        .select({ id: schema.positions.id })
        .from(schema.positions)
        .where(eq(schema.positions.roleId, id))
      if (inUse.length) return error('Role is in use and cannot be deleted', 409)
      await db.delete(schema.volunteerRoles).where(eq(schema.volunteerRoles.id, id))
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/roles', '/api/roles/:id'] }
```

- [ ] **Step 2: Verify (need a manager session — log in as super-admin)**

```bash
curl -s -c /tmp/admin.cookies -X POST localhost:8888/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"epena@fallbrookchurch.org","password":"<SUPER_ADMIN_INITIAL_PASSWORD>"}' >/dev/null
curl -s -b /tmp/admin.cookies -X POST localhost:8888/api/roles \
  -H 'content-type: application/json' -d '{"name":"Ushers","defaultNeeded":3}'
# A volunteer session should be rejected:
curl -s -b /tmp/fb.cookies -X POST localhost:8888/api/roles \
  -H 'content-type: application/json' -d '{"name":"Hacker"}' -o /dev/null -w '%{http_code}\n'
```
Expected: first returns `{"role":{...}}`; the volunteer attempt prints `403`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/roles.ts
git commit -m "feat(api): add volunteer role CRUD endpoints"
```

---

### Task 9: Campuses endpoints

**Files:**
- Create: `netlify/functions/campuses.ts`

- [ ] **Step 1: Write the function**

```ts
import type { Config } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireManager } from './_lib/auth'
import { toCampus } from './_lib/serialize'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    await requireManager(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const name = String(b.name ?? '').trim()
      const address = String(b.address ?? '').trim()
      if (!name || !address) return error('Name and address are required', 400)
      const row = { id: uid('c'), name, address }
      await db.insert(schema.campuses).values(row)
      return json({ campus: toCampus(row) })
    }

    if (req.method === 'PATCH' && id) {
      const b = await req.json()
      const name = String(b.name ?? '').trim()
      const address = String(b.address ?? '').trim()
      if (!name || !address) return error('Name and address are required', 400)
      await db.update(schema.campuses).set({ name, address }).where(eq(schema.campuses.id, id))
      const row = (await db.select().from(schema.campuses).where(eq(schema.campuses.id, id)))[0]
      if (!row) return error('Campus not found', 404)
      return json({ campus: toCampus(row) })
    }

    if (req.method === 'DELETE' && id) {
      // FK cascade removes service_times & events; their positions and signups
      // are polymorphic (no FK), so clean them up explicitly first.
      const sts = await db
        .select({ id: schema.serviceTimes.id })
        .from(schema.serviceTimes)
        .where(eq(schema.serviceTimes.campusId, id))
      const evs = await db
        .select({ id: schema.events.id })
        .from(schema.events)
        .where(eq(schema.events.campusId, id))
      const parentIds = [...sts.map((s) => s.id), ...evs.map((e) => e.id)]
      for (const pid of parentIds) {
        // delete signups referencing this parent, then its positions
        await db.delete(schema.signups).where(eq(schema.signups.refId, pid))
        await db.delete(schema.positions).where(eq(schema.positions.parentId, pid))
      }
      await db.delete(schema.campuses).where(eq(schema.campuses.id, id)) // cascades st/events
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/campuses', '/api/campuses/:id'] }
```

- [ ] **Step 2: Verify**

With the manager cookie: `POST /api/campuses` with `{"name":"East","address":"1 East"}` → returns campus; `DELETE /api/campuses/<id>` → `{ok:true}`. Volunteer cookie → `403`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/campuses.ts
git commit -m "feat(api): add campus CRUD endpoints with cascade cleanup"
```

---

### Task 10: Service-times endpoints

**Files:**
- Create: `netlify/functions/service-times.ts`

- [ ] **Step 1: Write the function**

Writes the parent row + replaces its positions; on update, prunes signups whose `positionId` no longer exists (mirrors current `updateServiceTime`).

```ts
import type { Config } from '@netlify/functions'
import { eq, and, inArray, notInArray } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireManager } from './_lib/auth'
import { assembleServiceTimes } from './_lib/serialize'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

type InPosition = { id?: string; roleId: string; needed: number }

// Build a global position id from the parent + a client slot id.
const slotId = (parentId: string, slot: string) =>
  slot.startsWith(`${parentId}:`) ? slot : `${parentId}:${slot}`

async function loadOne(id: string) {
  const st = (await db.select().from(schema.serviceTimes).where(eq(schema.serviceTimes.id, id)))[0]
  if (!st) return null
  const pos = await db
    .select()
    .from(schema.positions)
    .where(and(eq(schema.positions.parentKind, 'service'), eq(schema.positions.parentId, id)))
  return assembleServiceTimes([st], pos)[0]
}

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    await requireManager(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const stId = uid('s')
      await db.insert(schema.serviceTimes).values({
        id: stId,
        campusId: String(b.campusId),
        dayOfWeek: String(b.dayOfWeek),
        time: String(b.time),
      })
      for (const p of (b.positions ?? []) as InPosition[]) {
        await db.insert(schema.positions).values({
          id: p.id ? slotId(stId, p.id) : uid('p'),
          roleId: p.roleId,
          needed: p.needed,
          parentKind: 'service',
          parentId: stId,
        })
      }
      return json({ serviceTime: await loadOne(stId) })
    }

    if (req.method === 'PATCH' && id) {
      const b = await req.json()
      await db
        .update(schema.serviceTimes)
        .set({
          campusId: String(b.campusId),
          dayOfWeek: String(b.dayOfWeek),
          time: String(b.time),
        })
        .where(eq(schema.serviceTimes.id, id))
      // Replace positions: upsert incoming, delete removed, prune orphan signups.
      const incoming = ((b.positions ?? []) as InPosition[]).map((p) => ({
        id: p.id ? slotId(id, p.id) : uid('p'),
        roleId: p.roleId,
        needed: p.needed,
      }))
      const keepIds = incoming.map((p) => p.id)
      // delete positions not kept (and their signups)
      const existing = await db
        .select({ id: schema.positions.id })
        .from(schema.positions)
        .where(and(eq(schema.positions.parentKind, 'service'), eq(schema.positions.parentId, id)))
      const removed = existing.map((e) => e.id).filter((x) => !keepIds.includes(x))
      if (removed.length) {
        await db.delete(schema.signups).where(inArray(schema.signups.positionId, removed))
        await db.delete(schema.positions).where(inArray(schema.positions.id, removed))
      }
      for (const p of incoming) {
        await db
          .insert(schema.positions)
          .values({ ...p, parentKind: 'service', parentId: id })
          .onConflictDoUpdate({
            target: schema.positions.id,
            set: { roleId: p.roleId, needed: p.needed },
          })
      }
      const out = await loadOne(id)
      if (!out) return error('Service time not found', 404)
      return json({ serviceTime: out })
    }

    if (req.method === 'DELETE' && id) {
      await db.delete(schema.signups).where(eq(schema.signups.refId, id))
      await db.delete(schema.positions).where(eq(schema.positions.parentId, id))
      await db.delete(schema.serviceTimes).where(eq(schema.serviceTimes.id, id))
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = {
  path: ['/api/service-times', '/api/service-times/:id'],
}
```

- [ ] **Step 2: Verify**

Manager cookie: `POST /api/service-times` with `{"campusId":"c-downtown","dayOfWeek":"Sunday","time":"5:00 PM","positions":[{"id":"p1","roleId":"r-greeter","needed":2}]}` → returns a `serviceTime` with one position whose id is `<stId>:p1`. `DELETE` it → `{ok:true}`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/service-times.ts
git commit -m "feat(api): add service-time CRUD with position replace + signup pruning"
```

---

### Task 11: Events endpoints

**Files:**
- Create: `netlify/functions/events.ts`

- [ ] **Step 1: Write the function**

Same position-replace pattern as service-times, but gated by `requireEventManager`, `parentKind: 'event'`, and `managerId` set server-side from the session on create.

```ts
import type { Config } from '@netlify/functions'
import { eq, and, inArray } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireEventManager } from './_lib/auth'
import { assembleEvents } from './_lib/serialize'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

type InPosition = { id?: string; roleId: string; needed: number }
const slotId = (parentId: string, slot: string) =>
  slot.startsWith(`${parentId}:`) ? slot : `${parentId}:${slot}`

async function loadOne(id: string) {
  const e = (await db.select().from(schema.events).where(eq(schema.events.id, id)))[0]
  if (!e) return null
  const pos = await db
    .select()
    .from(schema.positions)
    .where(and(eq(schema.positions.parentKind, 'event'), eq(schema.positions.parentId, id)))
  return assembleEvents([e], pos)[0]
}

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    const me = await requireEventManager(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const eId = uid('e')
      await db.insert(schema.events).values({
        id: eId,
        name: String(b.name),
        campusId: String(b.campusId),
        managerId: me.id, // server-set, never trusted from client
        date: String(b.date),
        time: String(b.time),
      })
      for (const p of (b.positions ?? []) as InPosition[]) {
        await db.insert(schema.positions).values({
          id: p.id ? slotId(eId, p.id) : uid('p'),
          roleId: p.roleId,
          needed: p.needed,
          parentKind: 'event',
          parentId: eId,
        })
      }
      return json({ event: await loadOne(eId) })
    }

    if (req.method === 'PATCH' && id) {
      const b = await req.json()
      await db
        .update(schema.events)
        .set({
          name: String(b.name),
          campusId: String(b.campusId),
          date: String(b.date),
          time: String(b.time),
        })
        .where(eq(schema.events.id, id))
      const incoming = ((b.positions ?? []) as InPosition[]).map((p) => ({
        id: p.id ? slotId(id, p.id) : uid('p'),
        roleId: p.roleId,
        needed: p.needed,
      }))
      const keepIds = incoming.map((p) => p.id)
      const existing = await db
        .select({ id: schema.positions.id })
        .from(schema.positions)
        .where(and(eq(schema.positions.parentKind, 'event'), eq(schema.positions.parentId, id)))
      const removed = existing.map((e) => e.id).filter((x) => !keepIds.includes(x))
      if (removed.length) {
        await db.delete(schema.signups).where(inArray(schema.signups.positionId, removed))
        await db.delete(schema.positions).where(inArray(schema.positions.id, removed))
      }
      for (const p of incoming) {
        await db
          .insert(schema.positions)
          .values({ ...p, parentKind: 'event', parentId: id })
          .onConflictDoUpdate({
            target: schema.positions.id,
            set: { roleId: p.roleId, needed: p.needed },
          })
      }
      const out = await loadOne(id)
      if (!out) return error('Event not found', 404)
      return json({ event: out })
    }

    if (req.method === 'DELETE' && id) {
      await db.delete(schema.signups).where(eq(schema.signups.refId, id))
      await db.delete(schema.positions).where(eq(schema.positions.parentId, id))
      await db.delete(schema.events).where(eq(schema.events.id, id))
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/events', '/api/events/:id'] }
```

- [ ] **Step 2: Verify**

Manager cookie: `POST /api/events` with a body incl. `positions`; confirm returned `event.managerId` equals the logged-in user's id (server-set). A volunteer cookie → `403`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/events.ts
git commit -m "feat(api): add event CRUD with server-set managerId"
```

---

### Task 12: Signups endpoints

**Files:**
- Create: `netlify/functions/signups.ts`

- [ ] **Step 1: Write the function**

```ts
import type { Config } from '@netlify/functions'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireAuth, isManager } from './_lib/auth'
import { toSignup } from './_lib/serialize'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    const me = await requireAuth(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const kind = b.kind === 'event' ? 'event' : 'service'
      const refId = String(b.refId ?? '')
      const positionId = String(b.positionId ?? '')
      if (!refId || !positionId) return error('refId and positionId are required', 400)
      // dedupe: unique index also protects this; check first for a clean response
      const dupe = await db
        .select({ id: schema.signups.id })
        .from(schema.signups)
        .where(
          and(
            eq(schema.signups.userId, me.id),
            eq(schema.signups.kind, kind),
            eq(schema.signups.refId, refId),
            eq(schema.signups.positionId, positionId),
          ),
        )
      if (dupe.length) return error('Already signed up', 409)
      const row = { id: uid('g'), userId: me.id, kind, refId, positionId }
      await db.insert(schema.signups).values(row)
      return json({ signup: toSignup(row) })
    }

    if (req.method === 'DELETE' && id) {
      const existing = (await db.select().from(schema.signups).where(eq(schema.signups.id, id)))[0]
      if (!existing) return json({ ok: true }) // already gone
      if (existing.userId !== me.id && !isManager(me))
        return error('You can only cancel your own signup', 403)
      await db.delete(schema.signups).where(eq(schema.signups.id, id))
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/signups', '/api/signups/:id'] }
```

- [ ] **Step 2: Verify**

Volunteer cookie: `POST /api/signups` `{"kind":"service","refId":"s-dt-sun9","positionId":"s-dt-sun9:p1"}` → returns signup. Repeat → `409`. `DELETE /api/signups/<id>` → `{ok:true}`. Try deleting another user's signup id → `403`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/signups.ts
git commit -m "feat(api): add signup create/cancel with ownership checks"
```

---

### Task 13: Profile + settings endpoints

**Files:**
- Create: `netlify/functions/profile.ts`

- [ ] **Step 1: Write the function**

```ts
import type { Config } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import { toUser } from './_lib/serialize'

const FONT_SCALES = ['compact', 'normal', 'large', 'xlarge']

export default async (req: Request) =>
  withErrors(async () => {
    const me = await requireAuth(req)
    const url = new URL(req.url)

    if (url.pathname.endsWith('/profile') && req.method === 'PATCH') {
      const b = await req.json()
      const patch: Record<string, string | null> = {}
      if (b.name !== undefined) {
        const name = String(b.name).trim()
        if (!name) return error('Name cannot be empty', 400)
        patch.name = name
      }
      if (b.phone !== undefined) patch.phone = String(b.phone).trim() || null
      if (b.bio !== undefined) patch.bio = String(b.bio).trim() || null
      if (b.photoUrl !== undefined) patch.photoUrl = String(b.photoUrl).trim() || null
      await db.update(schema.users).set(patch).where(eq(schema.users.id, me.id))
      const row = (await db.select().from(schema.users).where(eq(schema.users.id, me.id)))[0]
      return json({ user: toUser(row) })
    }

    if (url.pathname.endsWith('/settings') && req.method === 'PATCH') {
      const b = await req.json()
      const fontScale = String(b.fontScale ?? '')
      if (!FONT_SCALES.includes(fontScale)) return error('Invalid font scale', 400)
      await db.update(schema.users).set({ fontScale }).where(eq(schema.users.id, me.id))
      return json({ settings: { fontScale } })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/profile', '/api/settings'] }
```

- [ ] **Step 2: Verify**

Volunteer cookie: `PATCH /api/profile` `{"bio":"Hi"}` → returns updated user. `PATCH /api/settings` `{"fontScale":"large"}` → `{settings:{fontScale:"large"}}`; invalid value → `400`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/profile.ts
git commit -m "feat(api): add profile + settings endpoints"
```

---

### Task 14: Admin user-management endpoints (port existing)

**Files:**
- Create: `netlify/functions/admin-users.ts`

- [ ] **Step 1: Write the function**

Ports `adminCreateUser/adminUpdateUser/adminDeleteUser`. Super-admin only. New admin-created users need a password — generate a temporary one and return it once so the super-admin can share it (no email infra yet).

```ts
import type { Config } from '@netlify/functions'
import bcrypt from 'bcryptjs'
import { eq, and, ne } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { json, error, withErrors } from './_lib/http'
import { requireSuperAdmin } from './_lib/auth'
import { toUser } from './_lib/serialize'
import { SUPER_ADMIN_EMAIL } from '../../src/types'

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const RESERVED = SUPER_ADMIN_EMAIL.toLowerCase()
const ROLES = ['volunteer', 'event_manager', 'manager']

export default async (req: Request, ctx: { params: { id?: string } }) =>
  withErrors(async () => {
    const me = await requireSuperAdmin(req)
    const id = ctx.params.id

    if (req.method === 'POST') {
      const b = await req.json()
      const name = String(b.name ?? '').trim()
      const lower = String(b.email ?? '').trim().toLowerCase()
      const role = ROLES.includes(b.role) ? b.role : 'volunteer'
      if (!name || !lower) return error('Name and email are required', 400)
      if (lower === RESERVED) return error('That email is reserved', 400)
      const dupe = await db.select().from(schema.users).where(eq(schema.users.email, lower))
      if (dupe.length) return error('That email is already in use', 409)
      // temporary password the super-admin shares manually (no email infra in v1)
      const tempPassword = uid('pw')
      const hash = await bcrypt.hash(tempPassword, 10)
      const newId = uid('u')
      await db.insert(schema.users).values({
        id: newId,
        name,
        email: lower,
        phone: b.phone?.trim() || null,
        bio: b.bio?.trim() || null,
        role,
        passwordHash: hash,
      })
      const row = (await db.select().from(schema.users).where(eq(schema.users.id, newId)))[0]
      return json({ user: toUser(row), tempPassword })
    }

    if (req.method === 'PATCH' && id) {
      const b = await req.json()
      const target = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0]
      if (!target) return error('User not found', 404)
      const patch: Record<string, string> = {}
      if (b.name !== undefined) {
        const name = String(b.name).trim()
        if (!name) return error('Name cannot be empty', 400)
        patch.name = name
      }
      if (b.phone !== undefined) patch.phone = String(b.phone).trim()
      if (b.bio !== undefined) patch.bio = String(b.bio).trim()
      if (b.role !== undefined && ROLES.includes(b.role)) patch.role = b.role
      // the super-admin account's email is locked
      if (b.email !== undefined && target.email !== RESERVED) {
        const lower = String(b.email).trim().toLowerCase()
        if (!lower) return error('Email cannot be empty', 400)
        if (lower === RESERVED) return error('That email is reserved', 400)
        const dupe = await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.email, lower), ne(schema.users.id, id)))
        if (dupe.length) return error('That email is already in use', 409)
        patch.email = lower
      }
      await db.update(schema.users).set(patch).where(eq(schema.users.id, id))
      const row = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0]
      return json({ user: toUser(row) })
    }

    if (req.method === 'DELETE' && id) {
      const target = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0]
      if (!target) return json({ ok: true })
      if (target.email === RESERVED) return error('Cannot delete the super-admin', 403)
      if (target.id === me.id) return error('Cannot delete yourself', 403)
      // cascade: user's signups are FK-cascaded; events keep managerId (set null by FK)
      await db.delete(schema.users).where(eq(schema.users.id, id))
      return json({ ok: true })
    }

    return error('Not found', 404)
  })

export const config: Config = { path: ['/api/admin/users', '/api/admin/users/:id'] }
```

- [ ] **Step 2: Verify**

Super-admin cookie: `POST /api/admin/users` `{"name":"New Mgr","email":"mgr@test.com","role":"manager"}` → returns `{user, tempPassword}`. Volunteer cookie → `403`. Try deleting the super-admin row → `403`.

- [ ] **Step 3: Type-check & commit**

```bash
npm run lint
git add netlify/functions/admin-users.ts
git commit -m "feat(api): port super-admin user-management to backend (temp-password create)"
```

---

## Phase 3 — Client refactor (Approach 1)

### Task 15: Typed API client

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Write the client**

A thin typed wrapper. All calls send `credentials: 'include'` so the session cookie rides along. Throws `ApiError` with the server message on non-2xx.

```ts
import type {
  AppEvent,
  Campus,
  FontScale,
  Position,
  Role,
  ServiceTime,
  Signup,
  User,
  VolunteerRole,
} from '../types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Request failed')
  return data as T
}

export interface AppStateDTO {
  currentUserId: string
  users: User[]
  volunteerRoles: VolunteerRole[]
  campuses: Campus[]
  serviceTimes: ServiceTime[]
  events: AppEvent[]
  signups: Signup[]
  settings: { fontScale: FontScale }
}

export const api = {
  // auth
  register: (b: { name: string; email: string; password: string }) =>
    req<{ user: User }>('POST', '/api/auth/register', b),
  login: (b: { email: string; password: string }) =>
    req<{ user: User }>('POST', '/api/auth/login', b),
  logout: () => req<{ ok: true }>('POST', '/api/auth/logout'),
  me: () => req<{ user: User }>('GET', '/api/auth/me'),
  // hydrate
  state: () => req<AppStateDTO>('GET', '/api/state'),
  // roles
  addRole: (b: { name: string; description?: string; defaultNeeded?: number; category?: string }) =>
    req<{ role: VolunteerRole }>('POST', '/api/roles', b),
  updateRole: (id: string, b: { name: string; description?: string; defaultNeeded?: number; category?: string }) =>
    req<{ role: VolunteerRole }>('PATCH', `/api/roles/${id}`, b),
  deleteRole: (id: string) => req<{ ok: true }>('DELETE', `/api/roles/${id}`),
  // campuses
  addCampus: (b: { name: string; address: string }) =>
    req<{ campus: Campus }>('POST', '/api/campuses', b),
  updateCampus: (id: string, b: { name: string; address: string }) =>
    req<{ campus: Campus }>('PATCH', `/api/campuses/${id}`, b),
  deleteCampus: (id: string) => req<{ ok: true }>('DELETE', `/api/campuses/${id}`),
  // service times
  addServiceTime: (b: { campusId: string; dayOfWeek: string; time: string; positions: Position[] }) =>
    req<{ serviceTime: ServiceTime }>('POST', '/api/service-times', b),
  updateServiceTime: (id: string, b: { campusId: string; dayOfWeek: string; time: string; positions: Position[] }) =>
    req<{ serviceTime: ServiceTime }>('PATCH', `/api/service-times/${id}`, b),
  deleteServiceTime: (id: string) => req<{ ok: true }>('DELETE', `/api/service-times/${id}`),
  // events
  addEvent: (b: { name: string; campusId: string; date: string; time: string; positions: Position[] }) =>
    req<{ event: AppEvent }>('POST', '/api/events', b),
  updateEvent: (id: string, b: { name: string; campusId: string; date: string; time: string; positions: Position[] }) =>
    req<{ event: AppEvent }>('PATCH', `/api/events/${id}`, b),
  deleteEvent: (id: string) => req<{ ok: true }>('DELETE', `/api/events/${id}`),
  // signups
  signUp: (b: { kind: 'service' | 'event'; refId: string; positionId: string }) =>
    req<{ signup: Signup }>('POST', '/api/signups', b),
  cancelSignup: (id: string) => req<{ ok: true }>('DELETE', `/api/signups/${id}`),
  // profile / settings
  updateProfile: (b: Partial<Pick<User, 'name' | 'phone' | 'bio' | 'photoUrl'>>) =>
    req<{ user: User }>('PATCH', '/api/profile', b),
  setFontScale: (fontScale: FontScale) =>
    req<{ settings: { fontScale: FontScale } }>('PATCH', '/api/settings', { fontScale }),
  // admin
  adminCreateUser: (b: { name: string; email: string; phone?: string; bio?: string; role: Role }) =>
    req<{ user: User; tempPassword: string }>('POST', '/api/admin/users', b),
  adminUpdateUser: (id: string, b: Partial<Pick<User, 'name' | 'email' | 'phone' | 'bio' | 'role'>>) =>
    req<{ user: User }>('PATCH', `/api/admin/users/${id}`, b),
  adminDeleteUser: (id: string) => req<{ ok: true }>('DELETE', `/api/admin/users/${id}`),
}
```

- [ ] **Step 2: Type-check & commit**

```bash
npm run lint
git add src/lib/api.ts
git commit -m "feat(client): add typed API client"
```

---

### Task 16: Rewrite `AppContext` to async hydrate-and-write-through

**Files:**
- Modify: `src/context/AppContext.tsx`

This is the core change. The `AppContextValue` interface keeps the same action names, but action signatures become `Promise<void>` (and `register`/`login` change shape). A `status` field drives the boot UI.

- [ ] **Step 1: Replace the file**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppEvent,
  Campus,
  FontScale,
  Position,
  Role,
  ServiceTime,
  Settings,
  Signup,
  User,
  VolunteerRole,
} from '../types'
import { SUPER_ADMIN_EMAIL } from '../types'
import { api, ApiError, type AppStateDTO } from '../lib/api'

type Status = 'loading' | 'unauthenticated' | 'ready' | 'error'

interface Data {
  users: User[]
  volunteerRoles: VolunteerRole[]
  campuses: Campus[]
  serviceTimes: ServiceTime[]
  events: AppEvent[]
  signups: Signup[]
  currentUserId: string | null
  settings: Settings
}

const EMPTY: Data = {
  users: [],
  volunteerRoles: [],
  campuses: [],
  serviceTimes: [],
  events: [],
  signups: [],
  currentUserId: null,
  settings: { fontScale: 'normal' },
}

interface AppContextValue extends Data {
  status: Status
  currentUser: User | null
  isManager: boolean
  isEventManager: boolean
  isSuperAdmin: boolean
  reload: () => Promise<void>
  // auth
  register: (data: { name: string; email: string; password: string }) => Promise<void>
  login: (data: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  // profile
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'bio' | 'photoUrl'>>) => Promise<void>
  setFontScale: (scale: FontScale) => Promise<void>
  // super-admin user management
  adminCreateUser: (data: { name: string; email: string; phone?: string; bio?: string; role: Role }) => Promise<string>
  adminUpdateUser: (id: string, patch: Partial<Pick<User, 'name' | 'email' | 'phone' | 'bio' | 'role'>>) => Promise<void>
  adminDeleteUser: (id: string) => Promise<void>
  // volunteer roles
  addRole: (data: { name: string; description?: string; defaultNeeded?: number; category?: string }) => Promise<void>
  updateRole: (id: string, patch: { name: string; description?: string; defaultNeeded?: number; category?: string }) => Promise<void>
  deleteRole: (id: string) => Promise<void>
  roleName: (roleId: string) => string
  roleUsage: (roleId: string) => { services: number; events: number }
  // manager actions
  addCampus: (data: { name: string; address: string }) => Promise<void>
  addServiceTime: (data: { campusId: string; dayOfWeek: string; time: string; positions: Position[] }) => Promise<void>
  addEvent: (data: { name: string; campusId: string; date: string; time: string; positions: Position[] }) => Promise<void>
  updateCampus: (id: string, patch: { name: string; address: string }) => Promise<void>
  deleteCampus: (id: string) => Promise<void>
  updateServiceTime: (id: string, patch: { campusId: string; dayOfWeek: string; time: string; positions: Position[] }) => Promise<void>
  deleteServiceTime: (id: string) => Promise<void>
  updateEvent: (id: string, patch: { name: string; campusId: string; date: string; time: string; positions: Position[] }) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  // signups
  signUp: (kind: 'service' | 'event', refId: string, positionId: string) => Promise<void>
  cancelSignup: (signupId: string) => Promise<void>
  campusName: (campusId: string) => string
  positionFilled: (kind: 'service' | 'event', refId: string, positionId: string) => number
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<Data>(EMPTY)

  const hydrate = (dto: AppStateDTO) =>
    setData({
      users: dto.users,
      volunteerRoles: dto.volunteerRoles,
      campuses: dto.campuses,
      serviceTimes: dto.serviceTimes,
      events: dto.events,
      signups: dto.signups,
      currentUserId: dto.currentUserId,
      settings: dto.settings,
    })

  const reload = useCallback(async () => {
    try {
      const dto = await api.state()
      hydrate(dto)
      setStatus('ready')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setData(EMPTY)
        setStatus('unauthenticated')
      } else {
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Accessible font scaling at the document root (unchanged behavior).
  useEffect(() => {
    const px = { compact: '16px', normal: '18px', large: '20px', xlarge: '23px' }[
      data.settings.fontScale
    ]
    document.documentElement.style.fontSize = px
  }, [data.settings.fontScale])

  const currentUser = data.users.find((u) => u.id === data.currentUserId) ?? null

  const value = useMemo<AppContextValue>(() => {
    const superAdmin = currentUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()

    const set = (patch: Partial<Data>) => setData((d) => ({ ...d, ...patch }))
    const upsert = <T extends { id: string }>(list: T[], item: T) =>
      list.some((x) => x.id === item.id)
        ? list.map((x) => (x.id === item.id ? item : x))
        : [...list, item]

    return {
      ...data,
      status,
      currentUser,
      isManager: currentUser?.role === 'manager' || superAdmin,
      isEventManager:
        currentUser?.role === 'event_manager' || currentUser?.role === 'manager' || superAdmin,
      isSuperAdmin: superAdmin,
      reload,

      register: async (d) => {
        await api.register(d)
        await reload()
      },
      login: async (d) => {
        await api.login(d)
        await reload()
      },
      logout: async () => {
        await api.logout()
        setData(EMPTY)
        setStatus('unauthenticated')
      },

      updateProfile: async (patch) => {
        const { user } = await api.updateProfile(patch)
        setData((d) => ({ ...d, users: upsert(d.users, user) }))
      },
      setFontScale: async (fontScale) => {
        await api.setFontScale(fontScale)
        set({ settings: { fontScale } })
      },

      adminCreateUser: async (d) => {
        const { user, tempPassword } = await api.adminCreateUser(d)
        setData((s) => ({ ...s, users: upsert(s.users, user) }))
        return tempPassword
      },
      adminUpdateUser: async (id, patch) => {
        const { user } = await api.adminUpdateUser(id, patch)
        setData((s) => ({ ...s, users: upsert(s.users, user) }))
      },
      adminDeleteUser: async (id) => {
        await api.adminDeleteUser(id)
        setData((s) => ({
          ...s,
          users: s.users.filter((u) => u.id !== id),
          signups: s.signups.filter((g) => g.userId !== id),
        }))
      },

      addRole: async (d) => {
        const { role } = await api.addRole(d)
        setData((s) => ({ ...s, volunteerRoles: [...s.volunteerRoles, role] }))
      },
      updateRole: async (id, patch) => {
        const { role } = await api.updateRole(id, patch)
        setData((s) => ({ ...s, volunteerRoles: upsert(s.volunteerRoles, role) }))
      },
      deleteRole: async (id) => {
        await api.deleteRole(id)
        setData((s) => ({ ...s, volunteerRoles: s.volunteerRoles.filter((r) => r.id !== id) }))
      },

      addCampus: async (d) => {
        const { campus } = await api.addCampus(d)
        setData((s) => ({ ...s, campuses: [...s.campuses, campus] }))
      },
      updateCampus: async (id, patch) => {
        const { campus } = await api.updateCampus(id, patch)
        setData((s) => ({ ...s, campuses: upsert(s.campuses, campus) }))
      },
      deleteCampus: async (id) => {
        await api.deleteCampus(id)
        await reload() // cascade touches services/events/signups — refetch for truth
      },

      addServiceTime: async (d) => {
        const { serviceTime } = await api.addServiceTime(d)
        setData((s) => ({ ...s, serviceTimes: [...s.serviceTimes, serviceTime] }))
      },
      updateServiceTime: async (id, patch) => {
        const { serviceTime } = await api.updateServiceTime(id, patch)
        setData((s) => ({
          ...s,
          serviceTimes: upsert(s.serviceTimes, serviceTime),
          signups: s.signups.filter((g) =>
            g.kind === 'service' && g.refId === id
              ? serviceTime.positions.some((p) => p.id === g.positionId)
              : true,
          ),
        }))
      },
      deleteServiceTime: async (id) => {
        await api.deleteServiceTime(id)
        setData((s) => ({
          ...s,
          serviceTimes: s.serviceTimes.filter((st) => st.id !== id),
          signups: s.signups.filter((g) => !(g.kind === 'service' && g.refId === id)),
        }))
      },

      addEvent: async (d) => {
        const { event } = await api.addEvent(d)
        setData((s) => ({ ...s, events: [...s.events, event] }))
      },
      updateEvent: async (id, patch) => {
        const { event } = await api.updateEvent(id, patch)
        setData((s) => ({
          ...s,
          events: upsert(s.events, event),
          signups: s.signups.filter((g) =>
            g.kind === 'event' && g.refId === id
              ? event.positions.some((p) => p.id === g.positionId)
              : true,
          ),
        }))
      },
      deleteEvent: async (id) => {
        await api.deleteEvent(id)
        setData((s) => ({
          ...s,
          events: s.events.filter((e) => e.id !== id),
          signups: s.signups.filter((g) => !(g.kind === 'event' && g.refId === id)),
        }))
      },

      signUp: async (kind, refId, positionId) => {
        const { signup } = await api.signUp({ kind, refId, positionId })
        setData((s) => ({ ...s, signups: [...s.signups, signup] }))
      },
      cancelSignup: async (signupId) => {
        await api.cancelSignup(signupId)
        setData((s) => ({ ...s, signups: s.signups.filter((g) => g.id !== signupId) }))
      },

      campusName: (campusId) => data.campuses.find((c) => c.id === campusId)?.name ?? 'Unknown campus',
      roleName: (roleId) => data.volunteerRoles.find((r) => r.id === roleId)?.name ?? 'Unknown role',
      roleUsage: (roleId) => ({
        services: data.serviceTimes.filter((st) => st.positions.some((p) => p.roleId === roleId)).length,
        events: data.events.filter((e) => e.positions.some((p) => p.roleId === roleId)).length,
      }),
      positionFilled: (kind, refId, positionId) =>
        data.signups.filter(
          (g) => g.kind === kind && g.refId === refId && g.positionId === positionId,
        ).length,
    }
  }, [data, status, currentUser, reload])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

> **Removed:** `loadState`, `STORAGE_KEY`, the localStorage `useEffect`, `seed*` imports, `switchRole`, `uid`, and the old `register`/`login` signatures. `switchRole` returns super-admin-only in sub-project #2.

- [ ] **Step 2: Type-check (expect errors in consumers — that's the next tasks)**

Run: `npm run lint`
Expected: errors in `Login.tsx` (old `login(userId)` / `register({...role})`), and any component that relied on `switchRole`. These are fixed in Tasks 17–19. Note the failing files.

- [ ] **Step 3: Commit (WIP — consumers fixed next)**

```bash
git add src/context/AppContext.tsx
git commit -m "feat(client): rewrite AppContext to async API-backed store (consumers updated next)"
```

---

### Task 17: Boot/loading + auth-gating in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { ServiceDetail } from './pages/ServiceDetail'
import { EventDetail } from './pages/EventDetail'
import { Schedule } from './pages/Schedule'
import { Profile } from './pages/Profile'
import { Manage } from './pages/Manage'
import { Admin } from './pages/Admin'

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-700 px-6 text-center text-white">
      <div>{children}</div>
    </div>
  )
}

export default function App() {
  const { status, reload } = useApp()

  if (status === 'loading') {
    return <FullScreen>Loading…</FullScreen>
  }
  if (status === 'error') {
    return (
      <FullScreen>
        <p className="mb-4">We couldn't reach the server.</p>
        <button
          onClick={() => reload()}
          className="rounded-xl bg-white px-5 py-3 font-semibold text-brand-700"
        >
          Retry
        </button>
      </FullScreen>
    )
  }
  if (status === 'unauthenticated') {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // status === 'ready'
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

> The old `RequireAuth` is gone — auth-gating is now driven by `status`. When unauthenticated, every route renders `Login`.

- [ ] **Step 2: Type-check & commit**

```bash
npm run lint
git add src/App.tsx
git commit -m "feat(client): drive boot/loading/auth-gating from AppContext status"
```

---

### Task 18: Rewrite `Login.tsx` (email + password)

**Files:**
- Modify: `src/pages/Login.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ApiError } from '../lib/api'

export function Login() {
  const { login, register } = useApp()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password })
      } else {
        await register({ name: name.trim(), email: email.trim(), password })
      }
      // On success, status flips to 'ready' and App routes to '/'.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-brand-700 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Volunteer Scheduler</h1>
          <p className="mt-2 text-brand-100">Sign up to serve at services and events.</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
          <h2 className="mb-3 text-lg font-bold">
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>

          {mode === 'register' && (
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
                placeholder="Your name"
              />
            </label>
          )}

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
              placeholder="you@example.com"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
            />
          </label>

          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'))
              setError(null)
            }}
            className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-slate-500"
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : '← Back to sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

> Removed: the demo-account picker, `useNavigate`/`go` (routing now follows `status`), `ROLE_LABELS`/role radios (no self-assigned roles), `Avatar`/`RoleBadge` imports.

- [ ] **Step 2: Type-check & commit**

```bash
npm run lint
git add src/pages/Login.tsx
git commit -m "feat(client): email+password login/register form"
```

---

### Task 19: Fix remaining async call-sites + Admin temp-password UX

**Files:**
- Modify: any component flagged by `npm run lint` after Task 16. Known: `src/pages/Admin.tsx` (uses `adminCreateUser` — now returns a temp password), `src/pages/Profile.tsx` (likely `switchRole` / `updateProfile` / `setFontScale`), and the manage forms/sections that call create/update/delete actions.

- [ ] **Step 1: Enumerate the breakages**

Run: `npm run lint`
Read each error. They fall into three buckets:
1. **`switchRole` removed** — remove any role-switcher UI (likely in `Profile.tsx`). Per spec it returns super-admin-only in #2; for now delete the control and its handler.
2. **Actions are now `Promise<void>`** — call-sites that did `onClick={() => addCampus(...)}` still type-check (the returned promise is ignored), but anywhere the code reads a synchronous result, or `register/login` with the **old argument shape**, must be updated. Update `register`/`login` callers (only `Login.tsx`, already done).
3. **`adminCreateUser` now returns `Promise<string>` (temp password)** — update `Admin.tsx` to await it and surface the password.

- [ ] **Step 2: Update `Admin.tsx` create handler to show the temp password**

In `src/pages/Admin.tsx`, change the add-user `onSubmit` to await and toast the temporary password (the server no longer needs the client to pre-check email uniqueness, but keeping the early reserved/dupe checks is harmless UX). Replace the `adminCreateUser(d)` block:

```tsx
onSubmit={async (d) => {
  try {
    const tempPassword = await adminCreateUser(d)
    toast(`User "${d.name}" added. Temporary password: ${tempPassword}`)
  } catch (e) {
    toast(e instanceof ApiError ? e.message : 'Could not add user')
  }
}}
```
Add `import { ApiError } from '../lib/api'` at the top. Similarly wrap `adminUpdateUser`/`adminDeleteUser` calls in `try/catch` with a toast on error. (The client-side dupe pre-checks may stay; the server is authoritative regardless.)

- [ ] **Step 3: Remove the role-switcher from `Profile.tsx`**

Open `src/pages/Profile.tsx`. Remove the role-switch control, the `switchRole` from the `useApp()` destructure, and any `Role`/`ROLE_LABELS` imports that become unused. Wrap `updateProfile` and `setFontScale` calls so they `await` and toast on error, e.g.:
```tsx
const save = async () => {
  try {
    await updateProfile({ name, phone, bio })
    toast('Profile saved')
  } catch (e) {
    toast(e instanceof ApiError ? e.message : 'Could not save')
  }
}
```
(Use the page's existing toast hook; add the `ApiError` import.)

- [ ] **Step 4: Fix any manage form/section call-sites**

For each remaining lint error in `src/components/manage/*` or `src/components/forms/*`, wrap the action call in `async`/`try`/`catch` with a toast, matching the patterns above. Do not change the action *names* or arguments (they're unchanged except `register`/`login`).

- [ ] **Step 5: Type-check until clean**

Run: `npm run lint`
Expected: PASS (zero errors). Iterate Steps 2–4 until clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Profile.tsx src/components
git commit -m "feat(client): adapt call-sites to async actions; admin temp-password UX; drop role-switcher"
```

---

### Task 20: Remove dead seed/localStorage code path

**Files:**
- Modify: `src/data/mockData.ts` (now only used by the seed script)

- [ ] **Step 1: Confirm `mockData.ts` is only imported by the seed**

Run: `grep -rn "from '../data/mockData'\|from '../../src/data/mockData'\|mockData" src netlify`
Expected: the only importer is `netlify/db/seed.ts`. `mockData.ts` keeps the `seed*` exports (the seed script needs them) and the `seedUsers`/`seedSignups` exports may stay unused by the seed — that's fine (they document the original demo data). If `npm run lint` flags `seedUsers`/`seedSignups` as unused in `mockData.ts` itself, they won't (they're exported). No change required unless lint complains.

- [ ] **Step 2: Full type-check + build**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 3: Commit (if any change was needed)**

```bash
git add -A
git commit -m "chore: confirm mockData is seed-only after backend migration"
```

---

## Phase 4 — Docs & end-to-end verification

### Task 21: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Project + Commands + Architecture sections**

Rewrite the relevant parts to reflect the backend:
- **Project:** no longer "frontend-only / no backend." It now has a Netlify Functions API + Neon Postgres via Drizzle; auth is real (email+password, JWT httpOnly cookie). State is hydrated from `GET /api/state` into `AppContext` (still the single client store) and written through per action.
- **Commands:** `npm run dev` now runs `netlify dev` (Vite + functions; requires `.env` with `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_INITIAL_PASSWORD`). Add `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`. Note `dev:vite` for UI-only work.
- **Architecture:** describe `netlify/functions/*` (v2 API, `config.path`, role guards in `_lib/auth.ts`), `netlify/db/*` (schema, client, migrations, seed), `src/lib/api.ts`, and that `AppContext` is now async (`status: loading|unauthenticated|ready|error`). Note `positions` is its own table and client `Position.id` = `${parentId}:${slot}`.
- **Roles & gating:** add that gating is now enforced **server-side** in every function; client flags are advisory for UI. `switchRole` is removed (returns super-admin-only in sub-project #2).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Netlify backend foundation"
```

---

### Task 22: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Fresh boot + register**

Run `npm run dev`. Open `http://localhost:8888`. Expect the login screen (status `unauthenticated`). Register a new account → lands on Home as a volunteer. Reload the page → still logged in (cookie persists), data loads.

- [ ] **Step 2: Shared data across users**

In a second browser/incognito, register a different account and sign up for a position on a service. Back in the first browser, navigate away and back (or reload) → the filled count reflects the second user's signup. ✅ shared + fresh-on-load.

- [ ] **Step 3: Server-side role enforcement**

As the volunteer, confirm the Manage/Admin nav items are hidden. Then directly call a gated endpoint with the volunteer cookie:
```bash
curl -s -b /tmp/fb.cookies -X POST localhost:8888/api/campuses \
  -H 'content-type: application/json' -d '{"name":"X","address":"Y"}' -o /dev/null -w '%{http_code}\n'
```
Expected: `403`. ✅ tampered client can't escalate.

- [ ] **Step 4: Super-admin flows**

Log in as `epena@fallbrookchurch.org` (using `SUPER_ADMIN_INITIAL_PASSWORD`). Confirm Manage + Admin (Users) appear. Create a user in Admin → a temporary password is shown in the toast. Log out, log in as that user with the temp password → success. Edit a role/campus/service/event and verify changes persist after reload.

- [ ] **Step 5: Logout**

Click logout → returns to login screen (status `unauthenticated`); `GET /api/state` would 401. Reload → still logged out.

- [ ] **Step 6: Final gate**

Run: `npm run build`
Expected: PASS. The branch is ready for review/PR.

---

## Self-review notes (addressed)

- **Spec coverage:** schema (T2), migrations (T3), seed + super-admin bootstrap (T4), auth (T5c/T6), JWT-in-httpOnly-cookie (T5a/T5c), `/api/state` hydrate (T7), all CRUD endpoints with server-side gating (T8–T13), ported admin actions (T14), client API (T15), async `AppContext` Approach 1 (T16), boot/loading/error/auth-gating (T17), login form (T18), call-site migration (T19), docs (T21), and the manual verification flows from the spec (T22). ✅
- **Positions id scheme** is consistent across seed (T4), serialize (T5b), and every service/event endpoint (T10/T11): client `Position.id` === `positions.id` === `${parentId}:${slot}`; `Signup.positionId` references it end-to-end so `positionFilled` is unchanged.
- **No password reset** (spec: out of scope v1) — admin-created users get a one-time temp password (T14/T19) as the interim path.
- **Adapted TDD** to the repo's real gate (`tsc -b` + manual QA) since there is no test runner, per `CLAUDE.md` (user-instruction priority).
