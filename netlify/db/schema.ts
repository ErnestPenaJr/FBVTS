import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    photoUrl: text('photo_url'),
    bio: text('bio'),
    role: text('role').notNull().default('volunteer'),
    passwordHash: text('password_hash').notNull(),
    fontScale: text('font_scale').notNull().default('normal'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // case-insensitive uniqueness: emails are always stored lower-cased
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
  }),
)

export const volunteerRoles = pgTable('volunteer_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  defaultNeeded: integer('default_needed'),
  category: text('category'),
})

export const campuses = pgTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
})

export const serviceTimes = pgTable('service_times', {
  id: text('id').primaryKey(),
  campusId: text('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'cascade' }),
  dayOfWeek: text('day_of_week').notNull(),
  time: text('time').notNull(),
})

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  campusId: text('campus_id')
    .notNull()
    .references(() => campuses.id, { onDelete: 'cascade' }),
  managerId: text('manager_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  date: date('date').notNull(),
  time: text('time').notNull(),
})

export const positions = pgTable(
  'positions',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => volunteerRoles.id, { onDelete: 'restrict' }),
    needed: integer('needed').notNull(),
    parentKind: text('parent_kind').notNull(), // 'service' | 'event'
    parentId: text('parent_id').notNull(),
  },
  (t) => ({
    parentIdx: index('positions_parent_idx').on(t.parentKind, t.parentId),
  }),
)

export const signups = pgTable(
  'signups',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'service' | 'event'
    refId: text('ref_id').notNull(),
    positionId: text('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    uniqueSignup: uniqueIndex('signups_unique').on(
      t.userId,
      t.kind,
      t.refId,
      t.positionId,
    ),
  }),
)
