# Manager Edit & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let managers edit and delete campuses, service times, and events — including adding/removing positions on items that already exist — with safe confirm-then-cascade deletes.

**Architecture:** Add six mutating actions to the single `AppContext` source of truth (cascade pruning of dependent signups handled there). Extract the existing create forms into shared `src/components/forms/` components that handle both create and edit via an optional `initial` prop. Add a reusable `ConfirmDialog` modal. Wire edit/delete into both the detail pages (inline edit) and the Manage page (existing-item lists).

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4, React Router v7, all state in `localStorage` via `AppContext`.

> **No test runner exists in this project.** CLAUDE.md: the only "lint" is `tsc -b --noEmit` (`npm run lint`) and CI runs `npm run build`. Do **not** add a test framework. Each task is verified by (1) `npm run lint` passing and (2) the manual browser check described in the task. Run `npm run dev` (http://localhost:5173) for manual checks. Demo logins are available on the Login page; switch your role via Profile to reach Manager.

---

## File Structure

- `src/context/AppContext.tsx` — **modify.** Add `updateCampus`, `deleteCampus`, `updateServiceTime`, `deleteServiceTime`, `updateEvent`, `deleteEvent` to the interface and the value object.
- `src/components/ConfirmDialog.tsx` — **create.** Generic controlled confirm modal.
- `src/components/forms/PositionsEditor.tsx` — **create** (moved out of `Manage.tsx`). Also exports `uid`.
- `src/components/forms/CampusForm.tsx` — **create.** Create + edit.
- `src/components/forms/ServiceForm.tsx` — **create.** Create + edit, with save-time drop confirm.
- `src/components/forms/EventForm.tsx` — **create.** Create + edit, with save-time drop confirm.
- `src/pages/Manage.tsx` — **modify.** Use shared forms; add existing-item lists with edit/delete.
- `src/pages/ServiceDetail.tsx` — **modify.** Manager edit/delete row + inline edit.
- `src/pages/EventDetail.tsx` — **modify.** Event-manager edit/delete row + inline edit.

---

## Task 1: Context actions (data layer)

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Add the six action signatures to the `AppContextValue` interface**

In `src/context/AppContext.tsx`, find the `// manager actions` group in the `AppContextValue` interface (the block with `addCampus`, `addServiceTime`, `addEvent`). Add these signatures immediately after `addEvent`'s signature (before the `// signups` comment):

```ts
  updateCampus: (id: string, patch: { name: string; address: string }) => void
  deleteCampus: (id: string) => void
  updateServiceTime: (
    id: string,
    patch: {
      campusId: string
      dayOfWeek: string
      time: string
      positions: Position[]
    },
  ) => void
  deleteServiceTime: (id: string) => void
  updateEvent: (
    id: string,
    patch: {
      name: string
      campusId: string
      date: string
      time: string
      positions: Position[]
    },
  ) => void
  deleteEvent: (id: string) => void
```

- [ ] **Step 2: Implement the actions in the value object**

In the same file, in the object returned by `useMemo`, find the `addEvent: (data) => ...` implementation. Immediately after it (before `signUp:`), add:

```ts
      updateCampus: (id, patch) =>
        setState((s) => ({
          ...s,
          campuses: s.campuses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCampus: (id) =>
        setState((s) => {
          const removedServiceIds = s.serviceTimes
            .filter((st) => st.campusId === id)
            .map((st) => st.id)
          const removedEventIds = s.events
            .filter((e) => e.campusId === id)
            .map((e) => e.id)
          return {
            ...s,
            campuses: s.campuses.filter((c) => c.id !== id),
            serviceTimes: s.serviceTimes.filter((st) => st.campusId !== id),
            events: s.events.filter((e) => e.campusId !== id),
            signups: s.signups.filter((g) =>
              g.kind === 'service'
                ? !removedServiceIds.includes(g.refId)
                : !removedEventIds.includes(g.refId),
            ),
          }
        }),
      updateServiceTime: (id, patch) =>
        setState((s) => {
          const validPositionIds = patch.positions.map((p) => p.id)
          return {
            ...s,
            serviceTimes: s.serviceTimes.map((st) =>
              st.id === id ? { ...st, ...patch } : st,
            ),
            signups: s.signups.filter((g) =>
              g.kind === 'service' && g.refId === id
                ? validPositionIds.includes(g.positionId)
                : true,
            ),
          }
        }),
      deleteServiceTime: (id) =>
        setState((s) => ({
          ...s,
          serviceTimes: s.serviceTimes.filter((st) => st.id !== id),
          signups: s.signups.filter(
            (g) => !(g.kind === 'service' && g.refId === id),
          ),
        })),
      updateEvent: (id, patch) =>
        setState((s) => {
          const validPositionIds = patch.positions.map((p) => p.id)
          return {
            ...s,
            events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
            signups: s.signups.filter((g) =>
              g.kind === 'event' && g.refId === id
                ? validPositionIds.includes(g.positionId)
                : true,
            ),
          }
        }),
      deleteEvent: (id) =>
        setState((s) => ({
          ...s,
          events: s.events.filter((e) => e.id !== id),
          signups: s.signups.filter(
            (g) => !(g.kind === 'event' && g.refId === id),
          ),
        })),
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS (exit 0, no type errors). `Position` is already imported in this file.

- [ ] **Step 4: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "Add manager edit/delete actions to AppContext"
```

---

## Task 2: ConfirmDialog component

**Files:**
- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ConfirmDialog.tsx`:

```tsx
import { useEffect } from 'react'

/**
 * Generic confirm modal. Mobile-first bottom sheet that centers on sm+.
 * Large tap targets and Escape-to-cancel for accessibility. Render it
 * unconditionally and toggle with `open` — it returns null when closed.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{title}</h3>
        {message && <p className="mt-2 text-slate-600">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 font-semibold text-white ${
              destructive
                ? 'bg-red-600 active:bg-red-700'
                : 'bg-brand-600 active:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS. (The component is not yet imported anywhere; that's fine — it's a leaf used in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "Add reusable ConfirmDialog modal"
```

---

## Task 3: Extract shared forms (create + edit capable)

This moves `PositionsEditor`, `CampusForm`, `ServiceForm`, and `EventForm` out of `Manage.tsx` into `src/components/forms/`, adds an optional `initial` prop so each handles edit, and (for service/event) adds a save-time confirm when an edit drops volunteer signups. `Manage.tsx` is updated to import them. The `Card` wrapper and the create-mode footer stay in `Manage.tsx` (the forms render only fields + buttons).

**Files:**
- Create: `src/components/forms/PositionsEditor.tsx`
- Create: `src/components/forms/CampusForm.tsx`
- Create: `src/components/forms/ServiceForm.tsx`
- Create: `src/components/forms/EventForm.tsx`
- Modify: `src/pages/Manage.tsx`

- [ ] **Step 1: Create `PositionsEditor.tsx`**

Create `src/components/forms/PositionsEditor.tsx` (logic identical to the current editor in `Manage.tsx`, plus an exported `uid`):

```tsx
import type { Position } from '../../types'

/** Short client-side id for new positions added in the editor. */
export const uid = () => Math.random().toString(36).slice(2, 8)

export function PositionsEditor({
  positions,
  setPositions,
}: {
  positions: Position[]
  setPositions: (p: Position[]) => void
}) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-600">Positions</span>
      {positions.map((p, i) => (
        <div key={p.id} className="flex gap-2">
          <input
            value={p.title}
            onChange={(e) =>
              setPositions(
                positions.map((x, j) =>
                  j === i ? { ...x, title: e.target.value } : x,
                ),
              )
            }
            placeholder="Role title"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            type="number"
            min={1}
            value={p.needed}
            onChange={(e) =>
              setPositions(
                positions.map((x, j) =>
                  j === i ? { ...x, needed: Math.max(1, +e.target.value) } : x,
                ),
              )
            }
            className="w-20 rounded-xl border border-slate-300 px-3 py-2.5"
            aria-label="Spots needed"
          />
          <button
            type="button"
            onClick={() => setPositions(positions.filter((_, j) => j !== i))}
            className="rounded-xl border border-slate-300 px-3 text-slate-500"
            aria-label="Remove position"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPositions([...positions, { id: uid(), title: '', needed: 1 }])}
        className="text-sm font-semibold text-brand-700"
      >
        + Add position
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `CampusForm.tsx`**

Create `src/components/forms/CampusForm.tsx`:

```tsx
import { useState } from 'react'
import { useToast } from '../Toast'
import type { Campus } from '../../types'

export function CampusForm({
  initial,
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add campus',
}: {
  initial?: Campus
  onSubmit: (d: { name: string; address: string }) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const toast = useToast()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSubmit({ name: name.trim(), address: address.trim() })
        toast(initial ? 'Campus updated' : `Campus "${name.trim()}" added`)
        if (!initial) {
          setName('')
          setAddress('')
        }
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Campus name"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button className="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `ServiceForm.tsx`**

Create `src/components/forms/ServiceForm.tsx`. In edit mode it computes how many signups would be dropped (positions removed since `initial`) and routes the submit through `ConfirmDialog` first.

```tsx
import { useState } from 'react'
import { useToast } from '../Toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { PositionsEditor, uid } from './PositionsEditor'
import type { Campus, Position, ServiceTime, Signup } from '../../types'

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

type ServiceData = {
  campusId: string
  dayOfWeek: string
  time: string
  positions: Position[]
}

export function ServiceForm({
  campuses,
  initial,
  existingSignups = [],
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add service time',
}: {
  campuses: Campus[]
  initial?: ServiceTime
  existingSignups?: Signup[]
  onSubmit: (d: ServiceData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [campusId, setCampusId] = useState(
    initial?.campusId ?? campuses[0]?.id ?? '',
  )
  const [dayOfWeek, setDay] = useState(initial?.dayOfWeek ?? 'Sunday')
  const [time, setTime] = useState(initial?.time ?? '')
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [{ id: uid(), title: 'Greeter', needed: 2 }],
  )
  const [pending, setPending] = useState<ServiceData | null>(null)
  const toast = useToast()

  const commit = (data: ServiceData) => {
    onSubmit(data)
    toast(initial ? 'Service updated' : `${dayOfWeek} ${data.time} service added`)
    if (!initial) {
      setTime('')
      setPositions([{ id: uid(), title: 'Greeter', needed: 2 }])
    }
    onDone?.()
  }

  const droppedSignups = (data: ServiceData) => {
    const keep = new Set(data.positions.map((p) => p.id))
    return existingSignups.filter((g) => !keep.has(g.positionId)).length
  }

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!campusId || !time.trim()) return
          const data: ServiceData = {
            campusId,
            dayOfWeek,
            time: time.trim(),
            positions: positions.filter((p) => p.title.trim()),
          }
          if (initial && droppedSignups(data) > 0) {
            setPending(data)
          } else {
            commit(data)
          }
        }}
      >
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDay(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          >
            {DAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="9:00 AM"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </div>
        <PositionsEditor positions={positions} setPositions={setPositions} />
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button className="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
            {submitLabel}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={pending !== null}
        title="Remove positions?"
        message={
          pending
            ? `${droppedSignups(pending)} volunteer sign-up(s) are on positions you removed. Saving will drop them.`
            : undefined
        }
        confirmLabel="Save"
        onConfirm={() => {
          if (pending) commit(pending)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
```

- [ ] **Step 4: Create `EventForm.tsx`**

Create `src/components/forms/EventForm.tsx`:

```tsx
import { useState } from 'react'
import { useToast } from '../Toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { PositionsEditor, uid } from './PositionsEditor'
import type { AppEvent, Campus, Position, Signup } from '../../types'

type EventData = {
  name: string
  campusId: string
  date: string
  time: string
  positions: Position[]
}

export function EventForm({
  campuses,
  initial,
  existingSignups = [],
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Create event',
}: {
  campuses: Campus[]
  initial?: AppEvent
  existingSignups?: Signup[]
  onSubmit: (d: EventData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [campusId, setCampusId] = useState(
    initial?.campusId ?? campuses[0]?.id ?? '',
  )
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [{ id: uid(), title: 'Volunteer', needed: 4 }],
  )
  const [pending, setPending] = useState<EventData | null>(null)
  const toast = useToast()

  const commit = (data: EventData) => {
    onSubmit(data)
    toast(initial ? 'Event updated' : `Event "${data.name}" created`)
    if (!initial) {
      setName('')
      setDate('')
      setTime('')
      setPositions([{ id: uid(), title: 'Volunteer', needed: 4 }])
    }
    onDone?.()
  }

  const droppedSignups = (data: EventData) => {
    const keep = new Set(data.positions.map((p) => p.id))
    return existingSignups.filter((g) => !keep.has(g.positionId)).length
  }

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !campusId || !date) return
          const data: EventData = {
            name: name.trim(),
            campusId,
            date,
            time: time.trim() || 'TBD',
            positions: positions.filter((p) => p.title.trim()),
          }
          if (initial && droppedSignups(data) > 0) {
            setPending(data)
          } else {
            commit(data)
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="8:00 AM"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </div>
        <PositionsEditor positions={positions} setPositions={setPositions} />
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button className="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
            {submitLabel}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={pending !== null}
        title="Remove positions?"
        message={
          pending
            ? `${droppedSignups(pending)} volunteer sign-up(s) are on positions you removed. Saving will drop them.`
            : undefined
        }
        confirmLabel="Save"
        onConfirm={() => {
          if (pending) commit(pending)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
```

- [ ] **Step 5: Rewrite `Manage.tsx` to use the shared forms**

Replace the entire contents of `src/pages/Manage.tsx` with the following. (The existing-item lists are added in Task 5; this step only switches the create section to the shared forms, keeping current behavior and the footers.)

```tsx
import { useApp } from '../context/AppContext'
import { CampusForm } from '../components/forms/CampusForm'
import { ServiceForm } from '../components/forms/ServiceForm'
import { EventForm } from '../components/forms/EventForm'

export function Manage() {
  const {
    isManager,
    isEventManager,
    campuses,
    addCampus,
    addServiceTime,
    addEvent,
    serviceTimes,
    events,
  } = useApp()

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage</h2>

      {isManager && (
        <>
          <Card title="Add a campus">
            <CampusForm onSubmit={addCampus} />
          </Card>

          <Card title="Add a service time">
            <ServiceForm campuses={campuses} onSubmit={addServiceTime} />
            <p className="mt-3 text-center text-xs text-slate-400">
              {serviceTimes.length} service times configured
            </p>
          </Card>
        </>
      )}

      <Card title="Create an event">
        <EventForm campuses={campuses} onSubmit={addEvent} />
        <p className="mt-3 text-center text-xs text-slate-400">
          {events.length} events scheduled
        </p>
      </Card>

      {!isManager && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Note: only <strong>Managers</strong> can add campuses and service times.
          As an Event Manager you can create events.
        </p>
      )}
    </div>
  )
}

export function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children}
    </section>
  )
}
```

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: PASS. No remaining references to the old in-file `PositionsEditor`/`CampusForm`/`ServiceForm`/`EventForm` (they were removed when the file was replaced). `Card` is now exported for reuse in Task 5.

- [ ] **Step 7: Manual check**

Run `npm run dev`, log in, switch to Manager via Profile, open Manage. Confirm all three create forms still work (add a campus, add a service time, create an event) and the footers still show counts. Behavior should be unchanged from before.

- [ ] **Step 8: Commit**

```bash
git add src/components/forms src/pages/Manage.tsx
git commit -m "Extract create forms into shared create/edit components"
```

---

## Task 4: Edit & delete on the detail pages

**Files:**
- Modify: `src/pages/ServiceDetail.tsx`
- Modify: `src/pages/EventDetail.tsx`

- [ ] **Step 1: Rewrite `ServiceDetail.tsx`**

Replace the entire contents of `src/pages/ServiceDetail.tsx` with:

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'
import { Roster } from '../components/Roster'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ServiceForm } from '../components/forms/ServiceForm'
import { useToast } from '../components/Toast'

export function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    serviceTimes,
    campuses,
    signups,
    isManager,
    updateServiceTime,
    deleteServiceTime,
  } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const service = serviceTimes.find((s) => s.id === id)
  if (!service) return <NotFound />

  const campus = campuses.find((c) => c.id === service.campusId)
  const existingSignups = signups.filter(
    (g) => g.kind === 'service' && g.refId === service.id,
  )

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All services
      </Link>

      {editing ? (
        <section className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 text-lg font-bold">Edit service time</h3>
          <ServiceForm
            campuses={campuses}
            initial={service}
            existingSignups={existingSignups}
            submitLabel="Save changes"
            onSubmit={(d) => updateServiceTime(service.id, d)}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-bold">
            {service.dayOfWeek} {service.time}
          </h2>
          <p className="mb-1 text-slate-500">{campus?.name}</p>
          <p className="mb-3 text-sm text-slate-400">{campus?.address}</p>

          {isManager && (
            <div className="mb-5 flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 active:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 active:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}

          <h3 className="mb-3 text-lg font-bold">Positions</h3>
          <PositionList
            kind="service"
            refId={service.id}
            positions={service.positions}
          />
          <Roster kind="service" refId={service.id} positions={service.positions} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this service time?"
        message={
          existingSignups.length > 0
            ? `${existingSignups.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
            : undefined
        }
        onConfirm={() => {
          deleteServiceTime(service.id)
          toast('Service time deleted')
          navigate('/')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="py-10 text-center text-slate-500">
      <p>That service couldn’t be found.</p>
      <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
        Back home
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `EventDetail.tsx`**

Replace the entire contents of `src/pages/EventDetail.tsx` with:

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'
import { Roster } from '../components/Roster'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EventForm } from '../components/forms/EventForm'
import { useToast } from '../components/Toast'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    events,
    campuses,
    users,
    signups,
    isEventManager,
    updateEvent,
    deleteEvent,
  } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const event = events.find((e) => e.id === id)
  if (!event) {
    return (
      <div className="py-10 text-center text-slate-500">
        <p>That event couldn’t be found.</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
          Back home
        </Link>
      </div>
    )
  }

  const campus = campuses.find((c) => c.id === event.campusId)
  const manager = users.find((u) => u.id === event.managerId)
  const existingSignups = signups.filter(
    (g) => g.kind === 'event' && g.refId === event.id,
  )

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All events
      </Link>

      {editing ? (
        <section className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 text-lg font-bold">Edit event</h3>
          <EventForm
            campuses={campuses}
            initial={event}
            existingSignups={existingSignups}
            submitLabel="Save changes"
            onSubmit={(d) => updateEvent(event.id, d)}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-bold">{event.name}</h2>
          <p className="text-slate-500">
            {formatDate(event.date)} · {event.time}
          </p>
          <p className="text-sm text-slate-400">{campus?.name}</p>
          {manager && (
            <p className="mt-1 text-sm text-slate-400">
              Event Manager: {manager.name}
            </p>
          )}

          {isEventManager && (
            <div className="mb-5 mt-3 flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 active:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 active:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}

          <h3 className="mb-3 mt-4 text-lg font-bold">Positions</h3>
          <PositionList kind="event" refId={event.id} positions={event.positions} />
          <Roster kind="event" refId={event.id} positions={event.positions} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        message={
          existingSignups.length > 0
            ? `${existingSignups.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
            : undefined
        }
        onConfirm={() => {
          deleteEvent(event.id)
          toast('Event deleted')
          navigate('/')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run `npm run dev` as a Manager:
- Open a service detail → **Edit** → change the time and add a position → Save → detail reflects changes.
- Sign a volunteer up (via the position), then **Edit** → remove that position → Save → confirm dialog appears citing the dropped sign-up → confirm → roster no longer shows that position/sign-up.
- **Delete** a service that has sign-ups → confirm dialog cites the count → confirm → redirected home, service gone, and its sign-ups gone from My Schedule.
- Repeat on an event. As a regular volunteer, confirm no Edit/Delete buttons appear.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ServiceDetail.tsx src/pages/EventDetail.tsx
git commit -m "Add inline edit and delete to service/event detail pages"
```

---

## Task 5: Existing-item lists on the Manage page

Adds the "Both" placement: lists of existing campuses (edit inline + delete), service times (link to detail to edit + delete), and events (link to detail to edit + delete).

**Files:**
- Modify: `src/pages/Manage.tsx`

- [ ] **Step 1: Replace `Manage.tsx` with the full version including lists**

Replace the entire contents of `src/pages/Manage.tsx` with:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CampusForm } from '../components/forms/CampusForm'
import { ServiceForm } from '../components/forms/ServiceForm'
import { EventForm } from '../components/forms/EventForm'

export function Manage() {
  const {
    isManager,
    isEventManager,
    campuses,
    serviceTimes,
    events,
    signups,
    addCampus,
    addServiceTime,
    addEvent,
    updateCampus,
    deleteCampus,
    deleteServiceTime,
    deleteEvent,
    campusName,
  } = useApp()
  const toast = useToast()

  const [editingCampusId, setEditingCampusId] = useState<string | null>(null)
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

  const serviceSignupCount = (serviceId: string) =>
    signups.filter((g) => g.kind === 'service' && g.refId === serviceId).length
  const eventSignupCount = (eventId: string) =>
    signups.filter((g) => g.kind === 'event' && g.refId === eventId).length

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage</h2>

      {isManager && (
        <>
          <Card title="Add a campus">
            <CampusForm onSubmit={addCampus} />
          </Card>

          <Card title="Add a service time">
            <ServiceForm campuses={campuses} onSubmit={addServiceTime} />
            <p className="mt-3 text-center text-xs text-slate-400">
              {serviceTimes.length} service times configured
            </p>
          </Card>
        </>
      )}

      <Card title="Create an event">
        <EventForm campuses={campuses} onSubmit={addEvent} />
        <p className="mt-3 text-center text-xs text-slate-400">
          {events.length} events scheduled
        </p>
      </Card>

      {isManager && (
        <Card title="Existing campuses">
          {campuses.length === 0 ? (
            <p className="text-sm text-slate-400">No campuses yet.</p>
          ) : (
            <ul className="space-y-3">
              {campuses.map((c) => {
                const deps =
                  serviceTimes.filter((s) => s.campusId === c.id).length
                const evs = events.filter((e) => e.campusId === c.id).length
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-slate-200 p-3"
                  >
                    {editingCampusId === c.id ? (
                      <CampusForm
                        initial={c}
                        submitLabel="Save changes"
                        onSubmit={(d) => updateCampus(c.id, d)}
                        onDone={() => setEditingCampusId(null)}
                        onCancel={() => setEditingCampusId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="truncate text-sm text-slate-400">
                            {c.address}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingCampusId(c.id)}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirm({
                              title: `Delete ${c.name}?`,
                              message:
                                deps > 0 || evs > 0
                                  ? `This campus has ${deps} service time(s) and ${evs} event(s). All of them and their sign-ups will be removed.`
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
        </Card>
      )}

      {isManager && (
        <Card title="Existing service times">
          {serviceTimes.length === 0 ? (
            <p className="text-sm text-slate-400">No service times yet.</p>
          ) : (
            <ul className="space-y-3">
              {serviceTimes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {s.dayOfWeek} {s.time}
                    </p>
                    <p className="truncate text-sm text-slate-400">
                      {campusName(s.campusId)}
                    </p>
                  </div>
                  <Link
                    to={`/service/${s.id}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() =>
                      setConfirm({
                        title: 'Delete this service time?',
                        message:
                          serviceSignupCount(s.id) > 0
                            ? `${serviceSignupCount(s.id)} volunteer(s) are signed up. Deleting removes their sign-ups too.`
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
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card title="Existing events">
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="truncate text-sm text-slate-400">
                    {e.date} · {campusName(e.campusId)}
                  </p>
                </div>
                <Link
                  to={`/event/${e.id}`}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() =>
                    setConfirm({
                      title: `Delete ${e.name}?`,
                      message:
                        eventSignupCount(e.id) > 0
                          ? `${eventSignupCount(e.id)} volunteer(s) are signed up. Deleting removes their sign-ups too.`
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
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!isManager && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Note: only <strong>Managers</strong> can add campuses and service times.
          As an Event Manager you can create events.
        </p>
      )}

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

export function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children}
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual check**

Run `npm run dev` as a Manager, open Manage:
- "Existing campuses" lists all campuses. Edit one inline → Save → name/address updates everywhere (Home, detail). Delete a campus that has services/events → confirm cites counts → confirm → that campus and its services/events vanish from Home, and related sign-ups vanish from My Schedule.
- "Existing service times" / "Existing events": Edit links navigate to the detail page (which has the inline editor from Task 4). Delete shows the confirm with the sign-up count and removes the item.
- Switch to an **Event Manager** role: campus and service-time create forms + their lists are hidden; only the event create form and "Existing events" list show. Confirm delete works for events.

- [ ] **Step 4: Final build**

Run: `npm run build`
Expected: PASS (tsc project refs + vite build, exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Manage.tsx
git commit -m "Add existing-item lists with edit/delete to Manage page"
```

---

## Self-Review Notes

- **Spec coverage:** §1 data actions → Task 1. §2 form extraction → Task 3; detail-page edit/delete → Task 4; Manage lists → Task 5. §3 ConfirmDialog → Task 2, used in Tasks 4 & 5; save-time position-drop confirm → Task 3 (ServiceForm/EventForm). Over-capacity allowed → no special code (inherent in `positionFilled`). Roles/gating → preserved in Tasks 4 & 5. All spec "Files touched" are covered.
- **Type consistency:** `uid` is defined/exported once in `PositionsEditor.tsx` and imported by both forms. `Card` is exported from `Manage.tsx` (Task 3 introduces the export; Task 5's full rewrite keeps it). Action names match the interface added in Task 1 exactly (`updateCampus`, `deleteCampus`, `updateServiceTime`, `deleteServiceTime`, `updateEvent`, `deleteEvent`). Form data shapes (`ServiceData`/`EventData`) match the `patch` types in the context actions.
- **Note on scope:** the save-time confirm (Task 3) implements the spec's "confirm before removing a position with sign-ups" as a single confirmation at save, which is when sign-ups are actually pruned — simpler than per-row confirmation and keeps `PositionsEditor` presentational.
