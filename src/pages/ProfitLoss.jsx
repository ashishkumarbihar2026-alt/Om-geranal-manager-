import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
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

export default function ProfitLoss() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rangeKind, setRangeKind] = useState('month')

  useEffect(() => {
    if (!user) return
    const q1 = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'))
    const unsub1 = onSnapshot(q1, (snap) => {
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const q2 = query(collection(db, 'users', user.uid, 'expenses'), orderBy('timestamp', 'desc'))
    const unsub2 = onSnapshot(q2, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [user])

  const from = rangeStart(rangeKind)
  const filteredInvoices = invoices.filter((inv) => inv.timestamp >= from)
  const filteredExpenses = expenses.filter((e) => e.timestamp >= from)

  const grossProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = grossProfit - totalExpenses

  return (
    <div className="page">
      <TopBar title="Profit & Loss" subtitle="Sale ka profit minus kharcha" />

      <div className="range-tabs">
        {['today', 'week', 'month'].map((k) => (
          <button
            key={k}
            className={rangeKind === k ? 'active' : ''}
            onClick={() => setRangeKind(k)}
          >
            {k === 'today' ? 'Aaj' : k === 'week' ? 'Hafta' : 'Mahina'}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="summary-row">
          <span>Gross Profit (sales se)</span>
          <strong>₹{grossProfit.toFixed(0)}</strong>
        </div>
        <div className="summary-row">
          <span>Total Expenses</span>
          <strong className="customer-due">− ₹{totalExpenses.toFixed(0)}</strong>
        </div>
        <div className="summary-row" style={{ borderTop: '2px solid var(--navy)', paddingTop: 10 }}>
          <span>
            <strong>Net Profit</strong>
          </span>
          <strong className={netProfit >= 0 ? 'customer-clear' : 'customer-due'}>
            ₹{netProfit.toFixed(0)}
          </strong>
        </div>
      </div>

      <h3 className="section-title">Expenses is period mein</h3>
      <div className="list">
        {filteredExpenses.length === 0 && <p className="empty-state">Koi expense nahi hai</p>}
        {filteredExpenses.map((e) => (
          <div className="sale-row" key={e.id}>
            <div>
              <strong>{e.title}</strong>
              <span className="sale-time">
                {new Date(e.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            <span>₹{e.amount.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
