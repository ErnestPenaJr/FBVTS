import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { ServiceForm } from '../forms/ServiceForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function ServiceSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const {
    campuses,
    serviceTimes,
    signups,
    addServiceTime,
    updateServiceTime,
    deleteServiceTime,
    campusName,
  } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const signupsFor = (id: string) =>
    signups.filter((g) => g.kind === 'service' && g.refId === id)

  return (
    <SectionCard
      title="Service times"
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
            + Add service time
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <ServiceForm
            campuses={campuses}
            onSubmit={addServiceTime}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {serviceTimes.length === 0 ? (
        <p className="text-sm text-slate-400">No service times yet.</p>
      ) : (
        <ul className="space-y-3">
          {serviceTimes.map((s) => {
            const signed = signupsFor(s.id)
            return (
              <li key={s.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === s.id ? (
                  <ServiceForm
                    campuses={campuses}
                    initial={s}
                    existingSignups={signed}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateServiceTime(s.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {s.dayOfWeek} {s.time}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {campusName(s.campusId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${s.dayOfWeek} ${s.time}`}
                      onClick={() => {
                        setEditingId(s.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${s.dayOfWeek} ${s.time} service time`}
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete this service time?',
                          message:
                            signed.length > 0
                              ? `${signed.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
                              : undefined,
                          onConfirm: () => {
                            deleteServiceTime(s.id)
                            toast('Service time deleted')
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
