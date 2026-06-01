import { useState } from 'react'
import { useToast } from '../Toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { PositionsEditor, uid } from './PositionsEditor'
import type { AppEvent, Campus, Position, Signup } from '../../types'

type EventData = {
  name: string
  campusId: string
  date: string
  time: string
  positions: Position[]
}

export function EventForm({
  campuses,
  initial,
  existingSignups = [],
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Create event',
}: {
  campuses: Campus[]
  initial?: AppEvent
  existingSignups?: Signup[]
  onSubmit: (d: EventData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [campusId, setCampusId] = useState(
    initial?.campusId ?? campuses[0]?.id ?? '',
  )
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [{ id: uid(), title: 'Volunteer', needed: 4 }],
  )
  const [pending, setPending] = useState<EventData | null>(null)
  const toast = useToast()

  const commit = (data: EventData) => {
    onSubmit(data)
    toast(initial ? 'Event updated' : `Event "${data.name}" created`)
    if (!initial) {
      setName('')
      setDate('')
      setTime('')
      setPositions([{ id: uid(), title: 'Volunteer', needed: 4 }])
    }
    onDone?.()
  }

  const droppedSignups = (data: EventData) => {
    const keep = new Set(data.positions.map((p) => p.id))
    return existingSignups.filter((g) => !keep.has(g.positionId)).length
  }

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !campusId || !date) return
          const data: EventData = {
            name: name.trim(),
            campusId,
            date,
            time: time.trim() || 'TBD',
            positions: positions.filter((p) => p.title.trim()),
          }
          if (initial && droppedSignups(data) > 0) {
            setPending(data)
          } else {
            commit(data)
          }
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
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button className="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold text-white">
            {submitLabel}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={pending !== null}
        title="Remove positions?"
        message={
          pending
            ? `${droppedSignups(pending)} volunteer sign-up(s) are on positions you removed. Saving will drop them.`
            : undefined
        }
        confirmLabel="Save"
        onConfirm={() => {
          if (pending) commit(pending)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
