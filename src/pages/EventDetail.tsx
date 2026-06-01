import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'
import { Roster } from '../components/Roster'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EventForm } from '../components/forms/EventForm'
import { useToast } from '../components/Toast'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    events,
    campuses,
    users,
    signups,
    isEventManager,
    updateEvent,
    deleteEvent,
  } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const event = events.find((e) => e.id === id)
  if (!event) {
    return (
      <div className="py-10 text-center text-slate-500">
        <p>That event couldn't be found.</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
          Back home
        </Link>
      </div>
    )
  }

  const campus = campuses.find((c) => c.id === event.campusId)
  const manager = users.find((u) => u.id === event.managerId)
  const existingSignups = signups.filter(
    (g) => g.kind === 'event' && g.refId === event.id,
  )

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All events
      </Link>

      {editing ? (
        <section className="mt-3 rounded-2xl border border-slate-200 p-4" aria-labelledby="edit-event-title">
          <h3 id="edit-event-title" className="mb-3 text-lg font-bold">Edit event</h3>
          <EventForm
            campuses={campuses}
            initial={event}
            existingSignups={existingSignups}
            submitLabel="Save changes"
            onSubmit={(d) => updateEvent(event.id, d)}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-bold">{event.name}</h2>
          <p className="text-slate-500">
            {formatDate(event.date)} · {event.time}
          </p>
          <p className="text-sm text-slate-400">{campus?.name}</p>
          {manager && (
            <p className="mt-1 text-sm text-slate-400">
              Event Manager: {manager.name}
            </p>
          )}

          {isEventManager && (
            <div className="mb-5 mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 active:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 active:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}

          <h3 className="mb-3 mt-4 text-lg font-bold">Positions</h3>
          <PositionList kind="event" refId={event.id} positions={event.positions} />
          <Roster kind="event" refId={event.id} positions={event.positions} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        message={
          existingSignups.length > 0
            ? `${existingSignups.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
            : undefined
        }
        onConfirm={() => {
          deleteEvent(event.id)
          toast('Event deleted')
          navigate('/')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
