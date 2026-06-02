# Super Admin / User Management — Design

**Date:** 2026-06-01
**Status:** Approved (pending implementation plan)

## Goal

Introduce a privileged "super admin" (developer) account —
`epena@fallbrookchurch.org` — that can manage all other user accounts: list,
create, edit, change roles, and delete. This is the first account in the app
with authority *over other users*, as opposed to authority over scheduling data
(campuses, service times, events).

## Identity model (no new role)

Super admin is a **derived capability tied to a reserved email**, not a fourth
role. This makes it "the developer account" that cannot be self-assigned through
the existing self-service role switcher.

- Add a constant in `src/types.ts`:
  `export const SUPER_ADMIN_EMAIL = 'epena@fallbrookchurch.org'`
- The `Role` union stays three values (`volunteer | event_manager | manager`).
  No `RoleBadge` / `ROLE_LABELS` changes.
- Seed the account in `src/data/mockData.ts` with a normal base role of
  `manager` so it also has full app access:
  ```ts
  {
    id: 'u-superadmin',
    name: 'Ernest Peña',
    email: SUPER_ADMIN_EMAIL,
    role: 'manager',
    bio: 'Developer / super admin.',
  }
  ```
  It appears in the login account picker like the other demo users.

## AppContext changes (`src/context/AppContext.tsx`)

**Derived flag** (computed in the context value, not stored):
- `isSuperAdmin = currentUser?.email === SUPER_ADMIN_EMAIL`

**Capability propagation:** so admin powers survive even when the super admin
uses the self-switcher to view the app as a volunteer/event manager:
- `isManager = currentUser?.role === 'manager' || isSuperAdmin`
- `isEventManager = currentUser?.role === 'event_manager' || currentUser?.role === 'manager' || isSuperAdmin`

The existing self-service `switchRole` is left untouched. It only ever offered
the three base roles, so super admin can never be self-assigned — the "exclude
super_admin" requirement is satisfied automatically.

**New actions** (added to `AppContextValue` and the context value). Each is a
no-op unless `currentUser?.email === SUPER_ADMIN_EMAIL` (guarded inside the
action, not just the UI):

- `adminCreateUser(data: { name: string; email: string; role: Role }): void`
  - Generates id via `uid('u')`.
  - Rejects (no-op) if the email is empty, a case-insensitive duplicate of an
    existing user, or equal to `SUPER_ADMIN_EMAIL`.

- `adminUpdateUser(id: string, patch: Partial<Pick<User, 'name' | 'email' | 'phone' | 'bio' | 'role'>>): void`
  - Rejects assigning `SUPER_ADMIN_EMAIL` to any account other than the seeded
    super-admin account.
  - The super-admin account's own email is locked: an email change to that
    account is ignored (other fields still apply). This prevents locking
    yourself out of admin.
  - Rejects an email change that collides (case-insensitive) with another user.

- `adminDeleteUser(id: string): void`
  - Refuses to delete the super-admin account or the current user.
  - Cascade-removes the deleted user's `signups`.
  - Events whose `managerId` referenced the deleted user keep their `managerId`
    (it's a display label only; no cascade).

## UI — new `/admin` page ("Users")

**Route** (`src/App.tsx`): add `<Route path="/admin" element={<Admin />} />`
inside the existing `RequireAuth` + `Layout` wrapper.

**Page** (`src/pages/Admin.tsx`):
- If `!isSuperAdmin`, render an access-denied message (same pattern as the early
  return in `Manage.tsx`).
- Otherwise render a list of all users: `Avatar` + name + email + `RoleBadge`,
  with **Edit** and **Delete** controls per row, and an **Add user** action.
- Add / Edit use a simple inline form or dialog (name, email, phone, bio, role
  `<select>`). Delete uses the existing `ConfirmDialog`.
- Styling follows the `src/components/manage/` section conventions; all spacing
  is `rem`-based per the accessibility constraint. Components may be split into
  `src/components/admin/` if the page grows (e.g. `UserRow`, `UserForm`), but a
  single focused `Admin.tsx` is acceptable for one resource.
- Self-protection in the UI: the Delete control is hidden/disabled for the
  super-admin account and for the current user (mirrors the action guards).

**Nav** (`src/components/Layout.tsx`):
- Add a people/users icon to `ICONS`.
- Add `{ to: '/admin', label: 'Users', icon: ICONS.users }` to the `items`
  array, included only when `isSuperAdmin`.

## Guard rails summary

| Rule | Enforced in |
| --- | --- |
| Email unique (case-insensitive) on create/edit | `adminCreateUser`, `adminUpdateUser` |
| Reserved email not assignable to other accounts | `adminCreateUser`, `adminUpdateUser` |
| Super-admin account email locked | `adminUpdateUser` |
| Cannot delete super-admin account or self | `adminDeleteUser` + UI |
| Deleting a user cascades to their signups | `adminDeleteUser` |
| All admin actions inert unless current user is super admin | each action |

## Out of scope (YAGNI)

- Passwords / real authentication (the app is intentionally passwordless).
- A fourth `super_admin` role, badges, or audit logging.
- Deactivate-instead-of-delete, bulk actions, search/pagination of users.
- Reassigning events owned by a deleted user.

## Verification

There is no test runner or ESLint in this project; the CI gate is
`npm run build`. Verification:

1. `npm run lint` (`tsc -b --noEmit`) is clean.
2. Manual pass:
   - Log in as `epena@fallbrookchurch.org` → "Users" nav item appears; can
     list, add, edit (incl. role change), and delete other users; cannot delete
     self or the super-admin account; cannot duplicate an email.
   - Log in as any other demo account → no "Users" nav item, and navigating to
     `/admin` shows the access-denied message.
   - Delete a user who had signups → those signups disappear (verify capacity
     counts on affected service/event detail pages update).
