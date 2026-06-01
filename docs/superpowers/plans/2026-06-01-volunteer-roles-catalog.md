# Master Volunteer Roles Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable, church-wide catalog of volunteer roles that service times and events reference by ID (instead of free-text position titles), managed by Managers in the Manage workspace.

**Architecture:** Follows the app's single-source-of-truth pattern — all state and mutating actions live in `src/context/AppContext.tsx`, serialized to `localStorage`. A new `VolunteerRole` entity is added; `Position` changes from storing a `title` string to referencing a `roleId`. A new manager-only "Volunteer roles" Manage section provides CRUD; the position editor becomes a role picker.

**Tech Stack:** React 19, TypeScript (strict, `noUnusedLocals`), Vite, Tailwind v4. **No test runner** — the gate is `npm run lint` (`tsc -b --noEmit`) staying clean, plus manual verification on the dev server.

> **Note on commit granularity:** This project is gated by the TypeScript compiler, not a test runner, so there is no TDD red/green loop. Task 1 changes the shape of `Position`, which ripples through every consumer at once — the project will not type-check until all consumers in Task 1 are updated. Task 1 is therefore one atomic commit (edit all files, then verify + commit once). Tasks 2 and 3 are additive and each compile independently.

---

## File Structure

**Task 1 — model migration (one atomic commit):**
- Modify `src/types.ts` — add `VolunteerRole`; change `Position` to reference `roleId`.
- Modify `src/data/mockData.ts` — add `seedVolunteerRoles`; rewrite seed positions to `roleId`.
- Modify `src/context/AppContext.tsx` — bump storage key; add `volunteerRoles` state, `addRole`/`updateRole`/`deleteRole` actions, `roleName`/`roleUsage` helpers.
- Modify `src/components/forms/PositionsEditor.tsx` — free-text input → role picker `<select>`.
- Modify `src/components/forms/ServiceForm.tsx` — default/reset positions to `[]`; filter by `roleId`; drop unused `uid` import.
- Modify `src/components/forms/EventForm.tsx` — same as ServiceForm.
- Modify `src/components/PositionList.tsx` — display `roleName(p.roleId)`.
- Modify `src/components/Roster.tsx` — display `roleName(p.roleId)`.
- Modify `src/pages/Schedule.tsx` — resolve position title via `roleName`.

**Task 2 — role management UI (additive commit):**
- Modify `src/components/manage/types.ts` — add `'roles'` to `SectionKey`.
- Create `src/components/forms/RoleForm.tsx` — add/edit form.
- Create `src/components/manage/RoleSection.tsx` — list + inline CRUD.
- Modify `src/pages/Manage.tsx` — add rail item and render section.

**Task 3 — final verification (no code, one optional doc commit).**

---

## Task 1: Model migration to role references

**Files:** see "Task 1" list above. Edit all of them, then verify + commit once at the end.

- [ ] **Step 1: Add `VolunteerRole` and change `Position` in `src/types.ts`**

Replace the existing `Position` interface (lines 27-31) with the new role type plus the updated `Position`:

```ts
export interface VolunteerRole {
  id: string
  name: string
  description?: string
  defaultNeeded?: number
  category?: string
}

export interface Position {
  id: string // per-slot id; scopes Signup.positionId — keep stable across edits
  roleId: string // references VolunteerRole.id
  needed: number // editable per slot, pre-filled from role.defaultNeeded
}
```

Leave the rest of `types.ts` unchanged.

- [ ] **Step 2: Add seed roles and rewrite seed positions in `src/data/mockData.ts`**

Update the import on line 1 to include `VolunteerRole`:

```ts
import type { AppEvent, Campus, ServiceTime, Signup, User, VolunteerRole } from '../types'
```

Add this new export immediately after `seedCampuses` (after line 33):

```ts
export const seedVolunteerRoles: VolunteerRole[] = [
  { id: 'r-greeter', name: 'Greeter', category: 'Hospitality', defaultNeeded: 4, description: 'Welcome people at the doors.' },
  { id: 'r-kids', name: 'Kids Check-in', category: 'Kids', defaultNeeded: 3, description: 'Check children in and out safely.' },
  { id: 'r-parking', name: 'Parking', category: 'Hospitality', defaultNeeded: 2, description: 'Direct traffic and help people park.' },
  { id: 'r-worship', name: 'Worship Team', category: 'Worship', defaultNeeded: 2, description: 'Lead music during the service.' },
  { id: 'r-coffee', name: 'Coffee Bar', category: 'Hospitality', defaultNeeded: 3, description: 'Serve coffee and refreshments.' },
  { id: 'r-setup', name: 'Setup Crew', category: 'Production', defaultNeeded: 6, description: 'Set up tables, chairs, and equipment.' },
  { id: 'r-food', name: 'Food Distribution', category: 'Outreach', defaultNeeded: 10, description: 'Hand out food to guests.' },
  { id: 'r-cleanup', name: 'Cleanup', category: 'Production', defaultNeeded: 4, description: 'Tear down and clean up afterward.' },
  { id: 'r-registration', name: 'Registration', category: 'Outreach', defaultNeeded: 4, description: 'Register attendees at the table.' },
  { id: 'r-supply', name: 'Supply Handout', category: 'Outreach', defaultNeeded: 8, description: 'Distribute supplies to families.' },
]
```

Replace the `positions` arrays in `seedServiceTimes` so each position uses `roleId` instead of `title` (keep the existing position `id`s and `needed` values):

```ts
export const seedServiceTimes: ServiceTime[] = [
  {
    id: 's-dt-sun9',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '9:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 4 },
      { id: 'p2', roleId: 'r-kids', needed: 3 },
      { id: 'p3', roleId: 'r-parking', needed: 2 },
    ],
  },
  {
    id: 's-dt-sun11',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '11:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 4 },
      { id: 'p4', roleId: 'r-worship', needed: 2 },
      { id: 'p5', roleId: 'r-coffee', needed: 3 },
    ],
  },
  {
    id: 's-n-sun10',
    campusId: 'c-north',
    dayOfWeek: 'Sunday',
    time: '10:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 3 },
      { id: 'p2', roleId: 'r-kids', needed: 4 },
    ],
  },
]
```

Replace the `positions` arrays in `seedEvents` the same way:

```ts
export const seedEvents: AppEvent[] = [
  {
    id: 'e-foodbank',
    name: 'Community Food Bank',
    campusId: 'c-downtown',
    managerId: 'u-eventmgr',
    date: '2026-06-13',
    time: '8:00 AM',
    positions: [
      { id: 'ep1', roleId: 'r-setup', needed: 6 },
      { id: 'ep2', roleId: 'r-food', needed: 10 },
      { id: 'ep3', roleId: 'r-cleanup', needed: 4 },
    ],
  },
  {
    id: 'e-backtoschool',
    name: 'Back-to-School Drive',
    campusId: 'c-north',
    managerId: 'u-eventmgr',
    date: '2026-08-15',
    time: '10:00 AM',
    positions: [
      { id: 'ep4', roleId: 'r-registration', needed: 4 },
      { id: 'ep5', roleId: 'r-supply', needed: 8 },
    ],
  },
]
```

Leave `seedUsers`, `seedCampuses`, and `seedSignups` unchanged — `seedSignups` references position ids `p1`/`ep2`, which still exist.

- [ ] **Step 3: Wire roles into `src/context/AppContext.tsx`**

3a. Update the types import (lines 9-19) to include `VolunteerRole`:

```ts
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
```

3b. Update the mockData import (lines 20-26) to include `seedVolunteerRoles`:

```ts
import {
  seedCampuses,
  seedEvents,
  seedServiceTimes,
  seedSignups,
  seedUsers,
  seedVolunteerRoles,
} from '../data/mockData'
```

3c. Bump the storage key (line 28):

```ts
const STORAGE_KEY = 'fbvts-state-v2'
```

3d. Add `volunteerRoles` to `PersistedState` (inside the interface at lines 30-38), after `users`:

```ts
interface PersistedState {
  users: User[]
  volunteerRoles: VolunteerRole[]
  campuses: Campus[]
  serviceTimes: ServiceTime[]
  events: AppEvent[]
  signups: Signup[]
  currentUserId: string | null
  settings: Settings
}
```

3e. Seed it in the `loadState` default return (lines 47-55), after `users`:

```ts
  return {
    users: seedUsers,
    volunteerRoles: seedVolunteerRoles,
    campuses: seedCampuses,
    serviceTimes: seedServiceTimes,
    events: seedEvents,
    signups: seedSignups,
    currentUserId: null,
    settings: { fontScale: 'normal' },
  }
```

3f. Add the new action/helper signatures to `AppContextValue`. Insert immediately before the `// manager actions` comment (before line 73, after `setFontScale`):

```ts
  // volunteer roles (catalog)
  addRole: (data: {
    name: string
    description?: string
    defaultNeeded?: number
    category?: string
  }) => void
  updateRole: (
    id: string,
    patch: {
      name: string
      description?: string
      defaultNeeded?: number
      category?: string
    },
  ) => void
  deleteRole: (id: string) => void
  roleName: (roleId: string) => string
  roleUsage: (roleId: string) => { services: number; events: number }
```

3g. Implement the actions/helpers in the `value` object. Insert immediately after the `setFontScale` implementation (after line 182, before `addCampus`):

```ts
      addRole: (data) =>
        setState((s) => ({
          ...s,
          volunteerRoles: [...s.volunteerRoles, { id: uid('r'), ...data }],
        })),
      updateRole: (id, patch) =>
        setState((s) => ({
          ...s,
          volunteerRoles: s.volunteerRoles.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),
      deleteRole: (id) =>
        setState((s) => {
          const inUse = [...s.serviceTimes, ...s.events].some((x) =>
            x.positions.some((p) => p.roleId === id),
          )
          if (inUse) return s
          return {
            ...s,
            volunteerRoles: s.volunteerRoles.filter((r) => r.id !== id),
          }
        }),
```

3h. Add the two helpers alongside `campusName`/`positionFilled` at the end of the `value` object. Insert after `campusName` (after line 306, before `positionFilled`):

```ts
      roleName: (roleId) =>
        state.volunteerRoles.find((r) => r.id === roleId)?.name ?? 'Unknown role',
      roleUsage: (roleId) => ({
        services: state.serviceTimes.filter((st) =>
          st.positions.some((p) => p.roleId === roleId),
        ).length,
        events: state.events.filter((e) =>
          e.positions.some((p) => p.roleId === roleId),
        ).length,
      }),
```

- [ ] **Step 4: Convert `src/components/forms/PositionsEditor.tsx` to a role picker**

Replace the entire file with:

```tsx
import { useApp } from '../../context/AppContext'
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
  const { volunteerRoles } = useApp()

  if (volunteerRoles.length === 0) {
    return (
      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-600">Positions</span>
        <p className="text-sm text-slate-400">
          No volunteer roles defined yet. A Manager can add them under Manage →
          Volunteer roles.
        </p>
      </div>
    )
  }

  const usedRoleIds = new Set(positions.map((p) => p.roleId))
  const firstUnused = volunteerRoles.find((r) => !usedRoleIds.has(r.id))

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-600">Positions</span>
      {positions.map((p, i) => (
        <div key={p.id} className="flex gap-2">
          <select
            value={p.roleId}
            onChange={(e) => {
              const roleId = e.target.value
              const role = volunteerRoles.find((r) => r.id === roleId)
              setPositions(
                positions.map((x, j) =>
                  j === i
                    ? { ...x, roleId, needed: x.needed || role?.defaultNeeded || 1 }
                    : x,
                ),
              )
            }}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
            aria-label="Volunteer role"
          >
            {volunteerRoles.map((r) => (
              <option
                key={r.id}
                value={r.id}
                disabled={r.id !== p.roleId && usedRoleIds.has(r.id)}
              >
                {r.name}
              </option>
            ))}
          </select>
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
        onClick={() => {
          if (!firstUnused) return
          setPositions([
            ...positions,
            { id: uid(), roleId: firstUnused.id, needed: firstUnused.defaultNeeded ?? 1 },
          ])
        }}
        disabled={!firstUnused}
        className="text-sm font-semibold text-brand-700 disabled:text-slate-300"
      >
        + Add position
      </button>
    </div>
  )
}
```

(The `uid` export is still consumed by `PositionsEditor` internally and remains exported for safety, but `ServiceForm`/`EventForm` stop importing it in the next steps.)

- [ ] **Step 5: Update `src/components/forms/ServiceForm.tsx`**

5a. Change the import on line 4 to drop `uid`:

```ts
import { PositionsEditor } from './PositionsEditor'
```

5b. Change the default positions state (lines 46-48) to start empty:

```ts
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [],
  )
```

5c. Change the reset inside `commit` (line 57) to:

```ts
      setPositions([])
```

5d. Change the submit filter (line 78) from `p.title.trim()` to `p.roleId`:

```ts
            positions: positions.filter((p) => p.roleId),
```

- [ ] **Step 6: Update `src/components/forms/EventForm.tsx`**

6a. Change the import on line 4 to drop `uid`:

```ts
import { PositionsEditor } from './PositionsEditor'
```

6b. Change the default positions state (lines 38-40) to start empty:

```ts
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [],
  )
```

6c. Change the reset inside `commit` (line 51) to:

```ts
      setPositions([])
```

6d. Change the submit filter (line 73) from `p.title.trim()` to `p.roleId`:

```ts
            positions: positions.filter((p) => p.roleId),
```

- [ ] **Step 7: Update `src/components/PositionList.tsx`**

7a. Add `roleName` to the `useApp()` destructure (line 14):

```ts
  const { signups, currentUser, signUp, cancelSignup, positionFilled, roleName } =
    useApp()
```

7b. Replace the title heading (line 35) `{p.title}` with:

```tsx
              <h4 className="text-base font-semibold">{roleName(p.roleId)}</h4>
```

7c. Replace the sign-up toast (line 60) so it uses the role name:

```tsx
                  toast(`You're signed up for ${roleName(p.roleId)} 🎉`)
```

- [ ] **Step 8: Update `src/components/Roster.tsx`**

8a. Add `roleName` to the `useApp()` destructure (line 19):

```ts
  const { signups, users, cancelSignup, isEventManager, roleName } = useApp()
```

8b. Inside the `positions.map((p) => {` callback (after line 28), add a title constant right after the `const signed = ...` block (after line 31):

```ts
          const title = roleName(p.roleId)
```

8c. Replace the three usages of `p.title` with `title`:
- line 38 heading: `<h4 className="font-semibold">{title}</h4>`
- line 72 toast: `toast(\`Removed ${u.name} from ${title}\`)`
- line 75 aria-label: `aria-label={\`Remove ${u.name} from ${title}\`}`

- [ ] **Step 9: Update `src/pages/Schedule.tsx`**

9a. Add `roleName` to the `useApp()` destructure (lines 14-15):

```ts
  const { signups, currentUser, serviceTimes, events, campusName, cancelSignup, roleName } =
    useApp()
```

9b. Replace the service-branch position lookup (lines 51-52) with:

```ts
              const pos = s.positions.find((p) => p.id === g.positionId)
              positionTitle = pos ? roleName(pos.roleId) : ''
```

9c. Replace the event-branch position lookup (lines 60-61) with:

```ts
              const pos = e.positions.find((p) => p.id === g.positionId)
              positionTitle = pos ? roleName(pos.roleId) : ''
```

- [ ] **Step 10: Type-check the whole project**

Run: `npm run lint`
Expected: PASS — no errors. (This is `tsc -b --noEmit`. If any file still references `.title` on a `Position`, or `uid` is imported but unused, it fails here — fix and re-run.)

- [ ] **Step 11: Build to confirm**

Run: `npm run build`
Expected: PASS — `tsc -b` then `vite build` complete with no errors.

- [ ] **Step 12: Commit**

```bash
git add src/types.ts src/data/mockData.ts src/context/AppContext.tsx \
  src/components/forms/PositionsEditor.tsx src/components/forms/ServiceForm.tsx \
  src/components/forms/EventForm.tsx src/components/PositionList.tsx \
  src/components/Roster.tsx src/pages/Schedule.tsx
git commit -m "Migrate positions to reference a volunteer-role catalog

Add VolunteerRole entity and seed catalog; Position now references roleId
instead of a free-text title. Position editor becomes a role picker; all
display sites resolve titles via roleName(). Storage key bumped to v2 so
existing demo sessions reseed into the new shape.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Manager-only "Volunteer roles" Manage section

**Files:**
- Modify: `src/components/manage/types.ts`
- Create: `src/components/forms/RoleForm.tsx`
- Create: `src/components/manage/RoleSection.tsx`
- Modify: `src/pages/Manage.tsx`

- [ ] **Step 1: Add `'roles'` to `SectionKey` in `src/components/manage/types.ts`**

Change line 1:

```ts
export type SectionKey = 'campuses' | 'roles' | 'services' | 'events'
```

Leave `RailItem` and `RequestConfirm` unchanged.

- [ ] **Step 2: Create `src/components/forms/RoleForm.tsx`**

```tsx
import { useState } from 'react'
import { useToast } from '../Toast'
import type { VolunteerRole } from '../../types'

type RoleData = {
  name: string
  description?: string
  defaultNeeded?: number
  category?: string
}

export function RoleForm({
  initial,
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add role',
}: {
  initial?: VolunteerRole
  onSubmit: (d: RoleData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [defaultNeeded, setDefaultNeeded] = useState(
    initial?.defaultNeeded?.toString() ?? '',
  )
  const toast = useToast()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        const parsed = parseInt(defaultNeeded, 10)
        onSubmit({
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          defaultNeeded: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
        })
        toast(initial ? 'Role updated' : `Role "${name.trim()}" added`)
        if (!initial) {
          setName('')
          setCategory('')
          setDescription('')
          setDefaultNeeded('')
        }
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Role name (e.g. Greeter)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (e.g. Hospitality)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        rows={2}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        type="number"
        min={1}
        value={defaultNeeded}
        onChange={(e) => setDefaultNeeded(e.target.value)}
        placeholder="Default spots needed (optional)"
        aria-label="Default spots needed"
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

- [ ] **Step 3: Create `src/components/manage/RoleSection.tsx`**

```tsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { RoleForm } from '../forms/RoleForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

/** Pluralized "N service times and M events" phrase, omitting zero parts. */
function usagePhrase(services: number, events: number): string {
  const parts: string[] = []
  if (services > 0) parts.push(`${services} service time${services === 1 ? '' : 's'}`)
  if (events > 0) parts.push(`${events} event${events === 1 ? '' : 's'}`)
  return parts.join(' and ')
}

export function RoleSection({ requestConfirm }: { requestConfirm: RequestConfirm }) {
  const { volunteerRoles, roleUsage, addRole, updateRole, deleteRole } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <SectionCard
      title="Volunteer roles"
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
            + Add role
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <RoleForm
            onSubmit={addRole}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {volunteerRoles.length === 0 ? (
        <p className="text-sm text-slate-400">No volunteer roles yet.</p>
      ) : (
        <ul className="space-y-3">
          {volunteerRoles.map((r) => {
            const usage = roleUsage(r.id)
            const inUse = usage.services + usage.events > 0
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === r.id ? (
                  <RoleForm
                    initial={r}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateRole(r.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {r.name}
                        {r.category && (
                          <span className="font-normal text-slate-400"> · {r.category}</span>
                        )}
                      </p>
                      {r.description && (
                        <p className="truncate text-sm text-slate-400">{r.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit role ${r.name}`}
                      onClick={() => {
                        setEditingId(r.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete role ${r.name}`}
                      onClick={() => {
                        if (inUse) {
                          toast(
                            `"${r.name}" is used by ${usagePhrase(
                              usage.services,
                              usage.events,
                            )}. Remove it from those first.`,
                          )
                          return
                        }
                        requestConfirm({
                          title: `Delete ${r.name}?`,
                          onConfirm: () => {
                            deleteRole(r.id)
                            toast('Role deleted')
                          },
                        })
                      }}
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

- [ ] **Step 4: Wire the section into `src/pages/Manage.tsx`**

4a. Add the import after the `ServiceSection` import (after line 6):

```ts
import { RoleSection } from '../components/manage/RoleSection'
```

4b. Add `volunteerRoles` to the `useApp()` destructure (line 11):

```ts
  const { isManager, isEventManager, campuses, serviceTimes, events, volunteerRoles } =
    useApp()
```

4c. Add the rail item to the manager `sections` array (lines 28-32) — insert after `campuses`:

```ts
  const sections: RailItem[] = isManager
    ? [
        { key: 'campuses', label: 'Campuses', count: campuses.length },
        { key: 'roles', label: 'Volunteer roles', count: volunteerRoles.length },
        { key: 'services', label: 'Service times', count: serviceTimes.length },
        { key: 'events', label: 'Events', count: events.length },
      ]
    : [{ key: 'events', label: 'Events', count: events.length }]
```

4d. Render the section. Insert this block after the `campuses` section block (after line 60, before the `services` block):

```tsx
          {isManager && (
            <div className={vis('roles')}>
              <RoleSection requestConfirm={requestConfirm} />
            </div>
          )}
```

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: PASS — no errors.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/manage/types.ts src/components/forms/RoleForm.tsx \
  src/components/manage/RoleSection.tsx src/pages/Manage.tsx
git commit -m "Add manager-only Volunteer roles section to Manage

CRUD for the role catalog with inline create/edit. Deleting an in-use role
is blocked with a toast naming the service times and events that use it.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Final verification (manual dogfood)

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite serves at http://localhost:5173.

- [ ] **Step 2: Reset to fresh seed (new storage key)**

In the browser, the storage key is now `fbvts-state-v2`, so first load auto-seeds. If you had a `v1` session open, hard-refresh. (To force a clean reseed: open devtools console and run `localStorage.removeItem('fbvts-state-v2')`, then reload.)

- [ ] **Step 3: Verify existing data renders by role name**

Log in as the Manager (Pat Rivera). Open a service time detail page (e.g. Downtown Sunday 9:00 AM).
Expected: positions show "Greeter", "Kids Check-in", "Parking" with correct "X of Y filled" counts; the manager Roster shows the same role names.

- [ ] **Step 4: Create a role**

Go to Manage → Volunteer roles → "+ Add role". Add name "Tech Booth", category "Production", default needed 2. Submit.
Expected: it appears in the list and the rail count increments.

- [ ] **Step 5: Use the role in a service time**

Manage → Service times → edit a service → "+ Add position" → the picker offers "Tech Booth"; selecting it pre-fills needed = 2. Save.
Expected: the service detail page now lists "Tech Booth"; already-used roles are disabled in that slot's dropdown (no duplicates).

- [ ] **Step 6: Sign up and verify Schedule**

Switch role to Volunteer (Profile or role switcher), open that service, sign up for "Tech Booth".
Expected: toast names the role; "My Schedule" shows the "Tech Booth" pill; capacity count increments.

- [ ] **Step 7: Verify the delete guard**

Switch back to Manager. Manage → Volunteer roles → Delete "Tech Booth".
Expected: a toast says it is used by 1 service time and to remove it first; the role is NOT deleted. Remove it from the service time, then delete again → confirm dialog appears → deletes successfully.

- [ ] **Step 8: Confirm the gate is clean**

Run: `npm run lint && npm run build`
Expected: both PASS.

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** linked catalog (Task 1 model), four role fields (types + RoleForm), manager-gated section (Manage `isManager` guard), block-with-warning delete (RoleSection toast + `deleteRole` guard), storage key bump (AppContext), seed migration (mockData), picker editor (PositionsEditor), all read sites migrated (PositionList/Roster/Schedule).
- **Read sites checked:** `Home.tsx` and `CalendarMonth.tsx` reference `.title` only on events/occurrences, never on `Position`, so they need no change. `ServiceDetail.tsx`/`EventDetail.tsx` pass `positions` through to `PositionList`/`Roster` and don't read `.title` directly.
- **Type consistency:** action names `addRole`/`updateRole`/`deleteRole`, helpers `roleName`/`roleUsage` (returns `{ services, events }`), field `volunteerRoles`, and `Position.roleId` are used identically across all tasks.
