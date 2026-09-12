import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

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

export default function Reports() {
  const { user, profile } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [rangeKind, setRangeKind] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => normalize({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  let from = rangeStart(rangeKind)
  let to = Date.now()
  if (rangeKind === 'custom') {
    from = customFrom ? new Date(customFrom).getTime() : 0
    to = customTo ? new Date(customTo).getTime() + 86400000 - 1 : Date.now()
  }
  const duration = to - from
  const prevFrom = from - duration
  const prevTo = from - 1

  const filtered = invoices.filter((inv) => inv.timestamp >= from && inv.timestamp <= to)
  const prevFiltered = invoices.filter((inv) => inv.timestamp >= prevFrom && inv.timestamp <= prevTo)

  const totalSales = filtered.reduce((sum, inv) => sum + inv.total, 0)
  const totalProfit = filtered.reduce((sum, inv) => sum + inv.profit, 0)
  const itemCount = filtered.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.qty, 0),
    0
  )
  const prevSales = prevFiltered.reduce((sum, inv) => sum + inv.total, 0)
  const prevProfit = prevFiltered.reduce((sum, inv) => sum + inv.profit, 0)
  const prevBills = prevFiltered.length
  const prevItems = prevFiltered.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.qty, 0),
    0
  )

  function pctChange(cur, prev) {
    if (!prev) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const paidBills = filtered.filter((inv) => !(inv.due > 0))
  const pendingBills = filtered.filter((inv) => inv.due > 0)
  const paidAmount = paidBills.reduce((s, inv) => s + inv.total, 0)
  const pendingAmount = pendingBills.reduce((s, inv) => s + (inv.due || 0), 0)

  const chartData = useMemo(() => {
    const todayStart = rangeStart('today')
    const days = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = todayStart - i * 86400000
      const dayEnd = dayStart + 86400000
      const dayInvoices = invoices.filter((inv) => inv.timestamp >= dayStart && inv.timestamp < dayEnd)
      days.push({
        label: new Date(dayStart).toLocaleDateString('en-IN', { weekday: 'short' }),
        total: dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        profit: dayInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
      })
    }
    return days
  }, [invoices])

  const topProducts = useMemo(() => {
    const map = {}
    filtered.forEach((inv) => {
      inv.items.forEach((it) => {
        if (!map[it.name]) map[it.name] = { name: it.name, qty: 0, amount: 0 }
        map[it.name].qty += it.qty || 0
        map[it.name].amount += (it.price || 0) * (it.qty || 0)
      })
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [filtered])

  const searchedBills = search
    ? filtered.filter((inv) => inv.invoiceNo.toLowerCase().includes(search.toLowerCase()))
    : filtered

  function exportGSTRJson() {
    const gstrData = {
      shopName: profile?.shopName || '',
      period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
      invoiceCount: filtered.length,
      totalTaxableValue: totalSales,
      invoices: filtered.map((inv) => ({
        invoiceNo: inv.invoiceNo,
        date: new Date(inv.timestamp).toISOString().slice(0, 10),
        items: inv.items.map((it) => ({ name: it.name, qty: it.qty, rate: it.price, amount: it.price * it.qty })),
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

  function exportBillsCsv() {
    const header = 'Invoice No,Date,Items,Total,Profit,Status\n'
    const rows = filtered
      .map(
        (inv) =>
          `${inv.invoiceNo},${new Date(inv.timestamp).toLocaleDateString('en-IN')},${inv.items.length},${inv.total},${inv.profit},${inv.due > 0 ? 'Due' : 'Paid'}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bills-${rangeKind}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <TopBar title="Reports" subtitle="Business performance track karo" />

      <div className="range-tabs">
        {['today', 'week', 'month', 'custom'].map((k) => (
          <button key={k} className={rangeKind === k ? 'active' : ''} onClick={() => setRangeKind(k)}>
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

      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-blue">📊</span></div>
          <span className="stat-label">Total Sales</span>
          <span className="stat-value">₹{totalSales.toFixed(0)}</span>
          <span className="stat-change">{pctChange(totalSales, prevSales) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(totalSales, prevSales))}% vs pichla period</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-green">📈</span></div>
          <span className="stat-label">Total Profit</span>
          <span className="stat-value">₹{totalProfit.toFixed(0)}</span>
          <span className="stat-change">{pctChange(totalProfit, prevProfit) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(totalProfit, prevProfit))}% vs pichla period</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-purple">🧾</span></div>
          <span className="stat-label">Total Bills</span>
          <span className="stat-value">{filtered.length}</span>
          <span className="stat-change">{pctChange(filtered.length, prevBills) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(filtered.length, prevBills))}% vs pichla period</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-orange">📦</span></div>
          <span className="stat-label">Total Items</span>
          <span className="stat-value">{itemCount}</span>
          <span className="stat-change">{pctChange(itemCount, prevItems) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(itemCount, prevItems))}% vs pichla period</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card chart-card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>Sales Overview (7 din)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c2a8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00c2a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" fontSize={12} stroke="#6b6f8a" />
              <YAxis fontSize={12} stroke="#6b6f8a" width={40} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Area type="monotone" dataKey="total" stroke="#00c2a8" fill="url(#salesGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>Profit Overview (7 din)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" fontSize={12} stroke="#6b6f8a" />
              <YAxis fontSize={12} stroke="#6b6f8a" width={40} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Area type="monotone" dataKey="profit" stroke="#6c5ce7" fill="url(#profitGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="page-header-row" style={{ marginBottom: 4 }}>
          <h3 className="section-title" style={{ margin: 0 }}>GSTR JSON Export</h3>
        </div>
        <p className="gstr-note" style={{ marginBottom: 10 }}>
          Ye JSON CA ko dene ke liye hai — ye official GST portal format ka guaranteed-compliant file nahi hai, bas structured data hai jisse GST return banana aasaan ho.
        </p>
        <button className="btn-primary gstr-btn" onClick={exportGSTRJson}>📄 GSTR JSON Export Karo</button>
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <span className="stat-label">Paid Bills</span>
          <span className="stat-value">{paidBills.length}</span>
          <span className="customer-clear">₹{paidAmount.toFixed(0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Bills</span>
          <span className="stat-value">{pendingBills.length}</span>
          <span className="customer-due">₹{pendingAmount.toFixed(0)}</span>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="page-header-row" style={{ marginBottom: 8 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Bills is period mein</h3>
            <button className="btn-secondary btn-small" onClick={exportBillsCsv}>⬇️ CSV</button>
          </div>
          <input
            placeholder="Invoice number search karo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div className="list">
            {searchedBills.length === 0 && <p className="empty-state">Is period mein koi bill nahi hai</p>}
            {searchedBills.map((inv) => (
              <div className="sale-row" key={inv.id}>
                <div>
                  <strong>{inv.invoiceNo}</strong>
                  <span className="sale-time">
                    {new Date(inv.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{inv.items.length} items
                    {inv.customerName ? ` · ${inv.customerName}` : ''}
                  </span>
                </div>
                <div className="sale-amounts">
                  <span>₹{inv.total.toFixed(0)}</span>
                  <span className={inv.due > 0 ? 'customer-due' : 'sale-profit'}>
                    {inv.due > 0 ? `Due ₹${inv.due.toFixed(0)}` : `+₹${inv.profit.toFixed(0)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>Top Selling Products</h3>
          {topProducts.length === 0 && <p className="empty-state">Abhi data nahi hai</p>}
          {topProducts.map((p) => (
            <div className="top-product-row" key={p.name}>
              <span>{p.name}</span>
              <span className="top-product-meta">{p.qty} sold · ₹{p.amount.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
