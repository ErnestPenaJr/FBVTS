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
