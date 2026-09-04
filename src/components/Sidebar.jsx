import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/sell', label: 'Bills', icon: '🧾' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function Sidebar() {
  const { profile, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <i></i><i></i><i></i>
        </span>
        <span className="sidebar-brand-text">{profile?.shopName || 'Dukan Scan'}</span>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={logout}>
        🚪 Logout
      </button>
    </aside>
  )
}
