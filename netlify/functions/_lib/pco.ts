import { HttpError } from './auth'

export interface PcoEntity {
  id: string
  attributes: Record<string, unknown>
}
export interface PcoList {
  data: PcoEntity[]
}

const BASE = 'https://api.planningcenteronline.com/services/v2'

function authHeader(): string {
  const id = process.env.PCO_APP_ID
  const secret = process.env.PCO_SECRET
  if (!id || !secret) {
    throw new HttpError(500, 'Planning Center is not configured')
  }
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

/**
 * Fetch a path under the Services API (e.g. '/service_types?per_page=100').
 * Maps upstream failures to HttpError so callers stay thin and `withErrors`
 * renders a clean JSON error to the client.
 */
export async function pcoFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
  })
  if (res.status === 429) {
    throw new HttpError(503, 'Planning Center is busy — please try again shortly')
  }
  if (res.status === 401) {
    throw new HttpError(500, 'Planning Center credentials are invalid')
  }
  if (!res.ok) {
    throw new HttpError(502, `Planning Center request failed (${res.status})`)
  }
  return (await res.json()) as T
}
