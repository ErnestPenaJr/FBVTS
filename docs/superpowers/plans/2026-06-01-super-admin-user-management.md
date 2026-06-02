# Super Admin / User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a privileged super-admin account (`epena@fallbrookchurch.org`) that can list, create, edit, role-change, and delete all other user accounts via a new `/admin` page.

**Architecture:** Super admin is a *derived capability tied to a reserved email* — not a fourth role. A `SUPER_ADMIN_EMAIL` constant drives an `isSuperAdmin` flag in `AppContext`, which also lifts the existing `isManager`/`isEventManager` gates. Three guarded admin actions (`adminCreateUser`, `adminUpdateUser`, `adminDeleteUser`) live in `AppContext` next to the other mutations. The UI is a new `Admin` page plus a `UserForm`, both following the existing `Manage`/`SectionCard`/`RoleForm` conventions.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4. No backend, no test runner — state is `useState` in `AppContext` persisted to `localStorage`. The verification gate is `npm run lint` (`tsc -b --noEmit`) plus manual checks in `npm run dev`.

---

## Testing note

This project has **no test runner and no ESLint** (see `CLAUDE.md`). CI runs `npm run build`; the only automated gate is the TypeScript compiler. Therefore each task verifies with `npm run lint` (type-check) and, where behavior is involved, explicit manual steps in the dev server. Do not scaffold a test framework — that is out of scope.

---

## File Structure

- **Modify** `src/types.ts` — add `SUPER_ADMIN_EMAIL` constant (Task 1).
- **Modify** `src/data/mockData.ts` — seed the super-admin user (Task 2).
- **Modify** `src/context/AppContext.tsx` — bump storage key, `isSuperAdmin` flag, lift gating flags, three admin actions + interface entries (Tasks 2–4).
- **Create** `src/components/forms/UserForm.tsx` — add/edit user form (Task 5).
- **Create** `src/pages/Admin.tsx` — the Users management page (Task 6).
- **Modify** `src/App.tsx` — register the `/admin` route (Task 7).
- **Modify** `src/components/Layout.tsx` — gated "Users" nav item + icon (Task 8).

---

## Task 1: Reserved super-admin email constant

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the constant**

Add this near the top of `src/types.ts`, directly under the existing `ROLE_LABELS` block:

```ts
/** The single reserved developer / super-admin account. Super-admin power is
 *  derived from this email, not from a role, so it can never be self-assigned
 *  through the role switcher. */
export const SUPER_ADMIN_EMAIL = 'epena@fallbrookchurch.org'
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add reserved SUPER_ADMIN_EMAIL constant"
```

---

## Task 2: Seed the super-admin account

**Files:**
- Modify: `src/data/mockData.ts`
- Modify: `src/context/AppContext.tsx:30`

- [ ] **Step 1: Import the constant in mockData**

In `src/data/mockData.ts`, line 1 currently imports only types. Add a value import below it:

```ts
import type { AppEvent, Campus, ServiceTime, Signup, User, VolunteerRole } from '../types'
import { SUPER_ADMIN_EMAIL } from '../types'
```

- [ ] **Step 2: Add the seeded user**

In `src/data/mockData.ts`, add this object as the **first** entry of the `seedUsers` array (before `u-manager`):

```ts
  {
    id: 'u-superadmin',
    name: 'Ernest Peña',
    email: SUPER_ADMIN_EMAIL,
    phone: '555-0100',
    role: 'manager',
    bio: 'Developer / super admin.',
  },
```

- [ ] **Step 3: Bump the storage key so the new seed loads**

Existing browsers already hold persisted state under the current key, so the new seeded account would not appear. In `src/context/AppContext.tsx`, change line 30:

```ts
const STORAGE_KEY = 'fbvts-state-v3'
```

(was `'fbvts-state-v2'`)

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `npm run dev`, open the app, and on the login screen confirm a new "Ernest Peña — epena@fallbrookchurch.org" account appears in the picker with a Manager badge.

- [ ] **Step 6: Commit**

```bash
git add src/data/mockData.ts src/context/AppContext.tsx
git commit -m "feat: seed super-admin account and bump storage key to v3"
```

---

## Task 3: `isSuperAdmin` flag and lifted gating

**Files:**
- Modify: `src/context/AppContext.tsx` (imports ~line 21; interface ~line 65; value ~line 168–177)

- [ ] **Step 1: Import the constant**

In `src/context/AppContext.tsx`, after the existing `import type { ... } from '../types'` block (ends line 20), add:

```ts
import { SUPER_ADMIN_EMAIL } from '../types'
```

- [ ] **Step 2: Add `isSuperAdmin` to the interface**

In the `AppContextValue` interface, alongside `isManager` / `isEventManager` (currently lines 67–68), add:

```ts
  isSuperAdmin: boolean
```

- [ ] **Step 3: Compute the flag and lift the gates**

In the `value` `useMemo` (currently line 168), add a local just inside the callback, before `const update = ...`:

```ts
    const superAdmin = currentUser?.email === SUPER_ADMIN_EMAIL
```

Then replace the current `isManager` / `isEventManager` lines (175–177) inside the returned object with:

```ts
      isManager: currentUser?.role === 'manager' || superAdmin,
      isEventManager:
        currentUser?.role === 'event_manager' ||
        currentUser?.role === 'manager' ||
        superAdmin,
      isSuperAdmin: superAdmin,
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

In `npm run dev`, log in as the super-admin account, then on the Profile page use the role switcher to switch to "Volunteer". Confirm the "Manage" nav item still shows (admin powers survive the self-switch). Switch back to Manager.

- [ ] **Step 6: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: derive isSuperAdmin and lift manager gates for super admin"
```

---

## Task 4: Admin user-management actions

**Files:**
- Modify: `src/context/AppContext.tsx` (interface ~after line 75; implementation after the `updateProfile` action ~line 203)

- [ ] **Step 1: Add the action signatures to the interface**

In `AppContextValue`, directly after the `updateProfile` / `setFontScale` profile entries (currently lines 75–76), add:

```ts
  // super-admin user management
  adminCreateUser: (data: { name: string; email: string; role: Role }) => void
  adminUpdateUser: (
    id: string,
    patch: Partial<Pick<User, 'name' | 'email' | 'phone' | 'bio' | 'role'>>,
  ) => void
  adminDeleteUser: (id: string) => void
```

(`Role` and `User` are already imported in this file.)

- [ ] **Step 2: Implement the actions**

In the returned value object, immediately after the `updateProfile` action (ends ~line 203), add the three actions. Each re-derives the caller from state (not the closure) and is inert unless the caller is the super admin:

```ts
      adminCreateUser: ({ name, email, role }) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const trimmedName = name.trim()
          const trimmedEmail = email.trim()
          const lower = trimmedEmail.toLowerCase()
          if (!trimmedName || !trimmedEmail) return s
          // the reserved email can never be assigned to a new account
          if (lower === SUPER_ADMIN_EMAIL.toLowerCase()) return s
          // emails are unique (case-insensitive)
          if (s.users.some((u) => u.email.toLowerCase() === lower)) return s
          const user: User = {
            id: uid('u'),
            name: trimmedName,
            email: trimmedEmail,
            role,
          }
          return { ...s, users: [...s.users, user] }
        }),

      adminUpdateUser: (id, patch) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const target = s.users.find((u) => u.id === id)
          if (!target) return s
          const next: Partial<User> = { ...patch }
          // the super-admin account's own email is locked
          if (target.email === SUPER_ADMIN_EMAIL) delete next.email
          if (next.email !== undefined) {
            const email = next.email.trim()
            const lower = email.toLowerCase()
            if (!email) return s
            // reserved email can't be moved onto another account
            if (lower === SUPER_ADMIN_EMAIL.toLowerCase()) return s
            // unique among other users
            if (
              s.users.some(
                (u) => u.id !== id && u.email.toLowerCase() === lower,
              )
            )
              return s
            next.email = email
          }
          return {
            ...s,
            users: s.users.map((u) => (u.id === id ? { ...u, ...next } : u)),
          }
        }),

      adminDeleteUser: (id) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const target = s.users.find((u) => u.id === id)
          if (!target) return s
          // never delete the super-admin account or yourself
          if (target.email === SUPER_ADMIN_EMAIL) return s
          if (target.id === s.currentUserId) return s
          return {
            ...s,
            users: s.users.filter((u) => u.id !== id),
            // cascade: remove the deleted user's signups (no orphans)
            signups: s.signups.filter((g) => g.userId !== id),
          }
        }),
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: add guarded adminCreateUser/adminUpdateUser/adminDeleteUser actions"
```

---

## Task 5: `UserForm` component

**Files:**
- Create: `src/components/forms/UserForm.tsx`

- [ ] **Step 1: Create the form**

Create `src/components/forms/UserForm.tsx` with this exact content (modeled on `RoleForm.tsx`):

```tsx
import { useState } from 'react'
import { ROLE_LABELS, type Role, type User } from '../../types'

type UserData = {
  name: string
  email: string
  phone?: string
  bio?: string
  role: Role
}

export function UserForm({
  initial,
  lockEmail = false,
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add user',
}: {
  initial?: User
  lockEmail?: boolean
  onSubmit: (d: UserData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [role, setRole] = useState<Role>(initial?.role ?? 'volunteer')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return
        onSubmit({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          role,
        })
        if (!initial) {
          setName('')
          setEmail('')
          setPhone('')
          setBio('')
          setRole('volunteer')
        }
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        aria-label="Full name"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        aria-label="Email"
        disabled={lockEmail}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100 disabled:text-slate-400"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        aria-label="Phone"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio (optional)"
        aria-label="Bio"
        rows={2}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
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

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/UserForm.tsx
git commit -m "feat: add UserForm for super-admin user create/edit"
```

---

## Task 6: `Admin` page

**Files:**
- Create: `src/pages/Admin.tsx`

- [ ] **Step 1: Create the page**

Create `src/pages/Admin.tsx` with this exact content (mirrors `Manage.tsx` access-gate + `RoleSection.tsx` list pattern):

```tsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { SUPER_ADMIN_EMAIL } from '../types'
import { Avatar } from '../components/Avatar'
import { RoleBadge } from '../components/RoleBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { UserForm } from '../components/forms/UserForm'
import { useToast } from '../components/Toast'

export function Admin() {
  const {
    isSuperAdmin,
    currentUser,
    users,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
  } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    message?: string
    onConfirm: () => void
  } | null>(null)

  if (!isSuperAdmin) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need super admin access to view this page.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h2 className="text-2xl font-bold">Users</h2>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">All accounts</h3>
          {!adding && (
            <button
              type="button"
              onClick={() => {
                setAdding(true)
                setEditingId(null)
              }}
              className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white active:bg-brand-700"
            >
              + Add user
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
            <UserForm
              onSubmit={(d) => {
                adminCreateUser(d)
                toast(`User "${d.name}" added`)
              }}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        <ul className="space-y-3">
          {users.map((u) => {
            const isSuperAcct = u.email === SUPER_ADMIN_EMAIL
            const isSelf = u.id === currentUser?.id
            return (
              <li key={u.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === u.id ? (
                  <UserForm
                    initial={u}
                    lockEmail={isSuperAcct}
                    submitLabel="Save changes"
                    onSubmit={(d) => {
                      adminUpdateUser(u.id, d)
                      toast('User updated')
                    }}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{u.name}</p>
                      <p className="truncate text-sm text-slate-400">{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                    <button
                      type="button"
                      aria-label={`Edit ${u.name}`}
                      onClick={() => {
                        setEditingId(u.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    {!isSuperAcct && !isSelf && (
                      <button
                        type="button"
                        aria-label={`Delete ${u.name}`}
                        onClick={() =>
                          setConfirm({
                            title: `Delete ${u.name}?`,
                            message: 'This also removes their signups.',
                            onConfirm: () => {
                              adminDeleteUser(u.id)
                              toast('User deleted')
                            },
                          })
                        }
                        className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

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

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS. (The page is not yet routed; the import is verified by Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat: add Admin (Users) page with create/edit/delete"
```

---

## Task 7: Register the `/admin` route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the page**

In `src/App.tsx`, after the `import { Manage } from './pages/Manage'` line (line 10), add:

```ts
import { Admin } from './pages/Admin'
```

- [ ] **Step 2: Add the route**

In the nested route block, after the `/manage` route (line 33), add:

```tsx
        <Route path="/admin" element={<Admin />} />
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual check**

In `npm run dev`, logged in as the super admin, navigate to `/admin` directly — confirm the Users page renders. Log in as another account and navigate to `/admin` — confirm the "You need super admin access" message shows.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /admin route"
```

---

## Task 8: Gated "Users" nav item

**Files:**
- Modify: `src/components/Layout.tsx` (ICONS ~line 23; useApp ~line 39; items ~line 42)

- [ ] **Step 1: Add the icon**

In `src/components/Layout.tsx`, add a `users` entry to the `ICONS` object (after `profile`, line 28):

```ts
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
```

- [ ] **Step 2: Read the flag**

Change the `useApp()` destructure (line 39) from:

```ts
  const { currentUser, isEventManager } = useApp()
```

to:

```ts
  const { currentUser, isEventManager, isSuperAdmin } = useApp()
```

- [ ] **Step 3: Add the gated nav item**

In the `items` array, after the `isEventManager` Manage entry (lines 45–47) and before the Profile entry, add:

```tsx
    ...(isSuperAdmin
      ? [{ to: '/admin', label: 'Users', icon: ICONS.users }]
      : []),
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

In `npm run dev`: logged in as super admin, confirm a "Users" item appears in the sidebar (md+) and the mobile bottom tab bar, and routes to `/admin`. Logged in as any other account, confirm "Users" is absent.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add super-admin-only Users nav item"
```

---

## Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: type-check + Vite build succeed with no errors.

- [ ] **Step 2: Manual acceptance — super admin**

In `npm run dev`, log in as `epena@fallbrookchurch.org` and verify:
- "Users" nav item is present; `/admin` lists all accounts.
- **Add user** creates a new account that appears in the list and in the login picker.
- **Edit** changes name/phone/bio/role and persists after a page refresh.
- Editing the super-admin account shows the email field **disabled**.
- Attempting to add a user with an existing email (case-insensitive) is a no-op (no new row).
- The super-admin row and your own row show **no Delete button**.
- Deleting another user removes them; if they had signups, the affected service/event detail page's "X of Y filled" count drops accordingly.

- [ ] **Step 3: Manual acceptance — non-admin**

Log in as `pat@church.org` (Manager): confirm no "Users" nav item, and visiting `/admin` shows the access-denied message.

- [ ] **Step 4: Final commit (if any doc/cleanup changes)**

```bash
git add -A
git commit -m "chore: verify super-admin user management" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** reserved-email constant (T1) ✓; seeded account in picker (T2) ✓; `isSuperAdmin` + lifted gates (T3) ✓; full CRUD actions with all guard rails — unique email, reserved-email lock, self/super-admin delete protection, signup cascade (T4) ✓; `/admin` page with access gate, add/edit/delete, hidden delete for self & super admin (T6) ✓; route (T7) ✓; gated nav (T8) ✓; verification incl. cross-checking capacity counts after delete (T9) ✓.
- **Type consistency:** action names `adminCreateUser` / `adminUpdateUser` / `adminDeleteUser` and `isSuperAdmin` are used identically in the interface (T3/T4), the page (T6), and the nav (T8). `UserForm` prop `lockEmail` is defined (T5) and consumed (T6).
- **No test framework introduced** — consistent with `CLAUDE.md`; verification is `tsc` + manual, matching how the rest of this repo is gated.
