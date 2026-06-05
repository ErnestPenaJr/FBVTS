# Planning Center Worship Page — Design Spec

**Date:** 2026-06-05
**Status:** Approved (pending final spec review)
**Depends on:** Netlify Backend Foundation (sub-project #1) — needs `requireAuth`
and the `/api/*` function wiring.

## Goal

Bring the **order of service** ("worship script") from Planning Center into FBVTS
as a new, read-only **Worship** page. Volunteers can see upcoming worship plans
and each plan's run-of-show — songs, segments, timings, and notes — pulled live
from Planning Center's **Services** app.

## Decisions (from brainstorming)

- **What:** the order of service / run-of-show only (songs, segments, timings,
  notes). **Not** volunteer-scheduling sync — that overlaps FBVTS's own model and
  is out of scope here.
- **Auth to PCO:** a single **Personal Access Token** (App ID + Secret) stored in
  Netlify env vars. FBVTS reads the church's own Services data server-side.
  Read-only. No per-user OAuth.
- **Placement:** a **dedicated Worship page** (new nav item) — a straight
  read-only view of upcoming PCO plans by date. No linking model to FBVTS
  `ServiceTime`s / `AppEvent`s.
- **Visibility:** **all logged-in users** — the nav item is unfiltered.
- **Freshness:** **live fetch** on page load through a Netlify function. No Neon
  tables, no caching in v1.

## Planning Center API reference

- Base URL: `https://api.planningcenteronline.com/services/v2`
- Auth: HTTP Basic — `Authorization: Basic base64(PCO_APP_ID:PCO_SECRET)`.
- List service types: `GET /service_types`
- List a service type's upcoming plans:
  `GET /service_types/{serviceTypeId}/plans?filter=future&order=sort_date&per_page=N`
  — plan attributes include `title`, `series_title`, `sort_date`, `dates`.
- List a plan's order of service:
  `GET /service_types/{serviceTypeId}/plans/{planId}/items`
  — item attributes include `item_type` (`song` | `header` | `item` | `media`),
  `title`, `sequence`, `length` (seconds), `description`, `html_details`.
- Rate limit: ~100 requests/minute per organization (PAT). A 429 from PCO is
  mapped to a clean 503 by the function.

## Architecture

```
Worship.tsx ──GET /api/worship/plans──────────────────▶ Netlify function
                                                            │ HTTP Basic (PAT)
Worship.tsx ──GET /api/worship/plans/:stid/:pid/items─▶ Netlify function
                                                            ▼
                                  api.planningcenteronline.com/services/v2
```

The browser never receives the PCO credential. Both requests pass through the
existing Netlify function layer, which injects the Basic auth header
server-side. Read-only, live fetch — no Neon storage.

## Backend

**Functions** (`netlify/functions/`):

- `worship-plans.ts` — `GET /api/worship/plans`. Calls `requireAuth(req)` (any
  authenticated user), then fetches upcoming plans across the church's service
  types and returns a flattened, sorted list. Cap at the next ~10 plans.
  - Response: `{ id, serviceTypeId, serviceTypeName, title, seriesTitle, date }[]`
    sorted ascending by date.
- `worship-plan-items.ts` — `GET /api/worship/plans/:serviceTypeId/:planId/items`.
  Calls `requireAuth(req)`, then fetches that plan's items.
  - Response: `{ id, type, title, sequence, lengthSeconds, description }[]` in
    `sequence` order, where `type` is `song | header | item | media`.

A single router function may serve both paths if that fits the function
structure established by the backend foundation; otherwise two functions.

**Shared client** (`netlify/functions/_lib/pco.ts`):

- Reads `PCO_APP_ID` / `PCO_SECRET` from env; builds the Basic auth header.
- `pcoFetch(path)` — performs the `fetch`, throws a typed error on non-2xx so the
  calling function can map: PCO 429 → 503 "try again shortly"; missing creds →
  500 "Planning Center not configured"; other → 502.
- Handles PCO's JSON:API envelope (`data` / `included` / `attributes`) and
  pagination (`links.next`) where needed for the plans list.

**Config:**

- `netlify.toml` — ensure `/api/*` → functions redirect exists (added by the
  backend foundation; confirm before relying on it).
- New env vars `PCO_APP_ID`, `PCO_SECRET` added to `.env.example` (documented as
  "Personal Access Token from Planning Center → Developer → Personal Access
  Tokens") and to Netlify site env for production.

## Frontend

- `src/pages/Worship.tsx` — new page.
  - On mount, `GET /api/worship/plans`. Local `useState` status machine:
    `loading` → spinner, `error` → retry message, `ready` → list.
  - Renders upcoming plans: **date · service type · series/title**.
  - Selecting a plan loads its items via the items endpoint (expand-in-place or a
    sub-view) and renders the order of service.
  - Fetching lives **in the page component**, not `AppContext`. This is external,
    read-only data and is not part of `PersistedState`, so it stays out of the
    global store.
  - All spacing `rem`-based; reuse existing spinner / error / `Toast`
    conventions for accessibility consistency.
- `src/components/Layout.tsx` — add one nav item `{ to: '/worship', label:
  'Worship', icon: … }` to the `items` array, **unfiltered** (visible to all
  logged-in users).
- `src/App.tsx` — add the `/worship` route nested inside the existing
  `RequireAuth` + `Layout` wrapper.

## Order-of-service rendering

Items are shown in `sequence` order. `header` items act as section dividers; the
`song` / `item` / `media` entries beneath each header are grouped under it. For
each item display:

- **title**
- **item type** badge (Song / Header / Item / Media)
- **length** — seconds formatted as `m:ss` or "4 min"
- **description / notes** (plain text; `html_details` is out of scope for v1)

This is the default field set; trivially trimmed or extended.

## Errors, security & verification

**Security:**

- `PCO_APP_ID` / `PCO_SECRET` only in env, never in the client bundle. PAT is
  read-only scope.
- Both endpoints require a valid session (`requireAuth`); no anonymous access.

**Error handling:**

- Uniform `{ error: string }` JSON + status codes, matching the backend
  foundation convention (401 unauthenticated, 500/502/503 upstream).
- Client surfaces failures via the existing `Toast`; the plans-list failure shows
  a retry state.

**Verification** (no test runner; type-check is the gate per CLAUDE.md):

- `npm run lint` (`tsc -b`) stays clean.
- Manual QA:
  - Log in → open Worship → see upcoming plans sorted by date.
  - Open a plan → see its order of service in sequence.
  - Logged-out / no session → endpoints return 401.
  - Missing/invalid PCO creds → function returns a clean error; page shows the
    retry state (not a crash).

## Out of scope (v1)

- Caching / Neon storage of plan data; periodic refresh.
- Editing plans or writing anything back to Planning Center.
- Volunteer-scheduling sync (teams / positions / assignments).
- Song lyrics, chord charts, attachments, `html_details` rich content.
- Linking plans to FBVTS `ServiceTime`s / `AppEvent`s.
- Per-user OAuth.
