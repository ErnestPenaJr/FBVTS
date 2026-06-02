import { HttpError } from './auth'

export const COOKIE_NAME = 'fbvts_session'

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status)
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export function sessionCookie(token: string): string {
  // 30 days
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export async function withErrors(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError) return error(e.message, e.status)
    console.error(e)
    return error('Internal error', 500)
  }
}
