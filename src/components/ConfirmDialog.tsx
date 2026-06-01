import { useEffect, useId } from 'react'

/**
 * Generic confirm modal. Mobile-first bottom sheet that centers on sm+.
 * Large tap targets and Escape-to-cancel for accessibility. Render it
 * unconditionally and toggle with `open` — it returns null when closed.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  const titleId = useId()
  const descId = useId()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={message ? descId : undefined}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-lg font-bold">{title}</h3>
        {message && <p id={descId} className="mt-2 text-slate-600">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 active:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 font-semibold text-white ${
              destructive
                ? 'bg-red-600 active:bg-red-700'
                : 'bg-brand-600 active:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
