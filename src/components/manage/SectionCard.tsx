import type { ReactNode } from 'react'

/** Bordered section shell used in the Manage workspace: a title row with an
 *  optional action (e.g. the "+ Add" button) and the section body below. */
export function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
