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
