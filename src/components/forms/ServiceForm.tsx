import { useState } from 'react'
import { useToast } from '../Toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { PositionsEditor, uid } from './PositionsEditor'
import type { Campus, Position, ServiceTime, Signup } from '../../types'

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

type ServiceData = {
  campusId: string
  dayOfWeek: string
  time: string
  positions: Position[]
}

export function ServiceForm({
  campuses,
  initial,
  existingSignups = [],
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add service time',
}: {
  campuses: Campus[]
  initial?: ServiceTime
  existingSignups?: Signup[]
  onSubmit: (d: ServiceData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [campusId, setCampusId] = useState(
    initial?.campusId ?? campuses[0]?.id ?? '',
  )
  const [dayOfWeek, setDay] = useState(initial?.dayOfWeek ?? 'Sunday')
  const [time, setTime] = useState(initial?.time ?? '')
  const [positions, setPositions] = useState<Position[]>(
    initial?.positions ?? [{ id: uid(), title: 'Greeter', needed: 2 }],
  )
  const [pending, setPending] = useState<ServiceData | null>(null)
  const toast = useToast()

  const commit = (data: ServiceData) => {
    onSubmit(data)
    toast(initial ? 'Service updated' : `${dayOfWeek} ${data.time} service added`)
    if (!initial) {
      setTime('')
      setPositions([{ id: uid(), title: 'Greeter', needed: 2 }])
    }
    onDone?.()
  }

  const droppedSignups = (data: ServiceData) => {
    const keep = new Set(data.positions.map((p) => p.id))
    return existingSignups.filter((g) => !keep.has(g.positionId)).length
  }

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!campusId || !time.trim()) return
          const data: ServiceData = {
            campusId,
            dayOfWeek,
            time: time.trim(),
            positions: positions.filter((p) => p.title.trim()),
          }
          if (initial && droppedSignups(data) > 0) {
            setPending(data)
          } else {
            commit(data)
          }
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
