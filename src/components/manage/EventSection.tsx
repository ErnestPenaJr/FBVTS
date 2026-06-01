import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../Toast'
import { EventForm } from '../forms/EventForm'
import { SectionCard } from './SectionCard'
import type { RequestConfirm } from './types'

export function EventSection({
  requestConfirm,
}: {
  requestConfirm: RequestConfirm
}) {
  const {
    campuses,
    events,
    signups,
    addEvent,
    updateEvent,
    deleteEvent,
    campusName,
  } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const signupsFor = (id: string) =>
    signups.filter((g) => g.kind === 'event' && g.refId === id)

  return (
    <SectionCard
      title="Events"
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
            + Create event
          </button>
        )
      }
    >
      {adding && (
        <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
          <EventForm
            campuses={campuses}
            onSubmit={addEvent}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-slate-400">No events yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const signed = signupsFor(e.id)
            return (
              <li key={e.id} className="rounded-2xl border border-slate-200 p-3">
                {editingId === e.id ? (
                  <EventForm
                    campuses={campuses}
                    initial={e}
                    existingSignups={signed}
                    submitLabel="Save changes"
                    onSubmit={(d) => updateEvent(e.id, d)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.name}</p>
                      <p className="truncate text-sm text-slate-400">
                        {e.date} · {campusName(e.campusId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${e.name}`}
                      onClick={() => {
                        setEditingId(e.id)
                        setAdding(false)
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${e.name}`}
                      onClick={() =>
                        requestConfirm({
                          title: `Delete ${e.name}?`,
                          message:
                            signed.length > 0
                              ? `${signed.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
                              : undefined,
                          onConfirm: () => {
                            deleteEvent(e.id)
                            toast('Event deleted')
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
