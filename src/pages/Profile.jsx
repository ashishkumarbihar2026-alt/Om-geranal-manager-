import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

function resizeAndCompressImage(file, maxSize = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const base64 = canvas.toDataURL('image/jpeg', quality)
        resolve(base64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { profile, user, logout } = useAuth()
  const [printerWidth, setPrinterWidth] = useState(profile?.printerWidth || '80')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || null)

  async function savePrinterWidth(value) {
    setPrinterWidth(value)
    setSaved(false)
    await updateDoc(doc(db, 'users', user.uid), { printerWidth: value })
    setSaved(true)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const base64 = await resizeAndCompressImage(file, 200, 0.7)

      if (base64.length > 900000) {
        alert('Photo bahut badi hai, chhoti photo try karo.')
        setUploading(false)
        return
      }

      await updateDoc(doc(db, 'users', user.uid), { photoURL: base64 })
      setPhotoURL(base64)
    } catch (err) {
      alert('Photo upload nahi ho payi: ' + err.message)
    }
    setUploading(false)
  }

  return (
    <div className="page">
      <TopBar title="Profile" subtitle="Account aur settings manage karo" />

      <div className="card profile-info-card">
        <div className="profile-info-top">
          <label htmlFor="photo-upload" style={{ cursor: 'pointer' }}>
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                className="profile-avatar-big"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="profile-avatar-big">
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
        </div>
        {uploading && <p className="profit-preview">Upload ho raha hai...</p>}
        <label htmlFor="photo-upload" className="btn-secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
          Photo Badlo
        </label>
      </div>

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
