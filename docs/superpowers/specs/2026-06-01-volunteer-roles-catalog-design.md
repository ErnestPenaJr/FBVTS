# Design: Master Volunteer Roles Catalog

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Problem

The church has no master list of the volunteer roles it offers. Today each
service time and event stores its volunteer positions as ad-hoc free-text
titles (`Position.title`), re-typed every time. "Greeter" at one campus is not
linked to "Greeter" at another, there is no single place to see or manage the
roles the church uses, and no role metadata (description, suggested headcount,
ministry grouping) exists.

## Goal

Introduce a reusable, church-wide **catalog of volunteer roles**, managed in one
place by Managers. Service times and events **pick from** this catalog by
reference rather than re-typing titles, so a role's name and details are defined
once and shown everywhere it's used.

## Decisions

These were settled during brainstorming and are fixed for this spec:

1. **Catalog binding: pick-from-catalog (linked).** A position references a
   `roleId` from the catalog; its displayed title comes from the role. No
   per-position custom titles.
2. **Role fields:** `name` (required), `description` (optional),
   `defaultNeeded` (optional), `category` / ministry (optional).
3. **Who manages it:** Manager-gated, consistent with the existing rule that
   campuses and service times require Manager level. Event Managers do not see
   the Volunteer roles section.
4. **Deleting an in-use role: block with a warning.** Deletion is refused while
   any service time or event still uses the role; the manager is told how many,
   and must remove it from those slots first.

## Architecture

The app follows its single-source-of-truth pattern: all state and mutating
actions live in `src/context/AppContext.tsx`, serialized to `localStorage`.
This feature adds one new domain entity, changes the shape of `Position`, and
adds a new Manage section plus a picker — no new architectural layers.

### 1. Data model (`src/types.ts`)

New catalog entity:

```ts
export interface VolunteerRole {
  id: string
  name: string
  description?: string
  defaultNeeded?: number
  category?: string
}
```

`Position` changes from storing a title to referencing a role:

```ts
// before: { id: string; title: string; needed: number }
export interface Position {
  id: string      // per-slot id; scopes Signup.positionId — KEEP stable
  roleId: string  // references VolunteerRole.id
  needed: number  // editable per slot, pre-filled from role.defaultNeeded
}
```

Rationale for keeping `Position.id`: `Signup` links to a position via
`{ kind, refId, positionId }`, and capacity is computed by counting signups
(`positionFilled`). Keeping the per-slot `id` means existing signups continue to
resolve after the migration. The title simply moves from a stored string to a
lookup against the catalog.

### 2. State & context (`src/context/AppContext.tsx`)

- `PersistedState` gains `volunteerRoles: VolunteerRole[]`.
- New actions:
  - `addRole(data: { name; description?; defaultNeeded?; category? })`
  - `updateRole(id, patch)`
  - `deleteRole(id)` — **no-ops if the role is in use** (defensive guard;
    the UI also checks before offering deletion).
- New derived helpers in the context value:
  - `roleName(roleId: string): string` — catalog lookup, falls back to a
    safe label (e.g. `'Unknown role'`) if missing.
  - `roleUsage(roleId: string): { services: number; events: number }` —
    counts service times and events whose positions reference the role.

### 3. Migration / seed (`src/data/mockData.ts` + storage key)

- Add `seedVolunteerRoles`, built from the distinct titles currently in the
  seed: Greeter, Kids Check-in, Parking, Worship Team, Coffee Bar, Setup Crew,
  Food Distribution, Cleanup, Registration, Supply Handout. Each gets a sensible
  `category` (e.g. Hospitality, Kids, Worship, Production, Outreach) and a
  `defaultNeeded`.
- Rewrite `seedServiceTimes` and `seedEvents` positions to the new
  `{ id, roleId, needed }` shape, **keeping the existing position `id`s**
  (`p1`, `p2`, `ep2`, …) so `seedSignups` still resolve.
- **Bump the storage key `fbvts-state-v1` → `fbvts-state-v2`.** Existing demo
  sessions reseed cleanly into the new shape rather than relying on a fragile
  in-place localStorage migration. This is throwaway demo data, so dropping prior
  edits is acceptable. (Rejected alternative: in-place migration that maps old
  free-text titles to catalog roles — more code, more failure modes, no real
  benefit for demo data.)

### 4. UI

**New Manage section — "Volunteer roles" (manager-only).** Follows the existing
`CampusSection` pattern exactly:

- `src/components/manage/RoleSection.tsx` — list with inline create/edit/delete.
  - For each role, compute `roleUsage`. If in use, clicking Delete shows a
    **blocking toast** — "Used by N service times and M events — remove it from
    those first." — and does not delete. Unused roles delete via the normal
    `ConfirmDialog`. (Toast chosen over a dialog because it's informational, not
    a decision: there's no destructive action to confirm.)
  - Show `category` and `defaultNeeded` in the row; `description` as subtext.
- `src/components/forms/RoleForm.tsx` — fields: name (required), description,
  default needed (number, min 1), category. Mirrors `CampusForm`'s shape.
- `src/components/manage/types.ts` — `SectionKey` gains `'roles'`.
- `src/pages/Manage.tsx` — add the manager-only rail item and render
  `RoleSection`. Placement: after Campuses, before Service times.

**`PositionsEditor` becomes a role picker** (`src/components/forms/PositionsEditor.tsx`):

- Replace the free-text title input with a `<select>` of catalog roles.
- Selecting a role pre-fills `needed` from its `defaultNeeded` (still editable).
- Prevent adding the same role twice to one slot (filter already-chosen roles
  out of the dropdown, or block duplicates).
- If the catalog is empty, show a hint pointing the manager to add roles first.

**Read sites** swap `position.title` → `roleName(position.roleId)`:
`PositionList`, `Roster`, `ServiceDetail`, `EventDetail`, `Schedule`, `Home`.
The TypeScript change to `Position` makes the compiler flag every site that
read `.title`, so the migration is compiler-driven and exhaustive.

### 5. Error handling & edge cases

- Empty catalog: `PositionsEditor` blocks/guides instead of letting a manager
  create a position with no role.
- Missing role on lookup (shouldn't happen given the delete guard, but defensive):
  `roleName` returns a safe fallback label.
- Delete guard enforced in both the action and the UI.
- `defaultNeeded` is a suggestion only; per-slot `needed` always wins and stays
  ≥ 1.

## Testing & verification

No test runner or ESLint is configured; the gate is `npm run lint` (tsc) staying
clean (CI runs `npm run build`). Verification:

1. `npm run lint` — must be clean; the `Position` shape change surfaces every
   read site as a type error until migrated.
2. Manual dogfood on the dev server:
   - As Manager: create a role → it appears in the catalog.
   - Add the role to a service time (picker pre-fills needed) → save.
   - As Volunteer: sign up for it → detail page and Schedule show the role name;
     capacity counts correctly.
   - Manager roster shows the role name.
   - Try to delete an in-use role → blocked with the usage message. Remove it
     from the slot, then delete → succeeds.

## Out of scope (YAGNI)

- Per-position custom/one-off titles (rejected: linked-only was chosen).
- In-place localStorage migration of existing v1 data.
- Role-to-permission linkage (this catalog is about volunteer *positions*, not
  the `Role` permission enum).
- Category management UI (categories are free-text on the role for now).
