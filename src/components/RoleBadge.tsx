import { ROLE_LABELS, type Role } from '../types'

const styles: Record<Role, string> = {
  volunteer: 'bg-slate-100 text-slate-700',
  manager: 'bg-brand-100 text-brand-800',
  event_manager: 'bg-amber-100 text-amber-800',
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
