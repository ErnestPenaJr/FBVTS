import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// dayOfWeek is stored as full names from ServiceForm's DAYS array, indexed by
// Date.getDay() (0 = Sunday). Using a fixed array is locale-proof.
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MAX_PILLS = 3

interface Occurrence {
  key: string
  kind: 'service' | 'event'
  title: string
  to: string
  time: string
  isMine: boolean
}

/** Local yyyy-mm-dd key (matches AppEvent.date format). */
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a free-text 12-hour time like "9:00 AM" to minutes-since-midnight for sorting. */
function timeToMinutes(t: string): number {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ap = m[3]?.toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return h * 60 + min
}

/** All days from the Sunday on/before the 1st through the Saturday on/after the last. */
function buildGridDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const last = new Date(year, month + 1, 0)
  const end = new Date(year, month, last.getDate() + (6 - last.getDay()))
  const days: Date[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

export function CalendarMonth() {
  const { serviceTimes, events, signups, currentUser } = useApp()
  const today = new Date()
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const gridDays = buildGridDays(view.year, view.month)
  const firstKey = dayKey(gridDays[0])
  const lastKey = dayKey(gridDays[gridDays.length - 1])
  const todayKey = dayKey(today)

  const mine = (kind: 'service' | 'event', refId: string) =>
    signups.some(
      (g) => g.userId === currentUser?.id && g.kind === kind && g.refId === refId,
    )

  const byDay = new Map<string, Occurrence[]>()
  const push = (key: string, occ: Occurrence) => {
    const arr = byDay.get(key) ?? []
    arr.push(occ)
    byDay.set(key, arr)
  }

  // One-off events on their exact date (within the visible range).
  for (const e of events) {
    if (e.date >= firstKey && e.date <= lastKey) {
      push(e.date, {
        key: `event:${e.id}`,
        kind: 'event',
        title: e.name,
        to: `/event/${e.id}`,
        time: e.time,
        isMine: mine('event', e.id),
      })
    }
  }

  // Recurring services projected onto every matching weekday.
  for (const d of gridDays) {
    const wd = WEEKDAYS[d.getDay()]
    const k = dayKey(d)
    for (const s of serviceTimes) {
      if (s.dayOfWeek === wd) {
        push(k, {
          key: `service:${s.id}`,
          kind: 'service',
          title: s.time,
          to: `/service/${s.id}`,
          time: s.time,
          isMine: mine('service', s.id),
        })
      }
    }
  }

  for (const arr of byDay.values()) {
    arr.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  }

  const totalThisMonth = gridDays
    .filter((d) => d.getMonth() === view.month)
    .reduce((n, d) => n + (byDay.get(dayKey(d))?.length ?? 0), 0)

  const goMonth = (delta: number) =>
    setView((v) => {
      const m = v.month + delta
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
    })
  const goToday = () =>
    setView({ year: today.getFullYear(), month: today.getMonth() })
  const toggleDay = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold">
          {MONTHS[view.month]} {view.year}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="Next month"
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_ABBR.map((w) => (
          <div
            key={w}
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-brand-700"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {gridDays.map((d) => {
          const k = dayKey(d)
          const inMonth = d.getMonth() === view.month
          const isToday = k === todayKey
          const occs = byDay.get(k) ?? []
          const isExpanded = expanded.has(k)
          const shown = isExpanded ? occs : occs.slice(0, MAX_PILLS)
          const hidden = occs.length - shown.length
          const countLabel =
            occs.length === 0
              ? 'no items'
              : occs.length === 1
                ? '1 item'
                : `${occs.length} items`
          return (
            <div
              key={k}
              aria-label={`${MONTHS[d.getMonth()]} ${d.getDate()}, ${countLabel}`}
              className={`min-h-20 rounded-xl border p-1.5 ${
                inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
              } ${isToday ? 'ring-2 ring-brand-500' : ''}`}
            >
              <div
                className={`mb-1 text-right text-xs ${
                  inMonth ? 'text-slate-500' : 'text-slate-300'
                } ${isToday ? 'font-bold text-brand-700' : ''}`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {shown.map((o) => (
                  <Link
                    key={o.key}
                    to={o.to}
                    className={`block truncate rounded-md px-1.5 py-1 text-xs font-semibold ${
                      o.kind === 'service'
                        ? o.isMine
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-100 text-brand-800'
                        : o.isMine
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-fuchsia-100 text-fuchsia-800'
                    }`}
                  >
                    {o.isMine ? '✓ ' : ''}
                    {o.title}
                  </Link>
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleDay(k)}
                    className="block w-full rounded-md px-1.5 py-1 text-left text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    +{hidden} more
                  </button>
                )}
                {isExpanded && occs.length > MAX_PILLS && (
                  <button
                    type="button"
                    onClick={() => toggleDay(k)}
                    className="block w-full rounded-md px-1.5 py-1 text-left text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalThisMonth === 0 && (
        <p className="mt-4 text-center text-sm text-slate-400">
          Nothing scheduled this month.
        </p>
      )}
    </div>
  )
}
