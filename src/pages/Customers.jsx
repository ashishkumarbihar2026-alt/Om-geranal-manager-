import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

export default function Customers() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!user) return
    const q1 = query(collection(db, 'users', user.uid, 'customers'), orderBy('createdAt', 'desc'))
    const unsub1 = onSnapshot(q1, (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const q2 = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'))
    const unsub2 = onSnapshot(q2, (snap) => {
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name) return
    await addDoc(collection(db, 'users', user.uid, 'customers'), {
      name,
      phone: phone || '',
      createdAt: Date.now(),
    })
    setName('')
    setPhone('')
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'customers', id))
  }

  const customerStats = useMemo(() => {
    const map = {}
    customers.forEach((c) => {
      map[c.id] = { ...c, totalBusiness: 0, totalDue: 0, bills: [] }
    })
    invoices.forEach((inv) => {
      if (inv.customerId && map[inv.customerId]) {
        map[inv.customerId].totalBusiness += inv.total || 0
        map[inv.customerId].totalDue += inv.due || 0
        map[inv.customerId].bills.push(inv)
      }
    })
    return Object.values(map)
  }, [customers, invoices])

  return (
    <div className="page">
      <TopBar title="Customers" subtitle="Track customers and their credit (udhaar)" />

      <form className="card form-card" onSubmit={handleAdd}>
        <label>
          Customer Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Phone Number (optional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <button type="submit" className="btn-primary">
          Add Customer
        </button>
      </form>

      <div className="list">
        {customerStats.length === 0 && (
          <p className="empty-state">No customers added yet</p>
        )}
        {customerStats.map((c) => (
          <div className="customer-card" key={c.id}>
            <div className="customer-row-top">
              <div>
                <strong>{c.name}</strong>
                {c.phone && <span className="customer-phone">{c.phone}</span>}
              </div>
              <button className="btn-delete" onClick={() => handleDelete(c.id)}>
                ✕
              </button>
            </div>
            <div className="customer-amounts">
              <span>Total Purchased: ₹{c.totalBusiness.toFixed(0)}</span>
              <span className={c.totalDue > 0 ? 'customer-due' : 'customer-clear'}>
                Due (Udhaar): ₹{c.totalDue.toFixed(0)}
              </span>
            </div>
            {c.bills.length > 0 && (
              <button
                className="btn-secondary btn-small"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                {expandedId === c.id ? 'Hide Bills' : `View Bills (${c.bills.length})`}
              </button>
            )}
            {expandedId === c.id && (
              <div className="customer-bills">
                {c.bills.map((inv) => (
                  <div className="sale-row" key={inv.id}>
                    <div>
                      <strong>{inv.invoiceNo}</strong>
                      <span className="sale-time">
                        {new Date(inv.timestamp).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="sale-amounts">
                      <span>₹{(inv.total || 0).toFixed(0)}</span>
                      {inv.due > 0 && <span className="customer-due">Due ₹{inv.due.toFixed(0)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
