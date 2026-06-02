import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/client'
import { readCookie, COOKIE_NAME } from './http'
import { SUPER_ADMIN_EMAIL } from '../../../src/types'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return typeof payload.userId === 'string' ? payload.userId : null
  } catch {
    return null
  }
}

export type AuthUser = typeof schema.users.$inferSelect

/** Loads the authenticated user from the session cookie, fresh from the DB. */
export async function getSessionUser(req: Request): Promise<AuthUser | null> {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null
  const userId = await verifySession(token)
  if (!userId) return null
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
  return rows[0] ?? null
}

export function isSuperAdmin(u: AuthUser): boolean {
  return u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}
export function isManager(u: AuthUser): boolean {
  return u.role === 'manager' || isSuperAdmin(u)
}
export function isEventManager(u: AuthUser): boolean {
  return u.role === 'event_manager' || isManager(u)
}

/** Thrown to short-circuit a handler with an HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const u = await getSessionUser(req)
  if (!u) throw new HttpError(401, 'Not authenticated')
  return u
}
export async function requireManager(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isManager(u)) throw new HttpError(403, 'Manager access required')
  return u
}
export async function requireEventManager(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isEventManager(u))
    throw new HttpError(403, 'Event manager access required')
  return u
}
export async function requireSuperAdmin(req: Request): Promise<AuthUser> {
  const u = await requireAuth(req)
  if (!isSuperAdmin(u)) throw new HttpError(403, 'Super admin access required')
  return u
}
