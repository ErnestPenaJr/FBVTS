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
} from '../types'
import {
  seedCampuses,
  seedEvents,
  seedServiceTimes,
  seedUsers,
} from '../data/mockData'

const STORAGE_KEY = 'fbvts-state-v1'

interface PersistedState {
  users: User[]
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
    campuses: seedCampuses,
    serviceTimes: seedServiceTimes,
    events: seedEvents,
    signups: [],
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
  // auth
  register: (data: { name: string; email: string; role: Role }) => void
  login: (userId: string) => void
  logout: () => void
  switchRole: (role: Role) => void
  // profile
  updateProfile: (patch: Partial<User>) => void
  setFontScale: (scale: FontScale) => void
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

  // Apply accessible font scaling at the document root.
  useEffect(() => {
    const px =
      state.settings.fontScale === 'xlarge'
        ? '22px'
        : state.settings.fontScale === 'large'
          ? '19px'
          : '16px'
    document.documentElement.style.fontSize = px
  }, [state.settings.fontScale])

  const currentUser =
    state.users.find((u) => u.id === state.currentUserId) ?? null

  const value = useMemo<AppContextValue>(() => {
    const update = (patch: Partial<PersistedState>) =>
      setState((s) => ({ ...s, ...patch }))

    return {
      ...state,
      currentUser,
      isManager: currentUser?.role === 'manager',
      isEventManager:
        currentUser?.role === 'event_manager' || currentUser?.role === 'manager',

      register: ({ name, email, role }) => {
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
        setState((s) => ({
          ...s,
          users: s.users.map((u) =>
            u.id === s.currentUserId ? { ...u, ...patch } : u,
          ),
        })),
      setFontScale: (fontScale) =>
        update({ settings: { ...state.settings, fontScale } }),

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
