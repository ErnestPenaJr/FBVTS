import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PositionList } from '../components/PositionList'
import { Roster } from '../components/Roster'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ServiceForm } from '../components/forms/ServiceForm'
import { useToast } from '../components/Toast'

export function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    serviceTimes,
    campuses,
    signups,
    isManager,
    updateServiceTime,
    deleteServiceTime,
  } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const service = serviceTimes.find((s) => s.id === id)
  if (!service) return <NotFound />

  const campus = campuses.find((c) => c.id === service.campusId)
  const existingSignups = signups.filter(
    (g) => g.kind === 'service' && g.refId === service.id,
  )

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-brand-700">
        ← All services
      </Link>

      {editing ? (
        <section className="mt-3 rounded-2xl border border-slate-200 p-4" aria-labelledby="edit-service-title">
          <h3 id="edit-service-title" className="mb-3 text-lg font-bold">Edit service time</h3>
          <ServiceForm
            campuses={campuses}
            initial={service}
            existingSignups={existingSignups}
            submitLabel="Save changes"
            onSubmit={(d) => updateServiceTime(service.id, d)}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-bold">
            {service.dayOfWeek} {service.time}
          </h2>
          <p className="mb-1 text-slate-500">{campus?.name}</p>
          <p className="mb-3 text-sm text-slate-400">{campus?.address}</p>

          {isManager && (
            <div className="mb-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 active:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 active:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}

          <h3 className="mb-3 text-lg font-bold">Positions</h3>
          <PositionList
            kind="service"
            refId={service.id}
            positions={service.positions}
          />
          <Roster kind="service" refId={service.id} positions={service.positions} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this service time?"
        message={
          existingSignups.length > 0
            ? `${existingSignups.length} volunteer(s) are signed up. Deleting removes their sign-ups too.`
            : undefined
        }
        onConfirm={() => {
          deleteServiceTime(service.id)
          toast('Service time deleted')
          navigate('/')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="py-10 text-center text-slate-500">
      <p>That service couldn't be found.</p>
      <Link to="/" className="mt-2 inline-block font-semibold text-brand-700">
        Back home
      </Link>
    </div>
  )
}
