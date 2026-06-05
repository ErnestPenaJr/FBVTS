import type { Config } from '@netlify/functions'
import { json, error, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import { pcoFetch, type PcoList } from './_lib/pco'

export interface WorshipItemDTO {
  id: string
  type: string // 'song' | 'header' | 'item' | 'media'
  title: string
  sequence: number
  lengthSeconds: number
  description: string | null
}

export default async (req: Request) =>
  withErrors(async () => {
    await requireAuth(req)

    const url = new URL(req.url)
    // /api/worship/plans/:serviceTypeId/:planId/items
    const m = url.pathname.match(
      /\/worship\/plans\/([^/]+)\/([^/]+)\/items$/,
    )
    if (!m) return error('Not found', 404)
    const serviceTypeId = m[1]
    const planId = m[2]

    const list = await pcoFetch<PcoList>(
      `/service_types/${serviceTypeId}/plans/${planId}/items?per_page=100&order=sequence`,
    )

    const items: WorshipItemDTO[] = list.data.map((it) => ({
      id: it.id,
      type: (it.attributes.item_type as string | undefined) ?? 'item',
      title: (it.attributes.title as string | undefined) ?? '',
      sequence: (it.attributes.sequence as number | undefined) ?? 0,
      lengthSeconds: (it.attributes.length as number | undefined) ?? 0,
      description: (it.attributes.description as string | null) ?? null,
    }))
    items.sort((a, b) => a.sequence - b.sequence)

    return json({ items })
  })

export const config: Config = {
  path: '/api/worship/plans/:serviceTypeId/:planId/items',
}
