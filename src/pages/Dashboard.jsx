import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [sales, setSales] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(200)
    )
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map((d) => d.data()))
    })
    return unsub
  }, [user])

  const todayStart = startOfToday()
  const todaySales = sales.filter((s) => s.timestamp >= todayStart)
  const todayTotal = todaySales.reduce((sum, s) => sum + s.soldPrice, 0)
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0)

  return (
    <div className="page">
      <h2 className="page-title">Namaste, {profile?.name?.split(' ')[0] || ''} 👋</h2>
      <p className="page-subtitle">{profile?.shopName}</p>

      <div className="stat-grid">
        <div className="stat-card stat-primary">
          <span className="stat-label">Aaj ki Bikri</span>
          <span className="stat-value">₹{todayTotal.toFixed(0)}</span>
        </div>
        <div className="stat-card stat-profit">
          <span className="stat-label">Aaj ka Profit</span>
          <span className="stat-value">₹{todayProfit.toFixed(0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Aaj Items Becha</span>
          <span className="stat-value">{todaySales.length}</span>
        </div>
      </div>

      <h3 className="section-title">Recent Sales</h3>
      <div className="list">
        {sales.length === 0 && <p className="empty-state">Abhi tak koi sale nahi hui</p>}
        {sales.slice(0, 20).map((s, i) => (
          <div className="sale-row" key={i}>
            <div>
              <strong>{s.productName}</strong>
              <span className="sale-time">
                {new Date(s.timestamp).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="sale-amounts">
              <span>₹{s.soldPrice}</span>
              <span className="sale-profit">+₹{s.profit.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
