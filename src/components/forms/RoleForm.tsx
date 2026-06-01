import { useState } from 'react'
import { useToast } from '../Toast'
import type { VolunteerRole } from '../../types'

type RoleData = {
  name: string
  description?: string
  defaultNeeded?: number
  category?: string
}

export function RoleForm({
  initial,
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add role',
}: {
  initial?: VolunteerRole
  onSubmit: (d: RoleData) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [defaultNeeded, setDefaultNeeded] = useState(
    initial?.defaultNeeded?.toString() ?? '',
  )
  const toast = useToast()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        const parsed = parseInt(defaultNeeded, 10)
        onSubmit({
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          defaultNeeded: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
        })
        toast(initial ? 'Role updated' : `Role "${name.trim()}" added`)
        if (!initial) {
          setName('')
          setCategory('')
          setDescription('')
          setDefaultNeeded('')
        }
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Role name (e.g. Greeter)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (e.g. Hospitality)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        rows={2}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        type="number"
        min={1}
        value={defaultNeeded}
        onChange={(e) => setDefaultNeeded(e.target.value)}
        placeholder="Default spots needed (optional)"
        aria-label="Default spots needed"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
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
  )
}
