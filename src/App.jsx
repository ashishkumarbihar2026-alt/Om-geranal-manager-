import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sell from './pages/Sell'
import Reports from './pages/Reports'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import ProfitLoss from './pages/ProfitLoss'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, profile } = useAuth()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile?.theme || 'light')
  }, [profile?.theme])

  return (
    <div className="app-shell">
      {user && <Sidebar />}
      <div className="app-main">
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
            path="/customers"
            element={
              <Protected>
                <Customers />
              </Protected>
            }
          />
          <Route
            path="/expenses"
            element={
              <Protected>
                <Expenses />
              </Protected>
            }
          />
          <Route
            path="/profit-loss"
            element={
              <Protected>
                <ProfitLoss />
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
      </div>
      {user && <BottomNav />}
    </div>
  )
}
