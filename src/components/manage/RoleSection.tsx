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
                        {r.defaultNeeded != null && (
                          <span className="font-normal text-slate-400">
                            {' '}· needs {r.defaultNeeded}
                          </span>
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
