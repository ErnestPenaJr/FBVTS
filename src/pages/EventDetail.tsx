import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'
import { Roster } from '../components/Roster'

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
  const { events, campuses, users } = useApp()
  const event = events.find((e) => e.id === id)

  if (!event) {
    return (
      <div className="py-10 text-center text-slate-500">
        <p>That event couldn’t be found.</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
          Back home
        </Link>
      </div>
    )
  }
  const campus = campuses.find((c) => c.id === event.campusId)
  const manager = users.find((u) => u.id === event.managerId)

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All events
      </Link>
      <h2 className="mt-2 text-2xl font-bold">{event.name}</h2>
      <p className="text-slate-500">
        {formatDate(event.date)} · {event.time}
      </p>
      <p className="text-sm text-slate-400">{campus?.name}</p>
      {manager && (
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Event Manager: {manager.name}
        </p>
      )}

      <h3 className="mb-3 mt-4 text-lg font-bold">Positions</h3>
      <PositionList kind="event" refId={event.id} positions={event.positions} />
      <Roster kind="event" refId={event.id} positions={event.positions} />
    </div>
  )
}
