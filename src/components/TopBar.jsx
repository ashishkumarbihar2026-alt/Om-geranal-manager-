import { useAuth } from '../context/AuthContext'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export default function TopBar({ title, subtitle }) {
  const { profile } = useAuth()

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
      <div className="topbar-right">
        <span className="topbar-bell" title="Notifications">🔔</span>
        {profile?.photoURL ? (
          <img
            src={profile.photoURL}
            alt="Profile"
            className="topbar-avatar"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span className="topbar-avatar">{initials(profile?.name)}</span>
        )}
      </div>
    </header>
  )
}
