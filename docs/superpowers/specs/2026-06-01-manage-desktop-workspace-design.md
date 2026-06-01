# Manage Desktop Workspace — Design

**Date:** 2026-06-01
**Status:** Approved (design), pending implementation plan
**Scope:** Redesign the `/manage` page into a desktop-first two-pane admin workspace.
This is a **layout/interaction redesign** of an existing page — it reuses the existing
forms, context actions, and `ConfirmDialog`. It is not a new feature and adds no new
data or context actions.

## Goal

Today `/manage` is a single narrow column (`max-w-3xl`) stacking six cards: three
always-expanded create forms (campus, service time, event) followed by three "Existing
…" lists. It works on mobile but on a wide desktop it wastes horizontal space and buries
the management lists beneath the forms. Redesign the **desktop** experience into a
two-pane workspace that flows well for an administrator, while leaving the **mobile**
experience as today's stacked column.

## Decisions locked during brainstorming

- **Shape:** two-pane workspace (left rail + right content pane).
- **Add/Edit interaction:** inline panel (B1) — the form expands at the top of the right
  pane; no overlay/drawer, no navigation.
- **Service/event editing:** happens **inline in the workspace** (reusing the shared
  forms), extending today's campus-only inline edit. The detail pages remain for viewing
  the roster.
- **Event Manager rail:** show only the **Events** section (campuses/service times hidden,
  matching existing gating). Managers see all three.
- **Responsiveness:** two-pane only at `md+`. Below `md`, keep today's stacked layout.

## 1. Responsive structure (single render tree)

One `activeSection` state of type `'campuses' | 'services' | 'events'`, defaulting to the
first section available to the user (Managers → `'campuses'`; Event Managers → `'events'`).

- **Left rail:** `hidden md:flex` — only present on desktop.
- **Sections:** all available sections are rendered. Each section wrapper uses classes
  `` `block ${isActive ? 'md:block' : 'md:hidden'}` ``. Result:
  - Mobile (`< md`): every section is `block` → today's full stacked layout (the rail is
    hidden, `activeSection` is irrelevant).
  - Desktop (`md+`): only the active section is `md:block`; the rest are `md:hidden` → the
    right pane shows exactly one section, switched by the rail.

No JS media-query hook is needed; the responsive behavior is pure Tailwind classes plus
the `activeSection` state that only matters at `md+`.

Layout container at `md+`: `md:flex md:gap-6`, rail `md:w-56` (rem-based), sections area
`md:flex-1 md:min-w-0`. The page keeps its `Manage` `<h2>` heading above the two panes.

### Widening the content area (route-scoped Layout change)
`Layout.tsx`'s `<main>` hard-caps content at `max-w-3xl` (48rem), and a child cannot
visually exceed its parent's width — so the two-pane workspace genuinely needs `<main>` to
be wider on `/manage`. The decision: make `<main>`'s max-width **route-aware** using
`useLocation()`:
- On `/manage`: `max-w-6xl` (72rem) — room for the rail + a comfortable right pane.
- All other routes: unchanged `max-w-3xl`.

Concretely, in `Layout.tsx`: `const { pathname } = useLocation()` and apply
`` `mx-auto w-full flex-1 px-4 … ${pathname === '/manage' ? 'md:max-w-6xl' : 'max-w-3xl'}` ``.
This is a small, additive, route-scoped change; Home/Schedule/Profile keep `max-w-3xl`
exactly as today. (Mobile is unaffected — `max-w-*` only matters once the viewport exceeds
it, and the mobile Manage layout is the stacked column regardless.)

## 2. Components

Decompose so each file has one clear responsibility (current `Manage.tsx` is ~290 lines
and mixes everything; this redesign is a good moment to split it).

- `src/pages/Manage.tsx` — **orchestrator.** Reads context, computes the list of sections
  available to the current role, owns `activeSection` state and the single shared
  `confirm` state, renders the heading, `ManageRail`, and the section components. Passes a
  `requestConfirm(opts)` callback down so sections can trigger deletes through the one
  shared `ConfirmDialog`. Renders that `ConfirmDialog` once at the page level.

- `src/components/manage/ManageRail.tsx` — the desktop left rail. Props: the available
  sections (`{ key, label, count }[]`), `activeSection`, `onSelect`. Renders one button per
  section with a count badge; highlights the active one (brand teal). `hidden md:flex`.
  Accessible: buttons with `aria-current` on the active item.

- `src/components/manage/CampusSection.tsx` — owns: an `+ Add campus` button that toggles an
  inline `CampusForm` (create), the campus list, per-row inline edit (`CampusForm` with
  `initial`, via an `editingId` local state), and per-row delete (calls `requestConfirm`
  with the cascade message). Manager-only (the orchestrator won't render it for event
  managers, but it also internally assumes manager access).

- `src/components/manage/ServiceSection.tsx` — same pattern for service times. Inline create
  + inline edit (`ServiceForm` with `initial` and `existingSignups` for the drop-positions
  confirm). Per-row delete via `requestConfirm` (signup-count message). Manager-only.

- `src/components/manage/EventSection.tsx` — same pattern for events using `EventForm`.
  Visible to all event managers.

Shared bits:
- The `Card`-style section container (`rounded-2xl border …`) can be a small local wrapper
  in each section or a shared `manage/SectionCard.tsx`. The plan will choose; keep it DRY.
- `requestConfirm` type: `(opts: { title: string; message?: string; onConfirm: () => void }) => void`.

### Inline form behavior (B1)
- Each section tracks `adding: boolean` and `editingId: string | null` (mutually exclusive
  — opening one closes the other). The `+ Add` button toggles `adding`. A row's `Edit`
  button sets `editingId` to that row's id and renders the form (pre-filled) **in place of
  that row** (campuses already do this) — for services/events the form renders at the row.
  - Decision for consistency: the create form expands **at the top of the list**; an edit
    form replaces **its own row** in place. This matches today's campus behavior and keeps
    the edited item where the user clicked.
- On submit/cancel/done, the form closes (`adding=false` / `editingId=null`). Forms already
  call `onDone`/`onCancel`; sections wire those to clear local state. Toasts are already
  emitted by the forms.

## 3. Role gating

- Orchestrator builds the sections array:
  - `isManager` → `[campuses, services, events]`
  - else (`isEventManager` only) → `[events]`
  - not `isEventManager` → the existing access-denied message (unchanged).
- `activeSection` defaults to `sections[0].key`.
- The old amber "only Managers can add campuses and service times" note is **removed** — an
  event manager simply has no rail entries for those sections, so there is nothing to
  explain.

## 4. What is removed / changed from today

- The three "X service times configured / events scheduled" footer lines are **removed**;
  the rail count badges convey the same information.
- Service/event "Edit" `<Link>`s to detail pages are **replaced** by inline edit buttons.
  The detail-page edit/delete added previously remains intact and untouched (a manager can
  still edit from the detail page; the roster lives there).
- Empty states ("No campuses yet." etc.) are preserved per section.

## 5. Out of scope

- Any dashboard/stat tiles, staffing-gap indicators (that's the separately-planned staffing
  oversight feature).
- Changing the mobile layout beyond what naturally falls out of the shared section
  components (mobile stays a stacked column).
- Changes to `AppContext`, `types.ts`, the shared forms' internals, or `ConfirmDialog`.
- Changing `Layout.tsx`'s `max-w-3xl` for routes **other than** `/manage` (the only Layout
  change is the route-scoped wider container for `/manage`; all other routes are untouched).

## 6. Files touched

- Create: `src/components/manage/ManageRail.tsx`
- Create: `src/components/manage/CampusSection.tsx`
- Create: `src/components/manage/ServiceSection.tsx`
- Create: `src/components/manage/EventSection.tsx`
- (Optional) Create: `src/components/manage/SectionCard.tsx` (shared section wrapper)
- Rewrite: `src/pages/Manage.tsx` (orchestrator; much smaller)
- Modify: `src/components/Layout.tsx` (route-scoped wider `<main>` for `/manage` only)

## 7. Verification

- `npm run lint` (tsc) and `npm run build` stay clean — the type-check/build is the CI gate.
- Manual (desktop ≥ md): rail switches sections; counts correct; `+ Add` expands the create
  form inline; row Edit expands the edit form in place and saving updates the list; Delete
  shows the shared confirm with correct cascade message; Event Manager sees only Events.
- Manual (mobile < md): the page still shows the stacked sections with forms + lists, rail
  hidden, everything functional as before.
