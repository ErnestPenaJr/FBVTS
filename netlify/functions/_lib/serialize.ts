import type {
  AppEvent,
  Campus,
  Position,
  ServiceTime,
  Signup,
  User,
  VolunteerRole,
} from '../../../src/types'

type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  photoUrl: string | null
  bio: string | null
  role: string
  fontScale: string
}

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? undefined,
    photoUrl: r.photoUrl ?? undefined,
    bio: r.bio ?? undefined,
    role: r.role as User['role'],
  }
}

export function toRole(r: {
  id: string
  name: string
  description: string | null
  defaultNeeded: number | null
  category: string | null
}): VolunteerRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    defaultNeeded: r.defaultNeeded ?? undefined,
    category: r.category ?? undefined,
  }
}

export function toCampus(r: {
  id: string
  name: string
  address: string
}): Campus {
  return { id: r.id, name: r.name, address: r.address }
}

type PositionRow = {
  id: string
  roleId: string
  needed: number
  parentKind: string
  parentId: string
}

// The client Position id is the global positions.id. Capacity counting keys on it.
export function toPosition(r: PositionRow): Position {
  return { id: r.id, roleId: r.roleId, needed: r.needed }
}

export function assembleServiceTimes(
  rows: { id: string; campusId: string; dayOfWeek: string; time: string }[],
  positions: PositionRow[],
): ServiceTime[] {
  return rows.map((st) => ({
    id: st.id,
    campusId: st.campusId,
    dayOfWeek: st.dayOfWeek,
    time: st.time,
    positions: positions
      .filter((p) => p.parentKind === 'service' && p.parentId === st.id)
      .map(toPosition),
  }))
}

export function assembleEvents(
  rows: {
    id: string
    name: string
    campusId: string
    managerId: string | null
    date: string
    time: string
  }[],
  positions: PositionRow[],
): AppEvent[] {
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    campusId: e.campusId,
    managerId: e.managerId ?? '',
    date: e.date,
    time: e.time,
    positions: positions
      .filter((p) => p.parentKind === 'event' && p.parentId === e.id)
      .map(toPosition),
  }))
}

export function toSignup(r: {
  id: string
  userId: string
  kind: string
  refId: string
  positionId: string
}): Signup {
  return {
    id: r.id,
    userId: r.userId,
    kind: r.kind as Signup['kind'],
    refId: r.refId,
    positionId: r.positionId,
  }
}
