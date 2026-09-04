import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
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
  const { profile } = useAuth()
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(300)
    )
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => normalize({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const todayStart = startOfDay(Date.now())
  const yesterdayStart = todayStart - 86400000

  const todayInvoices = invoices.filter((inv) => inv.timestamp >= todayStart)
  const yesterdayInvoices = invoices.filter(
    (inv) => inv.timestamp >= yesterdayStart && inv.timestamp < todayStart
  )

  const todayTotal = todayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const todayProfit = todayInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0)
  const todayItems = todayInvoices.reduce(
    (sum, inv) => sum + (inv.items || []).reduce((s, it) => s + (it.qty || 0), 0),
    0
  )
  const yesterdayTotal = yesterdayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const yesterdayProfit = yesterdayInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0)

  function pctChange(today, yest) {
    if (!yest) return today > 0 ? 100 : 0
    return Math.round(((today - yest) / yest) * 100)
  }

  const salesChange = pctChange(todayTotal, yesterdayTotal)
  const profitChange = pctChange(todayProfit, yesterdayProfit)

  const chartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayStart - i * 86400000
      const dayEnd = dayStart + 86400000
      const dayInvoices = invoices.filter((inv) => inv.timestamp >= dayStart && inv.timestamp < dayEnd)
      const total = dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      days.push({
        label: new Date(dayStart).toLocaleDateString('en-IN', { weekday: 'short' }),
        total,
      })
    }
    return days
  }, [invoices, todayStart])

  const topProducts = useMemo(() => {
    const map = {}
    invoices.forEach((inv) => {
      ;(inv.items || []).forEach((it) => {
        if (!map[it.name]) map[it.name] = { name: it.name, qty: 0, amount: 0 }
        map[it.name].qty += it.qty || 0
        map[it.name].amount += (it.price || 0) * (it.qty || 0)
      })
    })
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [invoices])

  return (
    <div className="page">
      <TopBar title={`Namaste, ${profile?.name?.split(' ')[0] || ''} 👋`} subtitle={profile?.shopName} />

      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon icon-blue">📊</span>
          </div>
          <span className="stat-label">Aaj ki Bikri</span>
          <span className="stat-value">₹{todayTotal.toFixed(0)}</span>
          <span className={'stat-change' + (salesChange < 0 ? ' negative' : '')}>
            {salesChange >= 0 ? '↑' : '↓'} {Math.abs(salesChange)}% vs kal
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon icon-green">📈</span>
          </div>
          <span className="stat-label">Aaj ka Profit</span>
          <span className="stat-value">₹{todayProfit.toFixed(0)}</span>
          <span className={'stat-change' + (profitChange < 0 ? ' negative' : '')}>
            {profitChange >= 0 ? '↑' : '↓'} {Math.abs(profitChange)}% vs kal
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon icon-purple">📦</span>
          </div>
          <span className="stat-label">Aaj Items Becha</span>
          <span className="stat-value">{todayItems}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon icon-orange">🧾</span>
          </div>
          <span className="stat-label">Aaj Bills</span>
          <span className="stat-value">{todayInvoices.length}</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card chart-card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>
            Sales Overview (7 din)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c2a8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00c2a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" fontSize={12} stroke="#6b6f8a" />
              <YAxis fontSize={12} stroke="#6b6f8a" width={40} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Area type="monotone" dataKey="total" stroke="#00c2a8" fill="url(#salesGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>
            Top Selling Products
          </h3>
          {topProducts.length === 0 && <p className="empty-state">Abhi data nahi hai</p>}
          {topProducts.map((p) => (
            <div className="top-product-row" key={p.name}>
              <span>{p.name}</span>
              <span className="top-product-meta">
                {p.qty} sold · ₹{p.amount.toFixed(0)}
              </span>
            </div>
          ))}
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
