import { useEffect, useRef, useState } from 'react'
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  doc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PrintInvoice from '../components/PrintInvoice'
import TopBar from '../components/TopBar'

function makeInvoiceNo() {
  return 'INV' + String(Date.now()).slice(-8)
}

export default function Sell() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // { productId, name, shopPrice, mrp, price, qty }
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
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'products'), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const qc = query(collection(db, 'users', user.uid, 'customers'), orderBy('name'))
    const unsubC = onSnapshot(qc, (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => {
      unsub()
      unsubC()
    }
  }, [user])

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
  }, [])

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === p.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === p.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          shopPrice: p.shopPrice,
          mrp: p.mrp,
          price: p.mrp,
          qty: 1,
        },
      ]
    })
    setSearch('')
  }

  function updateCartItem(productId, field, value) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, [field]: Number(value) } : item
      )
    )
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  async function startScan() {
    setScanMsg('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
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
    if (match) {
      addToCart(match)
    } else {
      setScanMsg('Ye barcode kisi product se match nahi hua. Naam se search kar lo.')
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : []

  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.phone || '').includes(customerSearch)
      )
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
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        shopPrice: item.shopPrice,
      })),
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
      if (product) {
        batch.update(doc(db, 'users', user.uid, 'products', item.productId), {
          stock: (product.stock || 0) - item.qty,
        })
      }
    })

    await batch.commit()
    setLastInvoice(invoice)
    setCart([])
    setSelectedCustomer(null)
    setAmountReceived('')
  }

  return (
    <div className="page">
      <TopBar title="Billing" subtitle="Bill banao, print karo" />

      <div className="card">
        <label>Customer (optional — udhaar ke liye zaroori)</label>
        {selectedCustomer ? (
          <div className="selected-customer-chip">
            <span>
              {selectedCustomer.name} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}
            </span>
            <button className="btn-delete" onClick={() => setSelectedCustomer(null)}>
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="barcode-input-row">
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Naam ya phone se dhoondo"
              />
              <button
                type="button"
                className="btn-scan"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                + Naya
              </button>
            </div>
            {filteredCustomers.length > 0 && (
              <div className="search-results">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    className="search-result-row"
                    onClick={() => {
                      setSelectedCustomer(c)
                      setCustomerSearch('')
                    }}
                  >
                    <span>{c.name}</span>
                    <span className="price-mrp">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {showNewCustomer && (
              <div className="new-customer-form">
                <input
                  placeholder="Naam"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <input
                  placeholder="Phone (optional)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  inputMode="tel"
                />
                <button className="btn-primary btn-small" onClick={handleAddNewCustomer}>
                  Add Karo
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <label>
          Product dhoondo ya scan karo
          <div className="barcode-input-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product ka naam type karo"
            />
            {scanSupported && (
              <button type="button" className="btn-scan" onClick={startScan}>
                📷 Scan
              </button>
            )}
          </div>
        </label>
        {scanMsg && <p className="form-error">{scanMsg}</p>}
        {filtered.length > 0 && (
          <div className="search-results">
            {filtered.map((p) => (
              <button key={p.id} className="search-result-row" onClick={() => addToCart(p)}>
                <span>{p.name}</span>
                <span className="price-mrp">
                  MRP ₹{p.mrp} · Stock {p.stock ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {scanning && (
        <div className="scan-overlay">
          <video ref={videoRef} className="scan-video" muted playsInline />
          <p>Barcode ko camera ke saamne rakho</p>
          <button className="btn-secondary" onClick={stopScan}>
            Band Karo
          </button>
        </div>
      )}

      {cart.length > 0 && (
        <div className="card cart-card">
          <h3 className="section-title" style={{ margin: 0 }}>
            Bill ke items
          </h3>
          {cart.map((item) => (
            <div className="cart-row" key={item.productId}>
              <div className="cart-row-name">{item.name}</div>
              <div className="cart-row-fields">
                <label className="cart-qty">
                  Qty
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value)}
                  />
                </label>
                <label className="cart-price">
                  Price
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateCartItem(item.productId, 'price', e.target.value)}
                  />
                </label>
                <span className="cart-line-total">₹{(item.price * item.qty).toFixed(0)}</span>
                <button className="btn-delete" onClick={() => removeFromCart(item.productId)}>
                  ✕
                </button>
              </div>
            </div>
          ))}

          <label>
            Kitna Amount mila (baaki udhaar ho jayega)
            <input
              type="number"
              placeholder={String(total)}
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
            />
          </label>

          <div className="cart-totals">
            <span>Total: ₹{total.toFixed(0)}</span>
            <span className="cart-profit">Profit: ₹{profit.toFixed(0)}</span>
          </div>
          {due > 0 && <p className="form-error">Udhaar rahega: ₹{due.toFixed(0)}</p>}

          <button className="btn-primary" onClick={handleCheckout}>
            Bill Confirm Karo
          </button>
        </div>
      )}

      {lastInvoice && (
        <div className="card sale-done-card">
          <p>
            ✅ Bill ban gaya — {lastInvoice.invoiceNo} (profit ₹{lastInvoice.profit.toFixed(0)})
            {lastInvoice.due > 0 && ` · Udhaar ₹${lastInvoice.due.toFixed(0)}`}
          </p>
          <PrintInvoice
            invoice={lastInvoice}
            shopName={profile?.shopName}
            printerWidth={profile?.printerWidth || '80'}
          />
        </div>
      )}
    </div>
  )
}
