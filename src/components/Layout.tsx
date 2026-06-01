import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'
import { RoleBadge } from './RoleBadge'

function Icon({ d, className = 'h-6 w-6' }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
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

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

export function Layout() {
  const { currentUser, isEventManager } = useApp()
  const { pathname } = useLocation()

  const items: NavItem[] = [
    { to: '/', label: 'Home', icon: ICONS.home, end: true },
    { to: '/schedule', label: 'My Schedule', icon: ICONS.schedule },
    ...(isEventManager
      ? [{ to: '/manage', label: 'Manage', icon: ICONS.manage }]
      : []),
    { to: '/profile', label: 'Profile', icon: ICONS.profile },
  ]

  return (
    <div className="min-h-dvh bg-slate-100 md:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5 text-brand-700">
          <Icon d={ICONS.schedule} className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight">
            Volunteer Scheduler
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon d={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {currentUser && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 border-t border-slate-100 px-4 py-4 hover:bg-slate-50"
          >
            <Avatar user={currentUser} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {currentUser.name}
              </span>
              <span className="mt-0.5 block">
                <RoleBadge role={currentUser.role} />
              </span>
            </span>
          </NavLink>
        )}
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-brand-700 px-4 py-3 text-white md:hidden">
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

      {/* Main content */}
      <div className="flex min-h-dvh flex-1 flex-col md:pl-64">
        <main
          className={
            pathname === '/manage'
              ? 'mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:max-w-6xl md:px-8 md:pt-8 md:pb-12'
              : 'mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-12'
          }
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <Icon d={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
