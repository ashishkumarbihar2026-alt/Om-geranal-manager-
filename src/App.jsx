import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sell from './pages/Sell'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-loading">Load ho raha hai…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/products"
          element={
            <Protected>
              <Products />
            </Protected>
          }
        />
        <Route
          path="/sell"
          element={
            <Protected>
              <Sell />
            </Protected>
          }
        />
        <Route
          path="/reports"
          element={
            <Protected>
              <Reports />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
      </Routes>
      {user && <BottomNav />}
    </div>
  )
}
