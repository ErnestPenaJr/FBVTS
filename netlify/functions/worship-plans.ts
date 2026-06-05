import type { Config } from '@netlify/functions'
import { json, withErrors } from './_lib/http'
import { requireAuth } from './_lib/auth'
import { pcoFetch, type PcoList } from './_lib/pco'

export interface WorshipPlanDTO {
  id: string
  serviceTypeId: string
  serviceTypeName: string
  title: string | null
  seriesTitle: string | null
  date: string | null // ISO sort_date, used for ordering
  dateLabel: string | null // human "dates" string from PCO
}

const MAX_PLANS = 10
const PER_TYPE = 5

export default async (req: Request) =>
  withErrors(async () => {
    await requireAuth(req)

    const types = await pcoFetch<PcoList>('/service_types?per_page=100')
    const plans: WorshipPlanDTO[] = []

    for (const t of types.data) {
      const name = (t.attributes.name as string | undefined) ?? 'Service'
      const list = await pcoFetch<PcoList>(
        `/service_types/${t.id}/plans?filter=future&order=sort_date&per_page=${PER_TYPE}`,
      )
      for (const p of list.data) {
        plans.push({
          id: p.id,
          serviceTypeId: t.id,
          serviceTypeName: name,
          title: (p.attributes.title as string | null) ?? null,
          seriesTitle: (p.attributes.series_title as string | null) ?? null,
          date: (p.attributes.sort_date as string | null) ?? null,
          dateLabel: (p.attributes.dates as string | null) ?? null,
        })
      }
    }

    plans.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    return json({ plans: plans.slice(0, MAX_PLANS) })
  })

export const config: Config = { path: '/api/worship/plans' }
