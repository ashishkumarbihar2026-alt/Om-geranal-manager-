import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'expenses'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    if (!title || !amount) return
    await addDoc(collection(db, 'users', user.uid, 'expenses'), {
      title,
      amount: Number(amount),
      timestamp: Date.now(),
    })
    setTitle('')
    setAmount('')
  }

  async function handleDelete(id) {
    if (!confirm('Ye expense hata dein?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'expenses', id))
  }

  const monthStart = startOfMonth()
  const monthExpenses = expenses.filter((e) => e.timestamp >= monthStart)
  const monthTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div className="page">
      <TopBar title="Expenses" subtitle="Dukan ka kharcha track karo" />

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card stat-primary" style={{ gridColumn: 'span 2' }}>
          <span className="stat-label">Is Mahine ka Kharcha</span>
          <span className="stat-value">₹{monthTotal.toFixed(0)}</span>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleAdd}>
        <label>
          Kis cheez ka kharcha (jaise: Rent, Bijli, Transport)
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Amount (₹)
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn-primary">
          Expense Add Karo
        </button>
      </form>

      <h3 className="section-title">Saare Expenses</h3>
      <div className="list">
        {expenses.length === 0 && <p className="empty-state">Abhi koi expense add nahi hua</p>}
        {expenses.map((e) => (
          <div className="sale-row" key={e.id}>
            <div>
              <strong>{e.title}</strong>
              <span className="sale-time">
                {new Date(e.timestamp).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="sale-amounts">
              <span>₹{e.amount.toFixed(0)}</span>
              <button className="btn-delete" onClick={() => handleDelete(e.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
