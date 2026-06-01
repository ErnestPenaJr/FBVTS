import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ManageRail } from '../components/manage/ManageRail'
import { CampusSection } from '../components/manage/CampusSection'
import { ServiceSection } from '../components/manage/ServiceSection'
import { EventSection } from '../components/manage/EventSection'
import type { RailItem, SectionKey } from '../components/manage/types'

export function Manage() {
  const { isManager, isEventManager, campuses, serviceTimes, events } = useApp()
  const [active, setActive] = useState<SectionKey>(isManager ? 'campuses' : 'events')
  const [confirm, setConfirm] = useState<{
    title: string
    message?: string
    onConfirm: () => void
  } | null>(null)

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  const sections: RailItem[] = isManager
    ? [
        { key: 'campuses', label: 'Campuses', count: campuses.length },
        { key: 'services', label: 'Service times', count: serviceTimes.length },
        { key: 'events', label: 'Events', count: events.length },
      ]
    : [{ key: 'events', label: 'Events', count: events.length }]

  const requestConfirm = (opts: {
    title: string
    message?: string
    onConfirm: () => void
  }) => setConfirm(opts)

  // Mobile: every section is `block` (full stacked layout, rail hidden).
  // Desktop: only the active section is shown.
  const vis = (key: SectionKey) =>
    `block ${active === key ? 'md:block' : 'md:hidden'}`

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Manage</h2>

      <div className="md:flex md:gap-6">
        <ManageRail items={sections} active={active} onSelect={setActive} />

        <div className="mt-4 space-y-6 md:mt-0 md:min-w-0 md:flex-1 md:space-y-0">
          {isManager && (
            <div className={vis('campuses')}>
              <CampusSection requestConfirm={requestConfirm} />
            </div>
          )}
          {isManager && (
            <div className={vis('services')}>
              <ServiceSection requestConfirm={requestConfirm} />
            </div>
          )}
          <div className={vis('events')}>
            <EventSection requestConfirm={requestConfirm} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        onConfirm={() => {
          confirm?.onConfirm()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
