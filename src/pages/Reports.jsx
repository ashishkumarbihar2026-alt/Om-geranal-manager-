import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function rangeStart(kind) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (kind === 'today') return d.getTime()
  if (kind === 'week') {
    d.setDate(d.getDate() - d.getDay())
    return d.getTime()
  }
  if (kind === 'month') {
    d.setDate(1)
    return d.getTime()
  }
  return 0
}

export default function Reports() {
  const { user, profile } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [rangeKind, setRangeKind] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  let from = rangeStart(rangeKind)
  let to = Date.now()
  if (rangeKind === 'custom') {
    from = customFrom ? new Date(customFrom).getTime() : 0
    to = customTo ? new Date(customTo).getTime() + 86400000 - 1 : Date.now()
  }

  const filtered = invoices.filter((inv) => inv.timestamp >= from && inv.timestamp <= to)
  const totalSales = filtered.reduce((sum, inv) => sum + inv.total, 0)
  const totalProfit = filtered.reduce((sum, inv) => sum + inv.profit, 0)
  const itemCount = filtered.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.qty, 0),
    0
  )

  function exportGSTRJson() {
    const gstrData = {
      shopName: profile?.shopName || '',
      period: {
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      },
      invoiceCount: filtered.length,
      totalTaxableValue: totalSales,
      invoices: filtered.map((inv) => ({
        invoiceNo: inv.invoiceNo,
        date: new Date(inv.timestamp).toISOString().slice(0, 10),
        items: inv.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          rate: it.price,
          amount: it.price * it.qty,
        })),
        invoiceValue: inv.total,
      })),
    }
    const blob = new Blob([JSON.stringify(gstrData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `GSTR-export-${rangeKind}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <h2 className="page-title">Reports</h2>

      <div className="range-tabs">
        {['today', 'week', 'month', 'custom'].map((k) => (
          <button
            key={k}
            className={rangeKind === k ? 'active' : ''}
            onClick={() => setRangeKind(k)}
          >
            {k === 'today' ? 'Aaj' : k === 'week' ? 'Hafta' : k === 'month' ? 'Mahina' : 'Custom'}
          </button>
        ))}
      </div>

      {rangeKind === 'custom' && (
        <div className="card">
          <div className="price-row">
            <label>
              Se
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label>
              Tak
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card stat-primary">
          <span className="stat-label">Total Sale</span>
          <span className="stat-value">₹{totalSales.toFixed(0)}</span>
        </div>
        <div className="stat-card stat-profit">
          <span className="stat-label">Total Profit</span>
          <span className="stat-value">₹{totalProfit.toFixed(0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bills / Items Becha</span>
          <span className="stat-value">
            {filtered.length} / {itemCount}
          </span>
        </div>
      </div>

      <button className="btn-primary gstr-btn" onClick={exportGSTRJson}>
        📄 GSTR JSON Export Karo
      </button>
      <p className="gstr-note">
        Ye JSON CA ko dene ke liye hai — ye official GST portal format ka guaranteed-compliant
        file nahi hai, bas structured data hai jisse GST return banana aasaan ho.
      </p>

      <h3 className="section-title">Bills is period mein</h3>
      <div className="list">
        {filtered.length === 0 && <p className="empty-state">Is period mein koi bill nahi hai</p>}
        {filtered.map((inv) => (
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
                {inv.items.length} items
              </span>
            </div>
            <div className="sale-amounts">
              <span>₹{inv.total.toFixed(0)}</span>
              <span className="sale-profit">+₹{inv.profit.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
