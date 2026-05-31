import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import { Avatar } from './Avatar'
import type { Position } from '../types'

/**
 * Manager-only roster: shows who has signed up for each position and lets a
 * manager remove a volunteer. Hidden from regular volunteers for privacy.
 */
export function Roster({
  kind,
  refId,
  positions,
}: {
  kind: 'service' | 'event'
  refId: string
  positions: Position[]
}) {
  const { signups, users, cancelSignup, isEventManager } = useApp()
  const toast = useToast()

  if (!isEventManager) return null

  return (
    <section className="mt-8">
      <h3 className="mb-3 text-lg font-bold">Roster</h3>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {positions.map((p) => {
          const signed = signups.filter(
            (g) => g.kind === kind && g.refId === refId && g.positionId === p.id,
          )
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold">{p.title}</h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    signed.length >= p.needed
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {signed.length} / {p.needed}
                </span>
              </div>
              {signed.length === 0 ? (
                <p className="text-sm text-slate-400">No one signed up yet.</p>
              ) : (
                <ul className="space-y-2">
                  {signed.map((g) => {
                    const u = users.find((x) => x.id === g.userId)
                    if (!u) return null
                    return (
                      <li key={g.id} className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {u.name}
                          </span>
                          {u.phone && (
                            <span className="block truncate text-xs text-slate-400">
                              {u.phone}
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            cancelSignup(g.id)
                            toast(`Removed ${u.name} from ${p.title}`)
                          }}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-50"
                          aria-label={`Remove ${u.name} from ${p.title}`}
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
