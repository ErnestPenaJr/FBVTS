import { useState } from 'react'
import { useToast } from '../Toast'
import type { Campus } from '../../types'

export function CampusForm({
  initial,
  onSubmit,
  onDone,
  onCancel,
  submitLabel = 'Add campus',
}: {
  initial?: Campus
  onSubmit: (d: { name: string; address: string }) => void
  onDone?: () => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const toast = useToast()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSubmit({ name: name.trim(), address: address.trim() })
        toast(initial ? 'Campus updated' : `Campus "${name.trim()}" added`)
        if (!initial) {
          setName('')
          setAddress('')
        }
        onDone?.()
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Campus name"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
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
