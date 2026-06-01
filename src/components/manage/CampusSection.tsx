import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { CampusForm } from '../forms/CampusForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function CampusSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const { campuses, serviceTimes, events, addCampus, updateCampus, deleteCampus } =
    useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <SectionCard
      title="Campuses"
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
            + Add campus
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <CampusForm
            onSubmit={addCampus}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {campuses.length === 0 ? (
        <p className="text-sm text-slate-400">No campuses yet.</p>
      ) : (
        <ul className="space-y-3">
          {campuses.map((c) => {
            const deps = serviceTimes.filter((s) => s.campusId === c.id).length
            const evs = events.filter((e) => e.campusId === c.id).length
            return (
              <li key={c.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === c.id ? (
                  <CampusForm
                    initial={c}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateCampus(c.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-sm text-slate-400">{c.address}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit campus ${c.name}`}
                      onClick={() => {
                        setEditingId(c.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete campus ${c.name}`}
                      onClick={() =>
                        requestConfirm({
                          title: `Delete ${c.name}?`,
                          message:
                            deps > 0 || evs > 0
                              ? `This campus has ${[
                                  deps > 0
                                    ? `${deps} service time${deps === 1 ? '' : 's'}`
                                    : null,
                                  evs > 0
                                    ? `${evs} event${evs === 1 ? '' : 's'}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' and ')}. All of them and their sign-ups will be removed.`
                              : undefined,
                          onConfirm: () => {
                            deleteCampus(c.id)
                            toast('Campus deleted')
                          },
                        })
                      }
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
