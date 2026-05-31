import type { AppEvent, Campus, ServiceTime, Signup, User } from '../types'

export const seedUsers: User[] = [
  {
    id: 'u-manager',
    name: 'Pat Rivera',
    email: 'pat@church.org',
    phone: '555-0101',
    role: 'manager',
    bio: 'Campus pastor. Keeps the lights on and the teams happy.',
  },
  {
    id: 'u-eventmgr',
    name: 'Jordan Lee',
    email: 'jordan@church.org',
    phone: '555-0102',
    role: 'event_manager',
    bio: 'Coordinates outreach events across campuses.',
  },
  {
    id: 'u-vol',
    name: 'Sam Carter',
    email: 'sam@example.com',
    phone: '555-0103',
    role: 'volunteer',
    bio: 'Happy to help wherever needed!',
  },
]

export const seedCampuses: Campus[] = [
  { id: 'c-downtown', name: 'Downtown Campus', address: '100 Main St' },
  { id: 'c-north', name: 'North Campus', address: '4500 Oak Ave' },
]

export const seedServiceTimes: ServiceTime[] = [
  {
    id: 's-dt-sun9',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '9:00 AM',
    positions: [
      { id: 'p1', title: 'Greeter', needed: 4 },
      { id: 'p2', title: 'Kids Check-in', needed: 3 },
      { id: 'p3', title: 'Parking', needed: 2 },
    ],
  },
  {
    id: 's-dt-sun11',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '11:00 AM',
    positions: [
      { id: 'p1', title: 'Greeter', needed: 4 },
      { id: 'p4', title: 'Worship Team', needed: 2 },
      { id: 'p5', title: 'Coffee Bar', needed: 3 },
    ],
  },
  {
    id: 's-n-sun10',
    campusId: 'c-north',
    dayOfWeek: 'Sunday',
    time: '10:00 AM',
    positions: [
      { id: 'p1', title: 'Greeter', needed: 3 },
      { id: 'p2', title: 'Kids Check-in', needed: 4 },
    ],
  },
]

// A few existing sign-ups so managers see a populated roster out of the box.
export const seedSignups: Signup[] = [
  { id: 'g-1', userId: 'u-vol', kind: 'service', refId: 's-dt-sun9', positionId: 'p1' },
  { id: 'g-2', userId: 'u-manager', kind: 'service', refId: 's-dt-sun9', positionId: 'p3' },
  { id: 'g-3', userId: 'u-vol', kind: 'event', refId: 'e-foodbank', positionId: 'ep2' },
]

export const seedEvents: AppEvent[] = [
  {
    id: 'e-foodbank',
    name: 'Community Food Bank',
    campusId: 'c-downtown',
    managerId: 'u-eventmgr',
    date: '2026-06-13',
    time: '8:00 AM',
    positions: [
      { id: 'ep1', title: 'Setup Crew', needed: 6 },
      { id: 'ep2', title: 'Food Distribution', needed: 10 },
      { id: 'ep3', title: 'Cleanup', needed: 4 },
    ],
  },
  {
    id: 'e-backtoschool',
    name: 'Back-to-School Drive',
    campusId: 'c-north',
    managerId: 'u-eventmgr',
    date: '2026-08-15',
    time: '10:00 AM',
    positions: [
      { id: 'ep4', title: 'Registration', needed: 4 },
      { id: 'ep5', title: 'Supply Handout', needed: 8 },
    ],
  },
]
