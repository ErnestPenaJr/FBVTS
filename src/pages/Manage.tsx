import { useApp } from '../context/AppContext'
import { CampusForm } from '../components/forms/CampusForm'
import { ServiceForm } from '../components/forms/ServiceForm'
import { EventForm } from '../components/forms/EventForm'

export function Manage() {
  const {
    isManager,
    isEventManager,
    campuses,
    addCampus,
    addServiceTime,
    addEvent,
    serviceTimes,
    events,
  } = useApp()

  if (!isEventManager) {
    return (
      <div className="py-10 text-center text-slate-500">
        You need Manager or Event Manager access to view this page.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage</h2>

      {isManager && (
        <>
          <Card title="Add a campus">
            <CampusForm onSubmit={addCampus} />
          </Card>

          <Card title="Add a service time">
            <ServiceForm campuses={campuses} onSubmit={addServiceTime} />
            <p className="mt-3 text-center text-xs text-slate-400">
              {serviceTimes.length} service times configured
            </p>
          </Card>
        </>
      )}

      <Card title="Create an event">
        <EventForm campuses={campuses} onSubmit={addEvent} />
        <p className="mt-3 text-center text-xs text-slate-400">
          {events.length} events scheduled
        </p>
      </Card>

      {!isManager && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Note: only <strong>Managers</strong> can add campuses and service times.
          As an Event Manager you can create events.
        </p>
      )}
    </div>
  )
}

export function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children}
    </section>
  )
}
