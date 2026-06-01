import { useApp } from '../../context/AppContext'
import type { Position } from '../../types'

/** Short client-side id for new positions added in the editor. */
export const uid = () => Math.random().toString(36).slice(2, 8)

export function PositionsEditor({
  positions,
  setPositions,
}: {
  positions: Position[]
  setPositions: (p: Position[]) => void
}) {
  const { volunteerRoles } = useApp()

  if (volunteerRoles.length === 0) {
    return (
      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-600">Positions</span>
        <p className="text-sm text-slate-400">
          No volunteer roles defined yet. A Manager can add them under Manage →
          Volunteer roles.
        </p>
      </div>
    )
  }

  const usedRoleIds = new Set(positions.map((p) => p.roleId))
  const firstUnused = volunteerRoles.find((r) => !usedRoleIds.has(r.id))

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-600">Positions</span>
      {positions.map((p, i) => (
        <div key={p.id} className="flex gap-2">
          <select
            value={p.roleId}
            onChange={(e) =>
              setPositions(
                positions.map((x, j) =>
                  j === i ? { ...x, roleId: e.target.value } : x,
                ),
              )
            }
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
            aria-label="Volunteer role"
          >
            {volunteerRoles.map((r) => (
              <option
                key={r.id}
                value={r.id}
                disabled={r.id !== p.roleId && usedRoleIds.has(r.id)}
              >
                {r.name}
              </option>
            ))}
          </select>
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
        onClick={() => {
          if (!firstUnused) return
          setPositions([
            ...positions,
            { id: uid(), roleId: firstUnused.id, needed: firstUnused.defaultNeeded ?? 1 },
          ])
        }}
        disabled={!firstUnused}
        className="text-sm font-semibold text-brand-700 disabled:text-slate-300"
      >
        + Add position
      </button>
    </div>
  )
}
