import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'

const navBase =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors'

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  schedule:
    'M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  manage: 'M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
}

export function Layout() {
  const { currentUser, isEventManager } = useApp()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-brand-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Icon d={ICONS.schedule} />
          <h1 className="text-lg font-bold tracking-tight">Volunteer Scheduler</h1>
        </div>
        {currentUser && (
          <NavLink to="/profile" aria-label="Your profile">
            <Avatar user={currentUser} size="sm" />
          </NavLink>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <Tab to="/" label="Home" icon={ICONS.home} end />
        <Tab to="/schedule" label="My Schedule" icon={ICONS.schedule} />
        {isEventManager && <Tab to="/manage" label="Manage" icon={ICONS.manage} />}
        <Tab to="/profile" label="Profile" icon={ICONS.profile} />
      </nav>
    </div>
  )
}

function Tab({
  to,
  label,
  icon,
  end,
}: {
  to: string
  label: string
  icon: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${navBase} ${isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'}`
      }
    >
      <Icon d={icon} />
      <span>{label}</span>
    </NavLink>
  )
}
