import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import type { Position } from '../types'

const uid = () => Math.random().toString(36).slice(2, 8)

function PositionsEditor({
  positions,
  setPositions,
}: {
  positions: Position[]
  setPositions: (p: Position[]) => void
}) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-600">Positions</span>
      {positions.map((p, i) => (
        <div key={p.id} className="flex gap-2">
          <input
            value={p.title}
            onChange={(e) =>
              setPositions(
                positions.map((x, j) =>
                  j === i ? { ...x, title: e.target.value } : x,
                ),
              )
            }
            placeholder="Role title"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            type="number"
            min={1}
            value={p.needed}
            onChange={(e) =>
              setPositions(
                positions.map((x, j) =>
                  j === i ? { ...x, needed: Math.max(1, +e.target.value) } : x,
                ),
              )
            }
            className="w-20 rounded-xl border border-slate-300 px-3 py-2.5"
            aria-label="Spots needed"
          />
          <button
            type="button"
            onClick={() => setPositions(positions.filter((_, j) => j !== i))}
            className="rounded-xl border border-slate-300 px-3 text-slate-500"
            aria-label="Remove position"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPositions([...positions, { id: uid(), title: '', needed: 1 }])}
        className="text-sm font-semibold text-brand-700"
      >
        + Add position
      </button>
    </div>
  )
}

export function Manage() {
  const {
    isManager,
    isEventManager,
    campuses,
    addCampus,
    addServiceTime,
    addEvent,
    serviceTimes,
    events,
  } = useApp()

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage</h2>

      {isManager && (
        <>
          <CampusForm onSubmit={addCampus} />
          <ServiceForm
            campuses={campuses}
            onSubmit={addServiceTime}
            count={serviceTimes.length}
          />
        </>
      )}

      <EventForm campuses={campuses} onSubmit={addEvent} count={events.length} />

      {!isManager && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Note: only <strong>Managers</strong> can add campuses and service times.
          As an Event Manager you can create events.
        </p>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children}
    </section>
  )
}

function CampusForm({
  onSubmit,
}: {
  onSubmit: (d: { name: string; address: string }) => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const toast = useToast()
  return (
    <Card title="Add a campus">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSubmit({ name: name.trim(), address: address.trim() })
          toast(`Campus "${name.trim()}" added`)
          setName('')
          setAddress('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campus name"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
        <button className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
          Add campus
        </button>
      </form>
    </Card>
  )
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ServiceForm({
  campuses,
  onSubmit,
  count,
}: {
  campuses: { id: string; name: string }[]
  onSubmit: (d: {
    campusId: string
    dayOfWeek: string
    time: string
    positions: Position[]
  }) => void
  count: number
}) {
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [dayOfWeek, setDay] = useState('Sunday')
  const [time, setTime] = useState('')
  const [positions, setPositions] = useState<Position[]>([
    { id: uid(), title: 'Greeter', needed: 2 },
  ])
  const toast = useToast()

  return (
    <Card title="Add a service time">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!campusId || !time.trim()) return
          onSubmit({
            campusId,
            dayOfWeek,
            time: time.trim(),
            positions: positions.filter((p) => p.title.trim()),
          })
          toast(`${dayOfWeek} ${time.trim()} service added`)
          setTime('')
          setPositions([{ id: uid(), title: 'Greeter', needed: 2 }])
        }}
      >
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDay(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          >
            {DAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="9:00 AM"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </div>
        <PositionsEditor positions={positions} setPositions={setPositions} />
        <button className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
          Add service time
        </button>
        <p className="text-center text-xs text-slate-400">
          {count} service times configured
        </p>
      </form>
    </Card>
  )
}

function EventForm({
  campuses,
  onSubmit,
  count,
}: {
  campuses: { id: string; name: string }[]
  onSubmit: (d: {
    name: string
    campusId: string
    date: string
    time: string
    positions: Position[]
  }) => void
  count: number
}) {
  const [name, setName] = useState('')
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [positions, setPositions] = useState<Position[]>([
    { id: uid(), title: 'Volunteer', needed: 4 },
  ])
  const toast = useToast()

  return (
    <Card title="Create an event">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !campusId || !date) return
          onSubmit({
            name: name.trim(),
            campusId,
            date,
            time: time.trim() || 'TBD',
            positions: positions.filter((p) => p.title.trim()),
          })
          toast(`Event "${name.trim()}" created`)
          setName('')
          setDate('')
          setTime('')
          setPositions([{ id: uid(), title: 'Volunteer', needed: 4 }])
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
        <select
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="8:00 AM"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </div>
        <PositionsEditor positions={positions} setPositions={setPositions} />
        <button className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
          Create event
        </button>
        <p className="text-center text-xs text-slate-400">
          {count} events scheduled
        </p>
      </form>
    </Card>
  )
}
