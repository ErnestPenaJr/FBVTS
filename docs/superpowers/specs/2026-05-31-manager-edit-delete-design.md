# Manager Edit & Delete — Design

**Date:** 2026-05-31
**Status:** Approved (design), pending implementation plan
**Scope:** First of four planned manager features. The others (manage volunteers on
a position, staffing oversight dashboard, manage users & roles) are out of scope here
and will each get their own spec.

## Goal

Today the Manage page is **create-only**: managers can add campuses and service times,
and event managers can create events. Nothing can be changed or removed after creation,
and positions can only be defined at create time. This feature adds full **edit and
delete** for campuses, service times, and events — including adding/removing positions
on items that already exist.

## Roles & gating

Unchanged from the existing rules:
- `isManager` gates campus and service-time edit/delete.
- `isEventManager` (event managers AND managers) gates event edit/delete.

All edit/delete affordances are hidden from regular volunteers.

## 1. Data layer — new `AppContext` actions

All mutations live in `src/context/AppContext.tsx`, following the existing immutable
`setState` pattern. Cascading is handled here so UI components stay simple. These are
added to `AppContextValue` and the context value object.

| Action | Signature | Behavior |
|---|---|---|
| `updateCampus` | `(id: string, patch: { name: string; address: string }) => void` | Patch the campus in place. |
| `deleteCampus` | `(id: string) => void` | **Cascade:** remove the campus, every service time and event with `campusId === id`, and every signup whose `refId` points at one of those removed service times/events. |
| `updateServiceTime` | `(id: string, patch: { campusId: string; dayOfWeek: string; time: string; positions: Position[] }) => void` | Patch fields and replace positions. **Prune** any signup with `kind:'service'`, `refId === id`, and a `positionId` not present in the new positions list. |
| `deleteServiceTime` | `(id: string) => void` | **Cascade:** remove the service time and every signup with `kind:'service'` and `refId === id`. |
| `updateEvent` | `(id: string, patch: { name: string; campusId: string; date: string; time: string; positions: Position[] }) => void` | Same semantics as `updateServiceTime`, for `kind:'event'`. `managerId` is preserved. |
| `deleteEvent` | `(id: string) => void` | **Cascade:** remove the event and every signup with `kind:'event'` and `refId === id`. |

Notes:
- **Over-capacity is allowed** with no special handling. `positionFilled` already counts
  signups independently of `needed`, so a position can legitimately display `4 / 2` after
  `needed` is lowered. No extra logic required.
- No new fields in `types.ts` — this is all behavior over existing data.
- Confirmation is a UI concern (see §3); these actions execute the mutation unconditionally
  when called.

## 2. UI — both placements, shared forms

### Form extraction (refactor)
The three create forms (`CampusForm`, `ServiceForm`, `EventForm`) and `PositionsEditor`
currently live inside `src/pages/Manage.tsx`. Extract them into `src/components/forms/`:

- `src/components/forms/PositionsEditor.tsx`
- `src/components/forms/CampusForm.tsx`
- `src/components/forms/ServiceForm.tsx`
- `src/components/forms/EventForm.tsx`

Each form gains an optional `initial` prop (the existing entity) so the **same component
handles create and edit**:
- No `initial` → empty/default state, submit calls the create action, shows the existing
  "added/created" toast, resets the form.
- With `initial` → fields pre-filled, submit calls the matching `update*` action, shows an
  "updated" toast, and (on detail pages) closes the inline editor.

The submit handler stays injected via props (`onSubmit`), so the form does not import
`useApp` directly for the action — keeping it reusable and testable. `Manage.tsx` shrinks
to composition + the new "existing items" lists.

### Detail pages (`ServiceDetail`, `EventDetail`)
- Add a manager-only **Edit · Delete** action row beneath the title (gated by `isManager`
  for services, `isEventManager` for events).
- **Edit** toggles local state that swaps the read view for the pre-filled form inline.
  Saving closes the editor; canceling discards.
- **Delete** opens the `ConfirmDialog` (§3); on confirm, calls the cascade delete action,
  shows a toast, and navigates to `/`.

### Manage page (`Manage.tsx`)
Below the existing create forms, add three "Existing …" list sections:
- **Existing campuses** (manager only): each row shows name/address with **Edit** (inline,
  since campuses have no detail page) and **Delete**.
- **Existing service times** (manager only): each row links to its detail page to edit, and
  has a **Delete** here.
- **Existing events**: each row links to its detail page to edit, and has a **Delete** here.

This satisfies the "Both" placement choice without building edit forms twice (service/event
edit lives only on the detail page; the Manage list reuses it via link).

## 3. Confirmation — reusable `ConfirmDialog`

A small styled modal at `src/components/ConfirmDialog.tsx`, consistent with the existing
Toast styling and the accessibility constraints (rem-based spacing, large tap targets,
focusable buttons, dismiss on overlay click / Escape). Used instead of the browser's native
`confirm()` so we can show an impact line.

Impact messages (computed at the call site from current state):
- **Delete service/event:** "N volunteers are signed up. Deleting removes their signups too."
  (Omit the sentence when N is 0.)
- **Delete campus:** "This campus has X service times and Y events. All of them and their
  signups will be removed." (Omit a clause when its count is 0; if both are 0, a plain
  "Delete this campus?" confirm.)
- **Remove a position with signups during edit:** "M volunteers are signed up for
  '<position title>'. Removing it drops their signups." Confirmed before the position is
  dropped from the editor's positions list.

The dialog is generic: `{ open, title, message, confirmLabel, onConfirm, onCancel }`.

## Out of scope
- Manage volunteers on a position (add/reassign). Note: the roster already supports
  *removing* a volunteer; the rest is a separate feature.
- Staffing oversight dashboard.
- Manage users & roles.
- Undo / soft-delete. Deletes are immediate (after confirm) and permanent for this demo.

## Files touched
- `src/context/AppContext.tsx` — six new actions + interface entries.
- `src/components/forms/{PositionsEditor,CampusForm,ServiceForm,EventForm}.tsx` — extracted,
  create+edit capable.
- `src/components/ConfirmDialog.tsx` — new.
- `src/pages/Manage.tsx` — use shared forms, add existing-items lists with edit/delete.
- `src/pages/ServiceDetail.tsx`, `src/pages/EventDetail.tsx` — edit/delete action row +
  inline edit.

## Verification
- `npm run lint` (tsc) and `npm run build` stay clean — the type-check is the CI gate.
- Manual: create → edit (incl. add/remove a position) → confirm signups pruned correctly;
  delete a service/event with signups → signups gone; delete a campus → its services,
  events, and their signups gone; verify volunteers see no edit/delete controls.
