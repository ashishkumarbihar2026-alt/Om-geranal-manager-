import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { profile, user, logout } = useAuth()
  const [printerWidth, setPrinterWidth] = useState(profile?.printerWidth || '80')
  const [saved, setSaved] = useState(false)

  async function savePrinterWidth(value) {
    setPrinterWidth(value)
    setSaved(false)
    await updateDoc(doc(db, 'users', user.uid), { printerWidth: value })
    setSaved(true)
  }

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

      <button className="btn-secondary logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}
