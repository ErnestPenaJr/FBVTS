import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function Schedule() {
  const { signups, currentUser, serviceTimes, events, campusName, cancelSignup, roleName } =
    useApp()
  const toast = useToast()

  const mine = signups.filter((g) => g.userId === currentUser?.id)

  if (mine.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">My Schedule</h2>
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <p className="mb-3">You haven’t signed up for anything yet.</p>
          <Link
            to="/"
            className="inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white"
          >
            Browse opportunities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">My Schedule</h2>
      <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {mine.map((g) => {
          let title = ''
          let subtitle = ''
          let positionTitle = ''
          let to = '/'
          if (g.kind === 'service') {
            const s = serviceTimes.find((x) => x.id === g.refId)
            if (s) {
              title = `${s.dayOfWeek} ${s.time}`
              subtitle = campusName(s.campusId)
              const pos = s.positions.find((p) => p.id === g.positionId)
              positionTitle = pos ? roleName(pos.roleId) : ''
              to = `/service/${s.id}`
            }
          } else {
            const e = events.find((x) => x.id === g.refId)
            if (e) {
              title = e.name
              subtitle = `${formatDate(e.date)} · ${e.time}`
              const pos = e.positions.find((p) => p.id === g.positionId)
              positionTitle = pos ? roleName(pos.roleId) : ''
              to = `/event/${e.id}`
            }
          }
          return (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
            >
              <Link to={to} className="flex-1">
                <span className="mb-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                  {positionTitle}
                </span>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </Link>
              <button
                onClick={() => {
                  cancelSignup(g.id)
                  toast('Sign-up cancelled')
                }}
                className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-slate-50"
              >
                Cancel
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
