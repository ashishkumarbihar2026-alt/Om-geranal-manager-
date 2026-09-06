import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '📊' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/sell', label: 'Bill', icon: '➕', prominent: true },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            'nav-tab' + (isActive ? ' active' : '') + (t.prominent ? ' nav-tab-prominent' : '')
          }
        >
          <span className={t.prominent ? 'nav-icon-fab' : 'nav-icon'}>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
