import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppEvent,
  Campus,
  FontScale,
  Position,
  Role,
  ServiceTime,
  Settings,
  Signup,
  User,
  VolunteerRole,
} from '../types'
import { SUPER_ADMIN_EMAIL } from '../types'
import {
  seedCampuses,
  seedEvents,
  seedServiceTimes,
  seedSignups,
  seedUsers,
  seedVolunteerRoles,
} from '../data/mockData'

const STORAGE_KEY = 'fbvts-state-v3'

interface PersistedState {
  users: User[]
  volunteerRoles: VolunteerRole[]
  campuses: Campus[]
  serviceTimes: ServiceTime[]
  events: AppEvent[]
  signups: Signup[]
  currentUserId: string | null
  settings: Settings
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedState
  } catch {
    // ignore corrupt storage and reseed
  }
  return {
    users: seedUsers,
    volunteerRoles: seedVolunteerRoles,
    campuses: seedCampuses,
    serviceTimes: seedServiceTimes,
    events: seedEvents,
    signups: seedSignups,
    currentUserId: null,
    settings: { fontScale: 'normal' },
  }
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

interface AppContextValue extends PersistedState {
  currentUser: User | null
  isManager: boolean
  isEventManager: boolean
  isSuperAdmin: boolean
  // auth
  register: (data: { name: string; email: string; role: Role }) => void
  login: (userId: string) => void
  logout: () => void
  switchRole: (role: Role) => void
  // profile
  updateProfile: (patch: Partial<User>) => void
  setFontScale: (scale: FontScale) => void
  // super-admin user management
  adminCreateUser: (data: {
    name: string
    email: string
    phone?: string
    bio?: string
    role: Role
  }) => void
  adminUpdateUser: (
    id: string,
    patch: Partial<Pick<User, 'name' | 'email' | 'phone' | 'bio' | 'role'>>,
  ) => void
  adminDeleteUser: (id: string) => void
  // volunteer roles (catalog)
  addRole: (data: {
    name: string
    description?: string
    defaultNeeded?: number
    category?: string
  }) => void
  updateRole: (
    id: string,
    patch: {
      name: string
      description?: string
      defaultNeeded?: number
      category?: string
    },
  ) => void
  deleteRole: (id: string) => void
  roleName: (roleId: string) => string
  roleUsage: (roleId: string) => { services: number; events: number }
  // manager actions
  addCampus: (data: { name: string; address: string }) => void
  addServiceTime: (data: {
    campusId: string
    dayOfWeek: string
    time: string
    positions: Position[]
  }) => void
  addEvent: (data: {
    name: string
    campusId: string
    date: string
    time: string
    positions: Position[]
  }) => void
  updateCampus: (id: string, patch: { name: string; address: string }) => void
  deleteCampus: (id: string) => void
  updateServiceTime: (
    id: string,
    patch: {
      campusId: string
      dayOfWeek: string
      time: string
      positions: Position[]
    },
  ) => void
  deleteServiceTime: (id: string) => void
  updateEvent: (
    id: string,
    patch: {
      name: string
      campusId: string
      date: string
      time: string
      positions: Position[]
    },
  ) => void
  deleteEvent: (id: string) => void
  // signups
  signUp: (kind: 'service' | 'event', refId: string, positionId: string) => void
  cancelSignup: (signupId: string) => void
  campusName: (campusId: string) => string
  positionFilled: (kind: 'service' | 'event', refId: string, positionId: string) => number
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Apply accessible font scaling at the document root. The default
  // ("normal") is intentionally a bit larger than a typical web baseline so
  // it's comfortable for older volunteers, while "compact" lets anyone who
  // prefers a denser layout dial it back. Because all spacing uses rem, this
  // scales fonts, forms, buttons, and gaps together.
  useEffect(() => {
    const px = {
      compact: '16px',
      normal: '18px',
      large: '20px',
      xlarge: '23px',
    }[state.settings.fontScale]
    document.documentElement.style.fontSize = px
  }, [state.settings.fontScale])

  const currentUser =
    state.users.find((u) => u.id === state.currentUserId) ?? null

  const value = useMemo<AppContextValue>(() => {
    const superAdmin = currentUser?.email === SUPER_ADMIN_EMAIL
    const update = (patch: Partial<PersistedState>) =>
      setState((s) => ({ ...s, ...patch }))

    return {
      ...state,
      currentUser,
      isManager: currentUser?.role === 'manager' || superAdmin,
      isEventManager:
        currentUser?.role === 'event_manager' ||
        currentUser?.role === 'manager' ||
        superAdmin,
      isSuperAdmin: superAdmin,

      register: ({ name, email, role }) => {
        // the reserved super-admin email can't be claimed via self-registration
        if (email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return
        const user: User = { id: uid('u'), name, email, role }
        setState((s) => ({
          ...s,
          users: [...s.users, user],
          currentUserId: user.id,
        }))
      },
      login: (userId) => update({ currentUserId: userId }),
      logout: () => update({ currentUserId: null }),
      switchRole: (role) =>
        setState((s) => ({
          ...s,
          users: s.users.map((u) =>
            u.id === s.currentUserId ? { ...u, role } : u,
          ),
        })),

      updateProfile: (patch) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          const next: Partial<User> = { ...patch }
          // Defend the super-admin invariant: power is tied to the reserved
          // email, so self-service profile edits may never claim it, and the
          // super-admin account's own email is locked.
          if (next.email !== undefined) {
            const lower = next.email.trim().toLowerCase()
            if (
              lower === SUPER_ADMIN_EMAIL.toLowerCase() ||
              me?.email === SUPER_ADMIN_EMAIL
            ) {
              delete next.email
            }
          }
          return {
            ...s,
            users: s.users.map((u) =>
              u.id === s.currentUserId ? { ...u, ...next } : u,
            ),
          }
        }),
      setFontScale: (fontScale) =>
        update({ settings: { ...state.settings, fontScale } }),

      adminCreateUser: ({ name, email, phone, bio, role }) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const trimmedName = name.trim()
          const trimmedEmail = email.trim()
          const lower = trimmedEmail.toLowerCase()
          if (!trimmedName || !trimmedEmail) return s
          // the reserved email can never be assigned to a new account
          if (lower === SUPER_ADMIN_EMAIL.toLowerCase()) return s
          // emails are unique (case-insensitive)
          if (s.users.some((u) => u.email.toLowerCase() === lower)) return s
          const user: User = {
            id: uid('u'),
            name: trimmedName,
            email: trimmedEmail,
            phone: phone?.trim() || undefined,
            bio: bio?.trim() || undefined,
            role,
          }
          return { ...s, users: [...s.users, user] }
        }),

      adminUpdateUser: (id, patch) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const target = s.users.find((u) => u.id === id)
          if (!target) return s
          const next: Partial<User> = { ...patch }
          if (next.name !== undefined) {
            const name = next.name.trim()
            if (!name) return s
            next.name = name
          }
          // the super-admin account's own email is locked
          if (target.email === SUPER_ADMIN_EMAIL) delete next.email
          if (next.email !== undefined) {
            const email = next.email.trim()
            const lower = email.toLowerCase()
            if (!email) return s
            // reserved email can't be moved onto another account
            if (lower === SUPER_ADMIN_EMAIL.toLowerCase()) return s
            // unique among other users
            if (
              s.users.some(
                (u) => u.id !== id && u.email.toLowerCase() === lower,
              )
            )
              return s
            next.email = email
          }
          return {
            ...s,
            users: s.users.map((u) => (u.id === id ? { ...u, ...next } : u)),
          }
        }),

      adminDeleteUser: (id) =>
        setState((s) => {
          const me = s.users.find((u) => u.id === s.currentUserId)
          if (me?.email !== SUPER_ADMIN_EMAIL) return s
          const target = s.users.find((u) => u.id === id)
          if (!target) return s
          // never delete the super-admin account or yourself
          if (target.email === SUPER_ADMIN_EMAIL) return s
          if (target.id === s.currentUserId) return s
          return {
            ...s,
            users: s.users.filter((u) => u.id !== id),
            // cascade: remove the deleted user's signups (no orphans)
            signups: s.signups.filter((g) => g.userId !== id),
            // events created by this user intentionally keep their managerId
            // (it is a display-only label; events are not cascade-deleted)
          }
        }),

      addRole: (data) =>
        setState((s) => ({
          ...s,
          volunteerRoles: [...s.volunteerRoles, { id: uid('r'), ...data }],
        })),
      updateRole: (id, patch) =>
        setState((s) => ({
          ...s,
          volunteerRoles: s.volunteerRoles.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),
      deleteRole: (id) =>
        setState((s) => {
          const inUse = [...s.serviceTimes, ...s.events].some((x) =>
            x.positions.some((p) => p.roleId === id),
          )
          if (inUse) return s
          return {
            ...s,
            volunteerRoles: s.volunteerRoles.filter((r) => r.id !== id),
          }
        }),

      addCampus: ({ name, address }) =>
        setState((s) => ({
          ...s,
          campuses: [...s.campuses, { id: uid('c'), name, address }],
        })),
      addServiceTime: (data) =>
        setState((s) => ({
          ...s,
          serviceTimes: [...s.serviceTimes, { id: uid('s'), ...data }],
        })),
      addEvent: (data) =>
        setState((s) => ({
          ...s,
          events: [
            ...s.events,
            { id: uid('e'), managerId: s.currentUserId ?? '', ...data },
          ],
        })),

      updateCampus: (id, patch) =>
        setState((s) => ({
          ...s,
          campuses: s.campuses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCampus: (id) =>
        setState((s) => {
          const removedServiceIds = new Set(
            s.serviceTimes.filter((st) => st.campusId === id).map((st) => st.id),
          )
          const removedEventIds = new Set(
            s.events.filter((e) => e.campusId === id).map((e) => e.id),
          )
          return {
            ...s,
            campuses: s.campuses.filter((c) => c.id !== id),
            serviceTimes: s.serviceTimes.filter((st) => st.campusId !== id),
            events: s.events.filter((e) => e.campusId !== id),
            signups: s.signups.filter((g) => {
              if (g.kind === 'service') return !removedServiceIds.has(g.refId)
              if (g.kind === 'event') return !removedEventIds.has(g.refId)
              return true
            }),
          }
        }),
      updateServiceTime: (id, patch) =>
        setState((s) => {
          const validPositionIds = patch.positions.map((p) => p.id)
          return {
            ...s,
            serviceTimes: s.serviceTimes.map((st) =>
              st.id === id ? { ...st, ...patch } : st,
            ),
            signups: s.signups.filter((g) =>
              g.kind === 'service' && g.refId === id
                ? validPositionIds.includes(g.positionId)
                : true,
            ),
          }
        }),
      deleteServiceTime: (id) =>
        setState((s) => ({
          ...s,
          serviceTimes: s.serviceTimes.filter((st) => st.id !== id),
          signups: s.signups.filter(
            (g) => !(g.kind === 'service' && g.refId === id),
          ),
        })),
      updateEvent: (id, patch) =>
        setState((s) => {
          const validPositionIds = patch.positions.map((p) => p.id)
          return {
            ...s,
            events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
            signups: s.signups.filter((g) =>
              g.kind === 'event' && g.refId === id
                ? validPositionIds.includes(g.positionId)
                : true,
            ),
          }
        }),
      deleteEvent: (id) =>
        setState((s) => ({
          ...s,
          events: s.events.filter((e) => e.id !== id),
          signups: s.signups.filter(
            (g) => !(g.kind === 'event' && g.refId === id),
          ),
        })),

      signUp: (kind, refId, positionId) => {
        setState((s) => {
          if (!s.currentUserId) return s
          const exists = s.signups.some(
            (g) =>
              g.userId === s.currentUserId &&
              g.kind === kind &&
              g.refId === refId &&
              g.positionId === positionId,
          )
          if (exists) return s
          return {
            ...s,
            signups: [
              ...s.signups,
              {
                id: uid('g'),
                userId: s.currentUserId,
                kind,
                refId,
                positionId,
              },
            ],
          }
        })
      },
      cancelSignup: (signupId) =>
        setState((s) => ({
          ...s,
          signups: s.signups.filter((g) => g.id !== signupId),
        })),

      campusName: (campusId) =>
        state.campuses.find((c) => c.id === campusId)?.name ?? 'Unknown campus',
      roleName: (roleId) =>
        state.volunteerRoles.find((r) => r.id === roleId)?.name ?? 'Unknown role',
      roleUsage: (roleId) => ({
        services: state.serviceTimes.filter((st) =>
          st.positions.some((p) => p.roleId === roleId),
        ).length,
        events: state.events.filter((e) =>
          e.positions.some((p) => p.roleId === roleId),
        ).length,
      }),
      positionFilled: (kind, refId, positionId) =>
        state.signups.filter(
          (g) =>
            g.kind === kind && g.refId === refId && g.positionId === positionId,
        ).length,
    }
  }, [state, currentUser])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
