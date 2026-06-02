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
