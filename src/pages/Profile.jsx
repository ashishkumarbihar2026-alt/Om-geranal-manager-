import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export default function Profile() {
  const { profile, user, logout } = useAuth()
  const [printerWidth, setPrinterWidth] = useState(profile?.printerWidth || '80')
  const [saved, setSaved] = useState(false)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [shopName, setShopName] = useState(profile?.shopName || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const [theme, setTheme] = useState(profile?.theme || 'light')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  async function savePrinterWidth(value) {
    setPrinterWidth(value)
    setSaved(false)
    await updateDoc(doc(db, 'users', user.uid), { printerWidth: value })
    setSaved(true)
  }

  async function saveProfileEdit() {
    await updateDoc(doc(db, 'users', user.uid), { name, shopName, phone })
    setEditing(false)
  }

  async function saveTheme(value) {
    setTheme(value)
    document.documentElement.setAttribute('data-theme', value)
    await updateDoc(doc(db, 'users', user.uid), { theme: value })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMsg('')
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPassword)
      setPasswordMsg('Password badal gaya ✅')
      setCurrentPassword('')
      setNewPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      setPasswordMsg('Purana password galat hai ya naya password kamzor hai')
    }
  }

  return (
    <div className="page">
      <TopBar title="Profile" subtitle="Account aur settings manage karo" />

      <div className="card profile-info-card">
        <div className="profile-info-top">
          <span className="profile-avatar-big">{initials(profile?.name)}</span>
          {!editing && (
            <button className="btn-secondary btn-small" onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <>
            <label>
              Full Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Dukan ka naam
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
            </label>
            <label>
              Phone Number (optional)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </label>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveProfileEdit}>
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="profile-row">
              <span>Naam</span>
              <strong>{profile?.name}</strong>
            </div>
            <div className="profile-row">
              <span>Dukan</span>
              <strong>{profile?.shopName}</strong>
            </div>
            <div className="profile-row">
              <span>Phone</span>
              <strong>{profile?.phone || '—'}</strong>
            </div>
            <div className="profile-row">
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
          </>
        )}
      </div>

      <h3 className="section-title">Thermal Printer Setting</h3>
      <div className="card">
        <label>Printer ka size</label>
        <div className="btn-row">
          <button
            className={printerWidth === '58' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => savePrinterWidth('58')}
          >
            58mm
          </button>
          <button
            className={printerWidth === '80' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => savePrinterWidth('80')}
          >
            80mm
          </button>
        </div>
        {saved && <p className="profit-preview">Save ho gaya ✅</p>}
      </div>

      <h3 className="section-title">Appearance</h3>
      <div className="card">
        <label>Theme</label>
        <div className="btn-row">
          <button
            className={theme === 'light' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => saveTheme('light')}
          >
            ☀️ Light
          </button>
          <button
            className={theme === 'dark' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => saveTheme('dark')}
          >
            🌙 Dark
          </button>
        </div>
      </div>

      <h3 className="section-title">Account & Security</h3>
      <div className="card">
        {!showPasswordForm ? (
          <button className="btn-secondary" onClick={() => setShowPasswordForm(true)}>
            🔑 Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="form-card">
            <label>
              Purana Password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Naya Password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
            {passwordMsg && <p className="form-error">{passwordMsg}</p>}
            <div className="btn-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPasswordForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update Karo
              </button>
            </div>
          </form>
        )}
      </div>

      <button className="btn-secondary logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}
