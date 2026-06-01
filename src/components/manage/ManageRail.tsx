import type { RailItem, SectionKey } from './types'

/** Desktop-only left rail. Hidden below md (mobile shows all sections stacked,
 *  so no section switcher is needed there). */
export function ManageRail({
  items,
  active,
  onSelect,
}: {
  items: RailItem[]
  active: SectionKey
  onSelect: (key: SectionKey) => void
}) {
  return (
    <nav
      aria-label="Manage sections"
      className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:self-start md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-2"
    >
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.count}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
