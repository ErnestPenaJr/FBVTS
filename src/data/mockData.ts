import type { AppEvent, Campus, ServiceTime, Signup, User, VolunteerRole } from '../types'

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

export const seedVolunteerRoles: VolunteerRole[] = [
  { id: 'r-greeter', name: 'Greeter', category: 'Hospitality', defaultNeeded: 4, description: 'Welcome people at the doors.' },
  { id: 'r-kids', name: 'Kids Check-in', category: 'Kids', defaultNeeded: 3, description: 'Check children in and out safely.' },
  { id: 'r-parking', name: 'Parking', category: 'Hospitality', defaultNeeded: 2, description: 'Direct traffic and help people park.' },
  { id: 'r-worship', name: 'Worship Team', category: 'Worship', defaultNeeded: 2, description: 'Lead music during the service.' },
  { id: 'r-coffee', name: 'Coffee Bar', category: 'Hospitality', defaultNeeded: 3, description: 'Serve coffee and refreshments.' },
  { id: 'r-setup', name: 'Setup Crew', category: 'Production', defaultNeeded: 6, description: 'Set up tables, chairs, and equipment.' },
  { id: 'r-food', name: 'Food Distribution', category: 'Outreach', defaultNeeded: 10, description: 'Hand out food to guests.' },
  { id: 'r-cleanup', name: 'Cleanup', category: 'Production', defaultNeeded: 4, description: 'Tear down and clean up afterward.' },
  { id: 'r-registration', name: 'Registration', category: 'Outreach', defaultNeeded: 4, description: 'Register attendees at the table.' },
  { id: 'r-supply', name: 'Supply Handout', category: 'Outreach', defaultNeeded: 8, description: 'Distribute supplies to families.' },
]

export const seedServiceTimes: ServiceTime[] = [
  {
    id: 's-dt-sun9',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '9:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 4 },
      { id: 'p2', roleId: 'r-kids', needed: 3 },
      { id: 'p3', roleId: 'r-parking', needed: 2 },
    ],
  },
  {
    id: 's-dt-sun11',
    campusId: 'c-downtown',
    dayOfWeek: 'Sunday',
    time: '11:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 4 },
      { id: 'p4', roleId: 'r-worship', needed: 2 },
      { id: 'p5', roleId: 'r-coffee', needed: 3 },
    ],
  },
  {
    id: 's-n-sun10',
    campusId: 'c-north',
    dayOfWeek: 'Sunday',
    time: '10:00 AM',
    positions: [
      { id: 'p1', roleId: 'r-greeter', needed: 3 },
      { id: 'p2', roleId: 'r-kids', needed: 4 },
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
      { id: 'ep1', roleId: 'r-setup', needed: 6 },
      { id: 'ep2', roleId: 'r-food', needed: 10 },
      { id: 'ep3', roleId: 'r-cleanup', needed: 4 },
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
      { id: 'ep4', roleId: 'r-registration', needed: 4 },
      { id: 'ep5', roleId: 'r-supply', needed: 8 },
    ],
  },
]
