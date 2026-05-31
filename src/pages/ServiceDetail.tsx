import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'

export function ServiceDetail() {
  const { id } = useParams()
  const { serviceTimes, campuses } = useApp()
  const service = serviceTimes.find((s) => s.id === id)

  if (!service) {
    return <NotFound />
  }
  const campus = campuses.find((c) => c.id === service.campusId)

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All services
      </Link>
      <h2 className="mt-2 text-2xl font-bold">
        {service.dayOfWeek} {service.time}
      </h2>
      <p className="mb-1 text-slate-500">{campus?.name}</p>
      <p className="mb-5 text-sm text-slate-400">{campus?.address}</p>

      <h3 className="mb-3 text-lg font-bold">Positions</h3>
      <PositionList kind="service" refId={service.id} positions={service.positions} />
    </div>
  )
}

function NotFound() {
  return (
    <div className="py-10 text-center text-slate-500">
      <p>That service couldn’t be found.</p>
      <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
        Back home
      </Link>
    </div>
  )
}
