import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { profile, user, logout } = useAuth()

  return (
    <div className="page">
      <h2 className="page-title">Profile</h2>
      <div className="card">
        <div className="profile-row">
          <span>Naam</span>
          <strong>{profile?.name}</strong>
        </div>
        <div className="profile-row">
          <span>Dukan</span>
          <strong>{profile?.shopName}</strong>
        </div>
        <div className="profile-row">
          <span>Email</span>
          <strong>{user?.email}</strong>
        </div>
      </div>
      <button className="btn-secondary logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}
