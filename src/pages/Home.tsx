import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CalendarMonth } from '../components/CalendarMonth'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function Home() {
  const { serviceTimes, events, campusName, currentUser } = useApp()
  const [tab, setTab] = useState<'services' | 'events'>('services')

  return (
    <div>
      <p className="text-slate-500">Welcome back,</p>
      <h2 className="mb-4 text-2xl font-bold">{currentUser?.name} 👋</h2>

      <div className="hidden md:block">
        <CalendarMonth />
      </div>

      <div className="md:hidden">
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
        role="tablist"
      >
        {(['services', 'events'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-brand-700 shadow' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'services' ? (
        serviceTimes.length === 0 ? (
          <EmptyState
            title="No services yet"
            body="Once a Manager adds campus service times, they'll show up here to sign up for."
          />
        ) : (
        <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {serviceTimes.map((s) => (
            <li key={s.id}>
              <Link
                to={`/service/${s.id}`}
                className="block rounded-2xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">
                    {s.dayOfWeek} {s.time}
                  </h3>
                  <span className="text-brand-700">→</span>
                </div>
                <p className="text-slate-500">{campusName(s.campusId)}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {s.positions.length} positions ·{' '}
                  {s.positions.reduce((n, p) => n + p.needed, 0)} spots
                </p>
              </Link>
            </li>
          ))}
        </ul>
        )
      ) : events.length === 0 ? (
        <EmptyState
          title="No events yet"
          body="Upcoming events created by an Event Manager will appear here."
        />
      ) : (
        <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                to={`/event/${e.id}`}
                className="block rounded-2xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">{e.name}</h3>
                  <span className="text-brand-700">→</span>
                </div>
                <p className="text-slate-500">
                  {formatDate(e.date)} · {e.time}
                </p>
                <p className="text-sm text-slate-400">{campusName(e.campusId)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <h3 className="mb-1 text-lg font-bold text-slate-700">{title}</h3>
      <p className="text-slate-500">{body}</p>
    </div>
  )
}
