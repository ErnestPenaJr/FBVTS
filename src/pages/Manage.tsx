import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CampusForm } from '../components/forms/CampusForm'
import { ServiceForm } from '../components/forms/ServiceForm'
import { EventForm } from '../components/forms/EventForm'

export function Manage() {
  const {
    isManager,
    isEventManager,
    campuses,
    serviceTimes,
    events,
    signups,
    addCampus,
    addServiceTime,
    addEvent,
    updateCampus,
    deleteCampus,
    deleteServiceTime,
    deleteEvent,
    campusName,
  } = useApp()
  const toast = useToast()

  const [editingCampusId, setEditingCampusId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    message?: string
    onConfirm: () => void
  } | null>(null)

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  const serviceSignupCount = (serviceId: string) =>
    signups.filter((g) => g.kind === 'service' && g.refId === serviceId).length
  const eventSignupCount = (eventId: string) =>
    signups.filter((g) => g.kind === 'event' && g.refId === eventId).length

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage</h2>

      {isManager && (
        <>
          <Card title="Add a campus">
            <CampusForm onSubmit={addCampus} />
          </Card>

          <Card title="Add a service time">
            <ServiceForm campuses={campuses} onSubmit={addServiceTime} />
            <p className="mt-3 text-center text-xs text-slate-400">
              {serviceTimes.length} service times configured
            </p>
          </Card>
        </>
      )}

      <Card title="Create an event">
        <EventForm campuses={campuses} onSubmit={addEvent} />
        <p className="mt-3 text-center text-xs text-slate-400">
          {events.length} events scheduled
        </p>
      </Card>

      {isManager && (
        <Card title="Existing campuses">
          {campuses.length === 0 ? (
            <p className="text-sm text-slate-400">No campuses yet.</p>
          ) : (
            <ul className="space-y-3">
              {campuses.map((c) => {
                const deps =
                  serviceTimes.filter((s) => s.campusId === c.id).length
                const evs = events.filter((e) => e.campusId === c.id).length
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-slate-200 p-3"
                  >
                    {editingCampusId === c.id ? (
                      <CampusForm
                        initial={c}
                        submitLabel="Save changes"
                        onSubmit={(d) => updateCampus(c.id, d)}
                        onDone={() => setEditingCampusId(null)}
                        onCancel={() => setEditingCampusId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="truncate text-sm text-slate-400">
                            {c.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Edit campus ${c.name}`}
                          onClick={() => setEditingCampusId(c.id)}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete campus ${c.name}`}
                          onClick={() =>
                            setConfirm({
                              title: `Delete ${c.name}?`,
                              message:
                                deps > 0 || evs > 0
                                  ? `This campus has ${[
                                      deps > 0 ? `${deps} service time${deps === 1 ? '' : 's'}` : null,
                                      evs > 0 ? `${evs} event${evs === 1 ? '' : 's'}` : null,
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
        </Card>
      )}

      {isManager && (
        <Card title="Existing service times">
          {serviceTimes.length === 0 ? (
            <p className="text-sm text-slate-400">No service times yet.</p>
          ) : (
            <ul className="space-y-3">
              {serviceTimes.map((s) => {
                const count = serviceSignupCount(s.id)
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {s.dayOfWeek} {s.time}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {campusName(s.campusId)}
                      </p>
                    </div>
                    <Link
                      to={`/service/${s.id}`}
                      aria-label={`Edit ${s.dayOfWeek} ${s.time}`}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      aria-label={`Delete ${s.dayOfWeek} ${s.time} service time`}
                      onClick={() =>
                        setConfirm({
                          title: 'Delete this service time?',
                          message:
                            count > 0
                              ? `${count} volunteer(s) are signed up. Deleting removes their sign-ups too.`
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
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      <Card title="Existing events">
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              const count = eventSignupCount(e.id)
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className="truncate text-sm text-slate-400">
                      {e.date} · {campusName(e.campusId)}
                    </p>
                  </div>
                  <Link
                    to={`/event/${e.id}`}
                    aria-label={`Edit ${e.name}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${e.name}`}
                    onClick={() =>
                      setConfirm({
                        title: `Delete ${e.name}?`,
                        message:
                          count > 0
                            ? `${count} volunteer(s) are signed up. Deleting removes their sign-ups too.`
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
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {!isManager && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Note: only <strong>Managers</strong> can add campuses and service times.
          As an Event Manager you can create events.
        </p>
      )}

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

export function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children}
    </section>
  )
}
