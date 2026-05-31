import { useApp } from '../context/AppContext'
import { useToast } from './Toast'
import type { Position } from '../types'

export function PositionList({
  kind,
  refId,
  positions,
}: {
  kind: 'service' | 'event'
  refId: string
  positions: Position[]
}) {
  const { signups, currentUser, signUp, cancelSignup, positionFilled } = useApp()
  const toast = useToast()

  return (
    <ul className="space-y-3">
      {positions.map((p) => {
        const filled = positionFilled(kind, refId, p.id)
        const mySignup = signups.find(
          (g) =>
            g.userId === currentUser?.id &&
            g.kind === kind &&
            g.refId === refId &&
            g.positionId === p.id,
        )
        const isFull = filled >= p.needed
        return (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex-1">
              <h4 className="text-base font-semibold">{p.title}</h4>
              <p className="text-sm text-slate-500">
                {filled} of {p.needed} filled
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.min(100, (filled / p.needed) * 100)}%` }}
                />
              </div>
            </div>
            {mySignup ? (
              <button
                onClick={() => {
                  cancelSignup(mySignup.id)
                  toast('Sign-up cancelled')
                }}
                className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 active:bg-slate-50"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => {
                  signUp(kind, refId, p.id)
                  toast(`You're signed up for ${p.title} 🎉`)
                }}
                disabled={isFull}
                className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isFull ? 'Full' : 'Sign up'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
