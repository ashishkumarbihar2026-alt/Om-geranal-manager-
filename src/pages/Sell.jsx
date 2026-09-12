import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  doc,
} from 'firebase/firestore'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PrintInvoice from '../components/PrintInvoice'
import TopBar from '../components/TopBar'

function makeInvoiceNo() {
  return 'INV' + String(Date.now()).slice(-8)
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
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

export default function Sell() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [reprintInvoice, setReprintInvoice] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [lastInvoice, setLastInvoice] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(true)
  const [scanMsg, setScanMsg] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [showForm, setShowForm] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'products'), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const qc = query(collection(db, 'users', user.uid, 'customers'), orderBy('name'))
    const unsubC = onSnapshot(qc, (snap) => setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const qi = query(collection(db, 'users', user.uid, 'sales'), orderBy('timestamp', 'desc'))
    const unsubI = onSnapshot(qi, (snap) =>
      setAllInvoices(snap.docs.map((d) => normalize({ id: d.id, ...d.data() })))
    )
    return () => {
      unsub()
      unsubC()
      unsubI()
    }
  }, [user])

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
  }, [])

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === p.id)
      if (existing) {
        return prev.map((item) => (item.productId === p.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...prev, { productId: p.id, name: p.name, shopPrice: p.shopPrice, mrp: p.mrp, price: p.mrp, qty: 1 }]
    })
    setSearch('')
  }

  function updateCartItem(productId, field, value) {
    setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, [field]: Number(value) } : item)))
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  async function startScan() {
    setScanMsg('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      })
      const loop = async () => {
        if (!streamRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            handleScannedCode(codes[0].rawValue)
            return
          }
        } catch {
          // frame not ready
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } catch (err) {
      alert('Camera access nahi mil paya. Product naam se search kar lo.')
      setScanning(false)
    }
  }

  function handleScannedCode(code) {
    stopScan()
    const match = products.find((p) => p.barcode === code)
    if (match) addToCart(match)
    else setScanMsg('Ye barcode kisi product se match nahi hua. Naam se search kar lo.')
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : []
  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch))
    : []

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const profit = cart.reduce((sum, item) => sum + (item.price - item.shopPrice) * item.qty, 0)
  const received = amountReceived === '' ? total : Number(amountReceived)
  const due = Math.max(0, total - received)

  async function handleAddNewCustomer() {
    if (!newCustomerName) return
    const ref = await addDoc(collection(db, 'users', user.uid, 'customers'), {
      name: newCustomerName,
      phone: newCustomerPhone || '',
      createdAt: Date.now(),
    })
    setSelectedCustomer({ id: ref.id, name: newCustomerName, phone: newCustomerPhone })
    setNewCustomerName('')
    setNewCustomerPhone('')
    setShowNewCustomer(false)
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    if (due > 0 && !selectedCustomer) {
      alert('Udhaar rakhne ke liye pehle customer select karo.')
      return
    }
    const invoiceNo = makeInvoiceNo()
    const invoice = {
      invoiceNo,
      items: cart.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price, shopPrice: item.shopPrice })),
      total,
      profit,
      amountPaid: received,
      due,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || null,
      customerPhone: selectedCustomer?.phone || null,
      timestamp: Date.now(),
    }
    const batch = writeBatch(db)
    const invoiceRef = doc(collection(db, 'users', user.uid, 'sales'))
    batch.set(invoiceRef, invoice)
    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) batch.update(doc(db, 'users', user.uid, 'products', item.productId), { stock: (product.stock || 0) - item.qty })
    })
    await batch.commit()
    setLastInvoice(invoice)
    setCart([])
    setSelectedCustomer(null)
    setAmountReceived('')
    setShowForm(false)
  }

  const monthStart = startOfMonth()
  const monthInvoices = allInvoices.filter((inv) => inv.timestamp >= monthStart)
  const monthTotal = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const paidAmount = monthInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.due || 0)), 0)
  const dueAmount = monthInvoices.reduce((sum, inv) => sum + (inv.due || 0), 0)

  const topCustomers = useMemo(() => {
    const map = {}
    allInvoices.forEach((inv) => {
      if (!inv.customerId) return
      if (!map[inv.customerId]) map[inv.customerId] = { name: inv.customerName, phone: inv.customerPhone, total: 0, bills: 0 }
      map[inv.customerId].total += inv.total || 0
      map[inv.customerId].bills += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 4)
  }, [allInvoices])

  const pieData = [
    { name: 'Paid', value: paidAmount },
    { name: 'Due', value: dueAmount },
  ]
  const pieColors = ['#00c2a8', '#e4572e']

  return (
    <div className="page">
      <TopBar title="Billing" subtitle="Bill banao, print karo" />

      <div className="card">
        {!showForm ? (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Create New Bill
          </button>
        ) : (
          <>
            <label>Customer (optional — udhaar ke liye zaroori)</label>
            {selectedCustomer ? (
              <div className="selected-customer-chip">
                <span>{selectedCustomer.name} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}</span>
                <button className="btn-delete" onClick={() => setSelectedCustomer(null)}>✕</button>
              </div>
            ) : (
              <>
                <div className="barcode-input-row">
                  <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Naam ya phone se dhoondo" />
                  <button type="button" className="btn-scan" onClick={() => setShowNewCustomer(!showNewCustomer)}>+ Naya</button>
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="search-results">
                    {filteredCustomers.map((c) => (
                      <button key={c.id} className="search-result-row" onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}>
                        <span>{c.name}</span>
                        <span className="price-mrp">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showNewCustomer && (
                  <div className="new-customer-form">
                    <input placeholder="Naam" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                    <input placeholder="Phone (optional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} inputMode="tel" />
                    <button className="btn-primary btn-small" onClick={handleAddNewCustomer}>Add Karo</button>
                  </div>
                )}
              </>
            )}

            <label style={{ marginTop: 10 }}>
              Product dhoondo ya scan karo
              <div className="barcode-input-row">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product ka naam type karo" />
                {scanSupported && <button type="button" className="btn-scan" onClick={startScan}>📷 Scan</button>}
              </div>
            </label>
            {scanMsg && <p className="form-error">{scanMsg}</p>}
            {filtered.length > 0 && (
              <div className="search-results">
                {filtered.map((p) => (
                  <button key={p.id} className="search-result-row" onClick={() => addToCart(p)}>
                    <span>{p.name}</span>
                    <span className="price-mrp">MRP ₹{p.mrp} · Stock {p.stock ?? 0}</span>
                  </button>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="cart-card" style={{ marginTop: 10 }}>
                {cart.map((item) => (
                  <div className="cart-row" key={item.productId}>
                    <div className="cart-row-name">{item.name}</div>
                    <div className="cart-row-fields">
                      <label className="cart-qty">Qty
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value)} />
                      </label>
                      <label className="cart-price">Price
                        <input type="number" value={item.price} onChange={(e) => updateCartItem(item.productId, 'price', e.target.value)} />
                      </label>
                      <span className="cart-line-total">₹{(item.price * item.qty).toFixed(0)}</span>
                      <button className="btn-delete" onClick={() => removeFromCart(item.productId)}>✕</button>
                    </div>
                  </div>
                ))}
                <label>Kitna Amount mila (baaki udhaar ho jayega)
                  <input type="number" placeholder={String(total)} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
                </label>
                <div className="cart-totals">
                  <span>Total: ₹{total.toFixed(0)}</span>
                  <span className="cart-profit">Profit: ₹{profit.toFixed(0)}</span>
                </div>
                {due > 0 && <p className="form-error">Udhaar rahega: ₹{due.toFixed(0)}</p>}
                <button className="btn-primary" onClick={handleCheckout}>Bill Confirm Karo</button>
              </div>
            )}

            <button className="btn-secondary btn-small" style={{ marginTop: 10 }} onClick={() => setShowForm(false)}>
              Band Karo
            </button>
          </>
        )}
      </div>

      {scanning && (
        <div className="scan-overlay">
          <video ref={videoRef} className="scan-video" muted playsInline />
          <p>Barcode ko camera ke saamne rakho</p>
          <button className="btn-secondary" onClick={stopScan}>Band Karo</button>
        </div>
      )}

      {lastInvoice && (
        <div className="card sale-done-card">
          <p>✅ Bill ban gaya — {lastInvoice.invoiceNo} (profit ₹{lastInvoice.profit.toFixed(0)}){lastInvoice.due > 0 && ` · Udhaar ₹${lastInvoice.due.toFixed(0)}`}</p>
          <PrintInvoice invoice={lastInvoice} shopName={profile?.shopName} printerWidth={profile?.printerWidth || '80'} />
        </div>
      )}

      {reprintInvoice && (
        <div className="card sale-done-card">
          <p>🖨️ {reprintInvoice.invoiceNo} dobara print karo</p>
          <PrintInvoice invoice={reprintInvoice} shopName={profile?.shopName} printerWidth={profile?.printerWidth || '80'} />
        </div>
      )}

      <div className="stat-grid stat-grid-4" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-blue">🧾</span></div>
          <span className="stat-label">Total Bills</span>
          <span className="stat-value">{monthInvoices.length}</span>
          <span className="stat-change">Is mahine</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-purple">₹</span></div>
          <span className="stat-label">Total Amount</span>
          <span className="stat-value">₹{monthTotal.toFixed(0)}</span>
          <span className="stat-change">Is mahine</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-green">✅</span></div>
          <span className="stat-label">Paid Amount</span>
          <span className="stat-value">₹{paidAmount.toFixed(0)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-icon icon-orange">⏳</span></div>
          <span className="stat-label">Due Amount</span>
          <span className="stat-value">₹{dueAmount.toFixed(0)}</span>
        </div>
      </div>

      <h3 className="section-title">Recent Bills</h3>
      <div className="list">
        {allInvoices.length === 0 && <p className="empty-state">Abhi tak koi bill nahi bana</p>}
        {allInvoices.slice(0, 10).map((inv) => (
          <div className="sale-row" key={inv.id}>
            <div>
              <strong>{inv.invoiceNo}</strong>
              <span className="sale-time">
                {new Date(inv.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {inv.customerName ? ` · ${inv.customerName}` : ''}
              </span>
            </div>
            <div className="sale-amounts">
              <span>₹{(inv.total || 0).toFixed(0)}</span>
              <span className={inv.due > 0 ? 'customer-due' : 'customer-clear'}>{inv.due > 0 ? 'Due' : 'Paid'}</span>
            </div>
            <button className="btn-icon" title="Reprint" onClick={() => setReprintInvoice(inv)}>🖨️</button>
          </div>
        ))}
      </div>

      <div className="dash-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>Top Customers</h3>
          {topCustomers.length === 0 && <p className="empty-state">Abhi data nahi hai</p>}
          {topCustomers.map((c) => (
            <div className="top-product-row" key={c.name}>
              <span>{c.name}</span>
              <span className="top-product-meta">₹{c.total.toFixed(0)} · {c.bills} bills</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>Bill Summary (Is Mahine)</h3>
          {monthTotal > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toFixed(0)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">Abhi data nahi hai</p>
          )}
        </div>
      </div>
    </div>
  )
}
