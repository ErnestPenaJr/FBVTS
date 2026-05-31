import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { Avatar } from '../components/Avatar'
import { RoleBadge } from '../components/RoleBadge'
import { ROLE_LABELS, type FontScale, type Role } from '../types'

export function Profile() {
  const {
    currentUser,
    updateProfile,
    switchRole,
    logout,
    settings,
    setFontScale,
  } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser?.name ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [bio, setBio] = useState(currentUser?.bio ?? '')

  if (!currentUser) return null

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      updateProfile({ photoUrl: reader.result as string })
      toast('Photo updated')
    }
    reader.readAsDataURL(file)
  }

  const fontOptions: { value: FontScale; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Default' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Largest' },
  ]

  return (
    <div className="space-y-6">
      {/* Profile header with photo */}
      <section className="flex flex-col items-center text-center">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative"
          aria-label="Change profile photo"
        >
          <Avatar user={currentUser} size="lg" />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow ring-2 ring-white">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="hidden"
        />
        <h2 className="mt-3 text-2xl font-bold">{currentUser.name}</h2>
        <p className="text-slate-500">{currentUser.email}</p>
        <div className="mt-2">
          <RoleBadge role={currentUser.role} />
        </div>
      </section>

      {/* Profile details / edit */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Profile</h3>
          <button
            onClick={() => {
              if (editing) {
                updateProfile({ name: name.trim() || currentUser.name, phone, bio })
                toast('Profile saved')
              }
              setEditing(!editing)
            }}
            className="text-sm font-semibold text-brand-700"
          >
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </Field>
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="555-0000"
              />
            </Field>
            <Field label="About me">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </Field>
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <Row label="Phone" value={currentUser.phone || '—'} />
            <Row label="About" value={currentUser.bio || '—'} />
          </dl>
        )}
      </section>

      {/* Settings */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="mb-3 text-lg font-bold">Settings</h3>

        <p className="mb-1 text-sm font-medium text-slate-600">Text size</p>
        <p className="mb-2 text-xs text-slate-400">
          Default is sized for easy reading. Choose Compact for a denser layout.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {fontOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setFontScale(o.value)}
              aria-pressed={settings.fontScale === o.value}
              className={`rounded-xl border py-2.5 text-sm font-semibold ${
                settings.fontScale === o.value
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-medium text-slate-600">
          Switch role (demo)
        </p>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                switchRole(r)
                toast(`Now viewing as ${ROLE_LABELS[r]}`)
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                currentUser.role === r
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {ROLE_LABELS[r]}
              {currentUser.role === r && <span>✓</span>}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          logout()
          navigate('/login', { replace: true })
        }}
        className="w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-600 active:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
