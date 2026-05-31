import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { ServiceDetail } from './pages/ServiceDetail'
import { EventDetail } from './pages/EventDetail'
import { Schedule } from './pages/Schedule'
import { Profile } from './pages/Profile'
import { Manage } from './pages/Manage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
