import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLE_LABELS, type Role } from '../types'
import { RoleBadge } from '../components/RoleBadge'
import { Avatar } from '../components/Avatar'

export function Login() {
  const { users, login, register } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'pick' | 'register'>('pick')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('volunteer')

  const go = () => navigate('/', { replace: true })

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-brand-700 px-6 py-10 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Volunteer Scheduler
        </h1>
        <p className="mt-2 text-brand-100">
          Sign up to serve at services and events.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
        {mode === 'pick' ? (
          <>
            <h2 className="mb-3 text-lg font-bold">Choose a demo account</h2>
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => {
                      login(u.id)
                      go()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left active:bg-slate-50"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="flex-1">
                      <span className="block font-semibold">{u.name}</span>
                      <span className="block text-sm text-slate-500">
                        {u.email}
                      </span>
                    </span>
                    <RoleBadge role={u.role} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setMode('register')}
              className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:bg-brand-700"
            >
              Register a new account
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim() || !email.trim()) return
              register({ name: name.trim(), email: email.trim(), role })
              go()
            }}
          >
            <h2 className="mb-3 text-lg font-bold">Register</h2>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
                placeholder="Your name"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
                placeholder="you@example.com"
              />
            </label>
            <fieldset className="mb-4">
              <legend className="mb-1 text-sm font-medium">I am signing up as</legend>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                      role === r
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="h-5 w-5 accent-brand-600"
                    />
                    <span className="font-medium">{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:bg-brand-700"
            >
              Create account &amp; continue
            </button>
            <button
              type="button"
              onClick={() => setMode('pick')}
              className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-slate-500"
            >
              ← Back to demo accounts
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
