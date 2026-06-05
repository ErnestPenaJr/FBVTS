# Planning Center Worship Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only **Worship** page that pulls each upcoming Planning Center service plan's order of service (songs, segments, timings, notes) live through the Netlify backend.

**Architecture:** Two Netlify v2 functions (`config.path` routing) proxy the Planning Center **Services** API server-side using a single Personal Access Token held in env vars; the browser never sees the credential. A new `src/pages/Worship.tsx` fetches plans on mount and lazily loads each plan's items on expand, via thin wrappers added to the existing `src/lib/api.ts`. No new database tables — data is fetched live, matching FBVTS's "fresh on load" model.

**Tech Stack:** Netlify Functions v2 (`Request`/`Response`, `config.path`), Planning Center Services API v2 (HTTP Basic / PAT), React 19 + TypeScript + Tailwind v4, React Router v7.

---

## Dependency

This plan builds on the **Netlify Backend Foundation** (`docs/superpowers/plans/2026-06-02-netlify-backend-foundation.md`). It reuses:

- `netlify/functions/_lib/http.ts` — `json`, `error`, `withErrors`.
- `netlify/functions/_lib/auth.ts` — `requireAuth`, `HttpError`.
- `src/lib/api.ts` — the `req` fetch helper, `ApiError`, and the `api` object.
- `tsconfig.netlify.json` referenced from `tsconfig.json` so `tsc -b` type-checks `netlify/**`.

Those `_lib` helpers are already committed on this branch. `src/lib/api.ts` and the `/api/*` function wiring come from the foundation; if `src/lib/api.ts` does not yet exist when you reach Task 4, the foundation has not landed — pause and complete it first, since the Worship page cannot authenticate without the session-cookie infrastructure.

## Verification model

Per `CLAUDE.md` this repo has **no test runner and no ESLint** — the gate is `npm run lint` (`tsc -b --noEmit`) plus manual QA. Every task therefore ends with a type-check, optional manual verification, and a commit. Do not add a test framework.

Manual API checks require `netlify dev` running with real `PCO_APP_ID` / `PCO_SECRET` and a logged-in session cookie; if credentials are not yet available, complete the code + type-check and defer the live check (note it in the commit body).

## File structure

**Create:**
- `netlify/functions/_lib/pco.ts` — Planning Center HTTP client: builds the Basic auth header, fetches, maps upstream failures to `HttpError`.
- `netlify/functions/worship-plans.ts` — `GET /api/worship/plans`: upcoming plans across service types.
- `netlify/functions/worship-plan-items.ts` — `GET /api/worship/plans/:serviceTypeId/:planId/items`: one plan's order of service.
- `src/pages/Worship.tsx` — the Worship page (list of plans + per-plan order of service).

**Modify:**
- `.env.example` — document `PCO_APP_ID` / `PCO_SECRET`.
- `src/lib/api.ts` — add `WorshipPlan` / `WorshipItem` types and `worshipPlans` / `worshipItems` methods.
- `src/components/Layout.tsx` — add a `worship` icon and an unfiltered nav item.
- `src/App.tsx` — add the `/worship` route inside the `RequireAuth` + `Layout` wrapper.
- `CLAUDE.md` — document the Worship page and PCO env vars.

---

## Phase 1 — Backend

### Task 1: Planning Center client + env vars

**Files:**
- Create: `netlify/functions/_lib/pco.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the PCO client**

Create `netlify/functions/_lib/pco.ts`:

```ts
import { HttpError } from './auth'

const BASE = 'https://api.planningcenteronline.com/services/v2'

function authHeader(): string {
  const id = process.env.PCO_APP_ID
  const secret = process.env.PCO_SECRET
  if (!id || !secret) {
    throw new HttpError(500, 'Planning Center is not configured')
  }
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

/**
 * Fetch a path under the Services API (e.g. '/service_types?per_page=100').
 * Maps upstream failures to HttpError so callers stay thin and `withErrors`
 * renders a clean JSON error to the client.
 */
export async function pcoFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
  })
  if (res.status === 429) {
    throw new HttpError(503, 'Planning Center is busy — please try again shortly')
  }
  if (res.status === 401) {
    throw new HttpError(500, 'Planning Center credentials are invalid')
  }
  if (!res.ok) {
    throw new HttpError(502, `Planning Center request failed (${res.status})`)
  }
  return (await res.json()) as T
}
```

- [ ] **Step 2: Document the env vars**

Append to `.env.example`:

```bash
# Planning Center — Personal Access Token (read-only).
# Create at https://api.planningcenteronline.com/oauth/applications →
# "Personal Access Tokens". Used server-side only; never exposed to the client.
PCO_APP_ID=
PCO_SECRET=
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS (no type errors; `Buffer`/`fetch` resolve via the `node` types in `tsconfig.netlify.json`).

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/_lib/pco.ts .env.example
git commit -m "feat(api): add Planning Center HTTP client and env scaffolding"
```

---

### Task 2: `GET /api/worship/plans` function

**Files:**
- Create: `netlify/functions/worship-plans.ts`

- [ ] **Step 1: Write the function**

Create `netlify/functions/worship-plans.ts`. It lists service types, then the next few future plans per type, flattens, sorts ascending by date, and caps the total.

```ts
import type { Config } from '@netlify/functions'
import { json, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import { pcoFetch } from './_lib/pco'

interface PcoEntity {
  id: string
  attributes: Record<string, unknown>
}
interface PcoList {
  data: PcoEntity[]
}

export interface WorshipPlanDTO {
  id: string
  serviceTypeId: string
  serviceTypeName: string
  title: string | null
  seriesTitle: string | null
  date: string | null // ISO sort_date, used for ordering
  dateLabel: string | null // human "dates" string from PCO
}

const MAX_PLANS = 10
const PER_TYPE = 5

export default async (req: Request) =>
  withErrors(async () => {
    await requireAuth(req)

    const types = await pcoFetch<PcoList>('/service_types?per_page=100')
    const plans: WorshipPlanDTO[] = []

    for (const t of types.data) {
      const name = (t.attributes.name as string | undefined) ?? 'Service'
      const list = await pcoFetch<PcoList>(
        `/service_types/${t.id}/plans?filter=future&order=sort_date&per_page=${PER_TYPE}`,
      )
      for (const p of list.data) {
        plans.push({
          id: p.id,
          serviceTypeId: t.id,
          serviceTypeName: name,
          title: (p.attributes.title as string | null) ?? null,
          seriesTitle: (p.attributes.series_title as string | null) ?? null,
          date: (p.attributes.sort_date as string | null) ?? null,
          dateLabel: (p.attributes.dates as string | null) ?? null,
        })
      }
    }

    plans.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    return json({ plans: plans.slice(0, MAX_PLANS) })
  })

export const config: Config = { path: '/api/worship/plans' }
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual check (if creds available)**

With `netlify dev` running and a valid session cookie:

Run: `curl -s --cookie "fbvts_session=<token>" http://localhost:8888/api/worship/plans | head`
Expected: JSON `{ "plans": [ { "id": "...", "serviceTypeName": "...", "date": "...", ... } ] }`, ordered by date.
Without a cookie, expect `{ "error": "Not authenticated" }` (401). If creds are missing, defer this check.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/worship-plans.ts
git commit -m "feat(api): add GET /api/worship/plans (Planning Center plans)"
```

---

### Task 3: `GET /api/worship/plans/:serviceTypeId/:planId/items` function

**Files:**
- Create: `netlify/functions/worship-plan-items.ts`

- [ ] **Step 1: Write the function**

Create `netlify/functions/worship-plan-items.ts`. It parses the two path params, fetches the plan's items, normalizes them, and returns them in `sequence` order.

```ts
import type { Config } from '@netlify/functions'
import { json, error, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import { pcoFetch } from './_lib/pco'

interface PcoEntity {
  id: string
  attributes: Record<string, unknown>
}
interface PcoList {
  data: PcoEntity[]
}

export interface WorshipItemDTO {
  id: string
  type: string // 'song' | 'header' | 'item' | 'media'
  title: string
  sequence: number
  lengthSeconds: number
  description: string | null
}

export default async (req: Request) =>
  withErrors(async () => {
    await requireAuth(req)

    const url = new URL(req.url)
    // /api/worship/plans/:serviceTypeId/:planId/items
    const m = url.pathname.match(
      /\/worship\/plans\/([^/]+)\/([^/]+)\/items$/,
    )
    if (!m) return error('Not found', 404)
    const serviceTypeId = m[1]
    const planId = m[2]

    const list = await pcoFetch<PcoList>(
      `/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&order=sequence`,
    )

    const items: WorshipItemDTO[] = list.data.map((it) => ({
      id: it.id,
      type: (it.attributes.item_type as string | undefined) ?? 'item',
      title: (it.attributes.title as string | undefined) ?? '',
      sequence: (it.attributes.sequence as number | undefined) ?? 0,
      lengthSeconds: (it.attributes.length as number | undefined) ?? 0,
      description: (it.attributes.description as string | null) ?? null,
    }))
    items.sort((a, b) => a.sequence - b.sequence)

    return json({ items })
  })

export const config: Config = {
  path: '/api/worship/plans/:serviceTypeId/:planId/items',
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual check (if creds available)**

Using a `serviceTypeId`/`planId` from the Task 2 response:

Run: `curl -s --cookie "fbvts_session=<token>" "http://localhost:8888/api/worship/plans/<stid>/<pid>/items" | head`
Expected: JSON `{ "items": [ { "type": "header"|"song"|"item", "title": "...", "sequence": 1, "lengthSeconds": 0, ... } ] }`, ordered by sequence. Defer if creds are missing.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/worship-plan-items.ts
git commit -m "feat(api): add GET worship plan items (order of service)"
```

---

## Phase 2 — Client

### Task 4: Extend the API client

**Files:**
- Modify: `src/lib/api.ts`

> If `src/lib/api.ts` does not exist, the backend foundation has not landed — stop and complete it first (see Dependency above).

- [ ] **Step 1: Add the worship DTO types**

Add near the other exported interfaces in `src/lib/api.ts` (these mirror the function DTOs exactly):

```ts
export interface WorshipPlan {
  id: string
  serviceTypeId: string
  serviceTypeName: string
  title: string | null
  seriesTitle: string | null
  date: string | null
  dateLabel: string | null
}

export interface WorshipItem {
  id: string
  type: string // 'song' | 'header' | 'item' | 'media'
  title: string
  sequence: number
  lengthSeconds: number
  description: string | null
}
```

- [ ] **Step 2: Add the methods to the `api` object**

Add inside the `export const api = { ... }` object (e.g. after the profile/settings methods):

```ts
  // worship (Planning Center, read-only)
  worshipPlans: () => req<{ plans: WorshipPlan[] }>('GET', '/api/worship/plans'),
  worshipItems: (serviceTypeId: string, planId: string) =>
    req<{ items: WorshipItem[] }>(
      'GET',
      `/api/worship/plans/${serviceTypeId}/${planId}/items`,
    ),
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(client): add worship API client methods"
```

---

### Task 5: The Worship page

**Files:**
- Create: `src/pages/Worship.tsx`

- [ ] **Step 1: Write the page**

Create `src/pages/Worship.tsx`. It loads plans on mount (loading / error / ready states), and each plan card lazily loads its order of service when expanded. All spacing is `rem`-based via Tailwind utility classes (no `px`), matching the accessibility constraint and the styling of `src/pages/Home.tsx`.

```tsx
import { useEffect, useState } from 'react'
import {
  api,
  ApiError,
  type WorshipPlan,
  type WorshipItem,
} from '../lib/api'

function formatDate(iso: string | null, fallback: string | null): string {
  if (!iso) return fallback ?? ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fallback ?? ''
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatLength(seconds: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

function typeLabel(type: string): string {
  if (type === 'song') return 'Song'
  if (type === 'header') return 'Header'
  if (type === 'media') return 'Media'
  return 'Item'
}

export function Worship() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [plans, setPlans] = useState<WorshipPlan[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  function load() {
    setStatus('loading')
    api
      .worshipPlans()
      .then((r) => {
        setPlans(r.plans)
        setStatus('ready')
      })
      .catch((e) => {
        setErrorMsg(
          e instanceof ApiError ? e.message : 'Could not load worship plans',
        )
        setStatus('error')
      })
  }

  useEffect(load, [])

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold">Worship</h2>
      <p className="mb-4 text-slate-500">Upcoming order of service</p>

      {status === 'loading' && (
        <p className="text-slate-500">Loading plans…</p>
      )}

      {status === 'error' && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <h3 className="mb-1 text-lg font-bold text-slate-700">
            Couldn’t load worship plans
          </h3>
          <p className="mb-4 text-slate-500">{errorMsg}</p>
          <button
            onClick={load}
            className="rounded-xl bg-brand-700 px-4 py-2.5 font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'ready' &&
        (plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <h3 className="mb-1 text-lg font-bold text-slate-700">
              No upcoming plans
            </h3>
            <p className="text-slate-500">
              Once a worship plan is scheduled in Planning Center, it’ll appear
              here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {plans.map((p) => (
              <PlanCard key={`${p.serviceTypeId}:${p.id}`} plan={p} />
            ))}
          </ul>
        ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: WorshipPlan }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WorshipItem[] | null>(null)
  const [itemStatus, setItemStatus] = useState<
    'idle' | 'loading' | 'error' | 'ready'
  >('idle')
  const [itemError, setItemError] = useState('')

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && itemStatus === 'idle') {
      setItemStatus('loading')
      api
        .worshipItems(plan.serviceTypeId, plan.id)
        .then((r) => {
          setItems(r.items)
          setItemStatus('ready')
        })
        .catch((e) => {
          setItemError(
            e instanceof ApiError
              ? e.message
              : 'Could not load the order of service',
          )
          setItemStatus('error')
        })
    }
  }

  const heading = plan.title || plan.seriesTitle || plan.serviceTypeName

  return (
    <li className="rounded-2xl border border-slate-200">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between p-4 text-left"
      >
        <span>
          <span className="block text-lg font-bold">{heading}</span>
          <span className="block text-slate-500">
            {formatDate(plan.date, plan.dateLabel)} · {plan.serviceTypeName}
          </span>
        </span>
        <span className="text-brand-700">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {itemStatus === 'loading' && (
            <p className="text-slate-500">Loading order of service…</p>
          )}
          {itemStatus === 'error' && (
            <p className="text-slate-500">{itemError}</p>
          )}
          {itemStatus === 'ready' &&
            (items && items.length > 0 ? (
              <ol className="space-y-2">
                {items.map((it) =>
                  it.type === 'header' ? (
                    <li
                      key={it.id}
                      className="pt-2 text-sm font-bold uppercase tracking-wide text-slate-400"
                    >
                      {it.title}
                    </li>
                  ) : (
                    <li
                      key={it.id}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span>
                        <span className="font-semibold">{it.title}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {typeLabel(it.type)}
                        </span>
                        {it.description && (
                          <span className="block text-sm text-slate-500">
                            {it.description}
                          </span>
                        )}
                      </span>
                      {it.lengthSeconds > 0 && (
                        <span className="shrink-0 text-sm text-slate-400">
                          {formatLength(it.lengthSeconds)}
                        </span>
                      )}
                    </li>
                  ),
                )}
              </ol>
            ) : (
              <p className="text-slate-500">No items in this plan yet.</p>
            ))}
        </div>
      )}
    </li>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Worship.tsx
git commit -m "feat(client): add Worship page (order of service)"
```

---

### Task 6: Wire up navigation and route

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the worship icon**

In `src/components/Layout.tsx`, add a `worship` entry to the `ICONS` object (a music-note glyph):

```ts
  worship:
    'M9 18V5l12-2v13M9 13l12-2M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
```

- [ ] **Step 2: Add the nav item (unfiltered)**

In `src/components/Layout.tsx`, add the Worship item to the `items` array — placed after `My Schedule`, with no role filter so all logged-in users see it:

```ts
    { to: '/schedule', label: 'My Schedule', icon: ICONS.schedule },
    { to: '/worship', label: 'Worship', icon: ICONS.worship },
```

(Insert the `/worship` line immediately after the existing `/schedule` line; leave the role-filtered `manage`/`admin` entries unchanged.)

- [ ] **Step 3: Add the route**

In `src/App.tsx`, import the page and add its route inside the `RequireAuth` + `Layout` wrapper:

```ts
import { Worship } from './pages/Worship'
```

```tsx
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/worship" element={<Worship />} />
```

(Insert the `/worship` route immediately after the existing `/schedule` route.)

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

With `netlify dev` running, log in, and confirm:
- A **Worship** item appears in the sidebar (desktop) and bottom tab bar (mobile) for a plain volunteer.
- Clicking it loads `/worship`; plans render; expanding a plan shows its order of service.
- A bad/missing PCO credential shows the page's error/retry state rather than a crash.

(Defer the data-bearing checks if PCO creds are not yet configured; the nav/route presence is still verifiable.)

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx src/App.tsx
git commit -m "feat(client): add Worship to navigation and routing"
```

---

### Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the feature and env vars**

In `CLAUDE.md`, add a short note (in the Architecture section, near the backend/API description the foundation introduced) covering:
- A read-only **Worship** page (`/worship`, visible to all logged-in users) shows upcoming Planning Center **Services** plans and their order of service.
- It is served by `netlify/functions/worship-plans.ts` and `worship-plan-items.ts`, which proxy the Planning Center API via `netlify/functions/_lib/pco.ts` using `PCO_APP_ID` / `PCO_SECRET` (a read-only Personal Access Token) — server-side only, never in the client bundle.
- Data is fetched **live** (no DB tables, no caching).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the Worship (Planning Center) page"
```

---

## Self-review checklist (already applied)

- **Spec coverage:** PAT auth (Task 1), live fetch + two endpoints (Tasks 2–3), dedicated page for all users (Tasks 5–6), order-of-service field set: title/type/length/description in `sequence` order grouped under headers (Tasks 3, 5), errors as `{ error }` + retry UI (Tasks 1–3, 5), env-only secrets (Task 1), `npm run lint` gate + manual QA (every task). Out-of-scope items (caching, OAuth, scheduling sync, lyrics) are intentionally absent.
- **No placeholders:** every code step contains complete code; no TODO/TBD.
- **Type consistency:** `WorshipPlanDTO`/`WorshipItemDTO` (server) and `WorshipPlan`/`WorshipItem` (client) carry identical field names and types; `pcoFetch`, `worshipPlans`, `worshipItems`, `serviceTypeId`/`planId` are used consistently across tasks; the items route string matches between the function `config.path`, the URL regex, and the client method.
```
