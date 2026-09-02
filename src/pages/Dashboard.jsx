import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Purane (single-item) sale records ko bhi naye invoice jaisa treat karo
function normalize(inv) {
  if (Array.isArray(inv.items)) return inv
  return {
    ...inv,
    invoiceNo: inv.invoiceNo || '—',
    items: inv.productName
      ? [{ name: inv.productName, qty: 1, price: inv.soldPrice ?? 0, shopPrice: inv.shopPrice ?? 0 }]
      : [],
    total: inv.total ?? inv.soldPrice ?? 0,
    profit: inv.profit ?? 0,
  }
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(200)
    )
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => normalize({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const todayStart = startOfToday()
  const todayInvoices = invoices.filter((inv) => inv.timestamp >= todayStart)
  const todayTotal = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const todayProfit = todayInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0)
  const todayItems = todayInvoices.reduce(
    (sum, inv) => sum + (inv.items || []).reduce((s, it) => s + (it.qty || 0), 0),
    0
  )

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
          <span className="stat-value">{todayItems}</span>
        </div>
      </div>

      <h3 className="section-title">Recent Bills</h3>
      <div className="list">
        {invoices.length === 0 && <p className="empty-state">Abhi tak koi bill nahi bana</p>}
        {invoices.slice(0, 20).map((inv) => (
          <div className="sale-row" key={inv.id}>
            <div>
              <strong>{inv.invoiceNo}</strong>
              <span className="sale-time">
                {new Date(inv.timestamp).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {(inv.items || []).length} items
              </span>
            </div>
            <div className="sale-amounts">
              <span>₹{(inv.total || 0).toFixed(0)}</span>
              <span className="sale-profit">+₹{(inv.profit || 0).toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
