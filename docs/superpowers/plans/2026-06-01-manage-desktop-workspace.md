# Manage Desktop Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/manage` page into a desktop two-pane admin workspace (left rail switches section; right pane shows that section's Add button, an inline create/edit form, and the list with inline Edit/Delete), while leaving the mobile layout as today's stacked column.

**Architecture:** Decompose the current monolithic `Manage.tsx` into an orchestrator plus a `ManageRail` and three self-contained section components, all reusing the existing shared forms and `ConfirmDialog`. Responsiveness is pure Tailwind classes driven by one `activeSection` state: the rail is `hidden md:flex`, and each section wrapper is `block` (mobile shows all) but `md:block`/`md:hidden` based on whether it's the active section (desktop shows one). One small route-scoped change in `Layout.tsx` widens `<main>` on `/manage` only.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4, React Router v7. State in `localStorage` via `AppContext`.

> **No test runner exists in this project.** CLAUDE.md: the only "lint" is `tsc -b --noEmit` (`npm run lint`) and CI runs `npm run build`. Do **not** add a test framework. Each task is verified by (1) `npm run lint` passing and (2) the manual browser check described. Run `npm run dev` (http://localhost:5173) for manual checks; log in and switch to Manager via Profile.

---

## File Structure

- `src/components/manage/types.ts` — **create.** Shared types: `SectionKey`, `RailItem`, `RequestConfirm`.
- `src/components/manage/SectionCard.tsx` — **create.** Bordered section shell: title + optional action slot + children.
- `src/components/manage/ManageRail.tsx` — **create.** Desktop-only left rail of section buttons with count badges.
- `src/components/manage/CampusSection.tsx` — **create.** Add button + inline create/edit `CampusForm` + campus list + delete.
- `src/components/manage/ServiceSection.tsx` — **create.** Same for service times (`ServiceForm`).
- `src/components/manage/EventSection.tsx` — **create.** Same for events (`EventForm`).
- `src/pages/Manage.tsx` — **rewrite.** Orchestrator: role→sections, `activeSection` state, shared confirm, renders rail + sections responsively.
- `src/components/Layout.tsx` — **modify.** Route-scoped wider `<main>` on `/manage`.

**Existing interfaces this plan depends on (do not change them):**
- `CampusForm` props: `{ initial?: Campus; onSubmit: (d: { name: string; address: string }) => void; onDone?: () => void; onCancel?: () => void; submitLabel?: string }`
- `ServiceForm` props: `{ campuses: Campus[]; initial?: ServiceTime; existingSignups?: Signup[]; onSubmit: (d) => void; onDone?; onCancel?; submitLabel? }`
- `EventForm` props: `{ campuses: Campus[]; initial?: AppEvent; existingSignups?: Signup[]; onSubmit: (d) => void; onDone?; onCancel?; submitLabel? }`
- `ConfirmDialog` props: `{ open; title; message?; confirmLabel?; cancelLabel?; destructive?; onConfirm; onCancel }`
- `useApp()` provides: `isManager, isEventManager, campuses, serviceTimes, events, signups, addCampus, addServiceTime, addEvent, updateCampus, deleteCampus, updateServiceTime, deleteServiceTime, updateEvent, deleteEvent, campusName`.

---

## Task 1: Shared scaffolding (types, SectionCard, ManageRail)

**Files:**
- Create: `src/components/manage/types.ts`
- Create: `src/components/manage/SectionCard.tsx`
- Create: `src/components/manage/ManageRail.tsx`

- [ ] **Step 1: Create `src/components/manage/types.ts`**

```tsx
export type SectionKey = 'campuses' | 'services' | 'events'

export interface RailItem {
  key: SectionKey
  label: string
  count: number
}

export type RequestConfirm = (opts: {
  title: string
  message?: string
  onConfirm: () => void
}) => void
```

- [ ] **Step 2: Create `src/components/manage/SectionCard.tsx`**

```tsx
import type { ReactNode } from 'react'

/** Bordered section shell used in the Manage workspace: a title row with an
 *  optional action (e.g. the "+ Add" button) and the section body below. */
export function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 3: Create `src/components/manage/ManageRail.tsx`**

```tsx
import type { RailItem, SectionKey } from './types'

/** Desktop-only left rail. Hidden below md (mobile shows all sections stacked,
 *  so no section switcher is needed there). */
export function ManageRail({
  items,
  active,
  onSelect,
}: {
  items: RailItem[]
  active: SectionKey
  onSelect: (key: SectionKey) => void
}) {
  return (
    <nav
      aria-label="Manage sections"
      className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:self-start md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-2"
    >
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.count}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS (exit 0). These are leaf modules not yet imported anywhere — that is fine.

- [ ] **Step 5: Commit**

```bash
git add src/components/manage/types.ts src/components/manage/SectionCard.tsx src/components/manage/ManageRail.tsx
git commit -m "Add Manage workspace scaffolding: types, SectionCard, ManageRail"
```

---

## Task 2: Section components (Campus, Service, Event)

Each section owns its `+ Add` button (toggles an inline create form at the top), its list, per-row inline edit (form replaces the row), and per-row delete (routed through the shared confirm via a `requestConfirm` prop). `adding` and `editingId` are mutually exclusive local state.

**Files:**
- Create: `src/components/manage/CampusSection.tsx`
- Create: `src/components/manage/ServiceSection.tsx`
- Create: `src/components/manage/EventSection.tsx`

- [ ] **Step 1: Create `src/components/manage/CampusSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { CampusForm } from '../forms/CampusForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function CampusSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const { campuses, serviceTimes, events, addCampus, updateCampus, deleteCampus } =
    useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <SectionCard
      title="Campuses"
      action={
        adding ? undefined : (
          <button
            type="button"
            onClick={() => {
              setAdding(true)
              setEditingId(null)
            }}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Add campus
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <CampusForm
            onSubmit={addCampus}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {campuses.length === 0 ? (
        <p className="text-sm text-slate-400">No campuses yet.</p>
      ) : (
        <ul className="space-y-3">
          {campuses.map((c) => {
            const deps = serviceTimes.filter((s) => s.campusId === c.id).length
            const evs = events.filter((e) => e.campusId === c.id).length
            return (
              <li key={c.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === c.id ? (
                  <CampusForm
                    initial={c}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateCampus(c.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-sm text-slate-400">{c.address}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit campus ${c.name}`}
                      onClick={() => {
                        setEditingId(c.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete campus ${c.name}`}
                      onClick={() =>
                        requestConfirm({
                          title: `Delete ${c.name}?`,
                          message:
                            deps > 0 || evs > 0
                              ? `This campus has ${[
                                  deps > 0
                                    ? `${deps} service time${deps === 1 ? '' : 's'}`
                                    : null,
                                  evs > 0
                                    ? `${evs} event${evs === 1 ? '' : 's'}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' and ')}. All of them and their sign-ups will be removed.`
                              : undefined,
                          onConfirm: () => {
                            deleteCampus(c.id)
                            toast('Campus deleted')
                          },
                        })
                      }
                      className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
```

- [ ] **Step 2: Create `src/components/manage/ServiceSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { ServiceForm } from '../forms/ServiceForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function ServiceSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const {
    campuses,
    serviceTimes,
    signups,
    addServiceTime,
    updateServiceTime,
    deleteServiceTime,
    campusName,
  } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const signupsFor = (id: string) =>
    signups.filter((g) => g.kind === 'service' && g.refId === id)

  return (
    <SectionCard
      title="Service times"
      action={
        adding ? undefined : (
          <button
            type="button"
            onClick={() => {
              setAdding(true)
              setEditingId(null)
            }}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Add service time
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <ServiceForm
            campuses={campuses}
            onSubmit={addServiceTime}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {serviceTimes.length === 0 ? (
        <p className="text-sm text-slate-400">No service times yet.</p>
      ) : (
        <ul className="space-y-3">
          {serviceTimes.map((s) => {
            const signed = signupsFor(s.id)
            return (
              <li key={s.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === s.id ? (
                  <ServiceForm
                    campuses={campuses}
                    initial={s}
                    existingSignups={signed}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateServiceTime(s.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {s.dayOfWeek} {s.time}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {campusName(s.campusId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${s.dayOfWeek} ${s.time}`}
                      onClick={() => {
                        setEditingId(s.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${s.dayOfWeek} ${s.time} service time`}
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete this service time?',
                          message:
                            signed.length > 0
                              ? `${signed.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
                              : undefined,
                          onConfirm: () => {
                            deleteServiceTime(s.id)
                            toast('Service time deleted')
                          },
                        })
                      }
                      className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
```

- [ ] **Step 3: Create `src/components/manage/EventSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { EventForm } from '../forms/EventForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function EventSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const {
    campuses,
    events,
    signups,
    addEvent,
    updateEvent,
    deleteEvent,
    campusName,
  } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const signupsFor = (id: string) =>
    signups.filter((g) => g.kind === 'event' && g.refId === id)

  return (
    <SectionCard
      title="Events"
      action={
        adding ? undefined : (
          <button
            type="button"
            onClick={() => {
              setAdding(true)
              setEditingId(null)
            }}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            + Create event
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <EventForm
            campuses={campuses}
            onSubmit={addEvent}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-slate-400">No events yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const signed = signupsFor(e.id)
            return (
              <li key={e.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === e.id ? (
                  <EventForm
                    campuses={campuses}
                    initial={e}
                    existingSignups={signed}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateEvent(e.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.name}</p>
                      <p className="truncate text-sm text-slate-400">
                        {e.date} · {campusName(e.campusId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${e.name}`}
                      onClick={() => {
                        setEditingId(e.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${e.name}`}
                      onClick={() =>
                        requestConfirm({
                          title: `Delete ${e.name}?`,
                          message:
                            signed.length > 0
                              ? `${signed.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
                              : undefined,
                          onConfirm: () => {
                            deleteEvent(e.id)
                            toast('Event deleted')
                          },
                        })
                      }
                      className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS (exit 0). Not yet imported by a page — fine.

- [ ] **Step 5: Commit**

```bash
git add src/components/manage/CampusSection.tsx src/components/manage/ServiceSection.tsx src/components/manage/EventSection.tsx
git commit -m "Add Manage section components with inline create/edit/delete"
```

---

## Task 3: Orchestrator + responsive wiring + widened layout

**Files:**
- Rewrite: `src/pages/Manage.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Rewrite `src/pages/Manage.tsx` entirely with:**

```tsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ManageRail } from '../components/manage/ManageRail'
import { CampusSection } from '../components/manage/CampusSection'
import { ServiceSection } from '../components/manage/ServiceSection'
import { EventSection } from '../components/manage/EventSection'
import type { RailItem, SectionKey } from '../components/manage/types'

export function Manage() {
  const { isManager, isEventManager, campuses, serviceTimes, events } = useApp()
  const [active, setActive] = useState<SectionKey>(isManager ? 'campuses' : 'events')
  const [confirm, setConfirm] = useState<{
    title: string
    message?: string
    onConfirm: () => void
  } | null>(null)

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  const sections: RailItem[] = isManager
    ? [
        { key: 'campuses', label: 'Campuses', count: campuses.length },
        { key: 'services', label: 'Service times', count: serviceTimes.length },
        { key: 'events', label: 'Events', count: events.length },
      ]
    : [{ key: 'events', label: 'Events', count: events.length }]

  const requestConfirm = (opts: {
    title: string
    message?: string
    onConfirm: () => void
  }) => setConfirm(opts)

  // Mobile: every section is `block` (full stacked layout, rail hidden).
  // Desktop: only the active section is shown.
  const vis = (key: SectionKey) =>
    `block ${active === key ? 'md:block' : 'md:hidden'}`

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Manage</h2>

      <div className="md:flex md:gap-6">
        <ManageRail items={sections} active={active} onSelect={setActive} />

        <div className="mt-4 space-y-6 md:mt-0 md:min-w-0 md:flex-1 md:space-y-0">
          {isManager && (
            <div className={vis('campuses')}>
              <CampusSection requestConfirm={requestConfirm} />
            </div>
          )}
          {isManager && (
            <div className={vis('services')}>
              <ServiceSection requestConfirm={requestConfirm} />
            </div>
          )}
          <div className={vis('events')}>
            <EventSection requestConfirm={requestConfirm} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        onConfirm={() => {
          confirm?.onConfirm()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Widen `<main>` on `/manage` in `src/components/Layout.tsx`**

First, update the import on line 1 from:

```tsx
import { NavLink, Outlet } from 'react-router-dom'
```

to:

```tsx
import { NavLink, Outlet, useLocation } from 'react-router-dom'
```

Next, inside the `Layout` function, find the line:

```tsx
  const { currentUser, isEventManager } = useApp()
```

and add immediately after it:

```tsx
  const { pathname } = useLocation()
```

Finally, replace the `<main>` opening tag (currently):

```tsx
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-12">
```

with:

```tsx
        <main
          className={`mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-12 ${
            pathname === '/manage' ? 'md:max-w-6xl' : ''
          }`}
        >
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS (exit 0). No unused imports; `RailItem`/`SectionKey` are used.

- [ ] **Step 4: Full build**

Run: `npm run build`
Expected: PASS (tsc project refs + vite build, exit 0).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in, switch to **Manager** via Profile, open Manage.
- **Desktop (window ≥ 768px wide):** the page is wider than other pages; a left rail shows Campuses / Service times / Events with count badges; clicking a rail item swaps the right pane to that section and highlights the active item. In a section: `+ Add` expands the create form inline at the top; submitting adds the item and the form closes. A row's `Edit` expands the edit form in place; saving updates the row and the count badge. `Delete` opens the shared confirm with the correct cascade message; confirming removes the item (and for a campus, its services/events + their sign-ups). Add a sign-up first (from a detail page) to verify the delete/edit messages show counts.
- **Event Manager role:** the rail shows only **Events**; no campus/service sections; create/edit/delete events works.
- **Mobile (window < 768px):** the rail is hidden and all available sections render stacked with their forms + lists (today's behavior); everything functions.
- **Other pages unaffected:** Home / My Schedule / Profile keep their normal (narrower) width.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Manage.tsx src/components/Layout.tsx
git commit -m "Rebuild Manage page as desktop two-pane workspace"
```

---

## Self-Review Notes

- **Spec coverage:** §1 responsive single-render-tree → Task 3 `vis()` + rail `hidden md:flex`. Widening → Task 3 Step 2 (route-scoped `md:max-w-6xl`). §2 components → Tasks 1 (types/SectionCard/ManageRail) & 2 (three sections); orchestrator → Task 3. §3 role gating → Task 3 (`sections` array + default `active` + access-denied guard). §4 removals (footers, detail-page Edit links, amber note) → all absent from the Task 3 rewrite; empty states preserved per section in Task 2. Inline edit for services/events → Task 2 (`editingId` + form with `initial`).
- **Type consistency:** `SectionKey`/`RailItem`/`RequestConfirm` defined once in `manage/types.ts` (Task 1), imported by `ManageRail` (Task 1), the three sections (Task 2, `RequestConfirm`), and `Manage` (Task 3, `RailItem`/`SectionKey`). The `requestConfirm` object shape matches the `confirm` state shape in `Manage` and the `ConfirmDialog` wiring. Form props used match the documented existing interfaces.
- **No new context/actions/types** — confirmed; only existing `useApp()` values are consumed.
- **Detail pages untouched** — the previously-added detail-page edit/delete remains; this plan does not modify `ServiceDetail.tsx`/`EventDetail.tsx`.
