export type Role = 'volunteer' | 'manager' | 'event_manager'

export const ROLE_LABELS: Record<Role, string> = {
  volunteer: 'Volunteer',
  manager: 'Manager',
  event_manager: 'Event Manager',
}

/** The single reserved developer / super-admin account. Super-admin power is
 *  derived from this email, not from a role, so it can never be self-assigned
 *  through the role switcher. */
export const SUPER_ADMIN_EMAIL = 'epena@fallbrookchurch.com'

export type FontScale = 'compact' | 'normal' | 'large' | 'xlarge'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  photoUrl?: string
  bio?: string
  role: Role
}

export interface Campus {
  id: string
  name: string
  address: string
}

export interface VolunteerRole {
  id: string
  name: string
  description?: string
  defaultNeeded?: number
  category?: string
}

export interface Position {
  id: string // per-slot id; scopes Signup.positionId — keep stable across edits
  roleId: string // references VolunteerRole.id
  needed: number // editable per slot, pre-filled from role.defaultNeeded
}

/** A recurring weekly service slot at a campus (e.g. "Sunday 9:00 AM"). */
export interface ServiceTime {
  id: string
  campusId: string
  dayOfWeek: string
  time: string
  positions: Position[]
}

/** A one-off event with a specific date. */
export interface AppEvent {
  id: string
  name: string
  campusId: string
  managerId: string
  date: string // ISO yyyy-mm-dd
  time: string
  positions: Position[]
}

export interface Signup {
  id: string
  userId: string
  kind: 'service' | 'event'
  refId: string // serviceTimeId or eventId
  positionId: string
}

export interface Settings {
  fontScale: FontScale
}
