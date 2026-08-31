import { useEffect, useRef, useState } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PrintBarcodeLabel from '../components/PrintBarcodeLabel'

function generateBarcode() {
  return String(Date.now()).slice(-12).padStart(12, '0')
}

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [shopPrice, setShopPrice] = useState('')
  const [mrp, setMrp] = useState('')
  const [stock, setStock] = useState('')
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(true)
  const [printProduct, setPrintProduct] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkEdits, setBulkEdits] = useState({})
  const [adjustingId, setAdjustingId] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'products'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
  }, [])

  async function startScan() {
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
            setBarcode(codes[0].rawValue)
            stopScan()
            return
          }
        } catch {
          // frame not ready yet
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } catch (err) {
      alert('Camera access nahi mil paya. Barcode manually likh do.')
      setScanning(false)
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name || !shopPrice || !mrp) return
    await addDoc(collection(db, 'users', user.uid, 'products'), {
      name,
      shopPrice: Number(shopPrice),
      mrp: Number(mrp),
      stock: stock === '' ? 0 : Number(stock),
      barcode: barcode || generateBarcode(),
      createdAt: Date.now(),
    })
    setName('')
    setShopPrice('')
    setMrp('')
    setStock('')
    setBarcode('')
  }

  async function handleDelete(id) {
    if (!confirm('Ye product hata dein?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'products', id))
  }

  function enterBulkMode() {
    const seed = {}
    products.forEach((p) => {
      seed[p.id] = { shopPrice: p.shopPrice, mrp: p.mrp, stock: p.stock ?? 0 }
    })
    setBulkEdits(seed)
    setBulkMode(true)
  }

  function updateBulkField(id, field, value) {
    setBulkEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveBulkEdits() {
    const batch = writeBatch(db)
    products.forEach((p) => {
      const edit = bulkEdits[p.id]
      if (!edit) return
      batch.update(doc(db, 'users', user.uid, 'products', p.id), {
        shopPrice: Number(edit.shopPrice),
        mrp: Number(edit.mrp),
        stock: Number(edit.stock),
      })
    })
    await batch.commit()
    setBulkMode(false)
  }

  async function saveAdjustment(product) {
    const qty = Number(adjustQty)
    if (!qty) return
    const newStock = (product.stock || 0) + qty
    await updateDoc(doc(db, 'users', user.uid, 'products', product.id), { stock: newStock })
    await addDoc(collection(db, 'users', user.uid, 'stockAdjustments'), {
      productId: product.id,
      productName: product.name,
      change: qty,
      reason: adjustReason || (qty > 0 ? 'Stock added' : 'Stock reduced'),
      newStock,
      timestamp: Date.now(),
    })
    setAdjustingId(null)
    setAdjustQty('')
    setAdjustReason('')
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">Products</h2>
        {!bulkMode ? (
          <button className="btn-secondary btn-small" onClick={enterBulkMode}>
            Bulk Edit
          </button>
        ) : (
          <div className="btn-row-inline">
            <button className="btn-secondary btn-small" onClick={() => setBulkMode(false)}>
              Cancel
            </button>
            <button className="btn-primary btn-small" onClick={saveBulkEdits}>
              Save All
            </button>
          </div>
        )}
      </div>

      {!bulkMode && (
        <form className="card form-card" onSubmit={handleAdd}>
          <label>
            Product ka naam
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div className="price-row">
            <label>
              Dukan Price (₹)
              <input
                type="number"
                inputMode="decimal"
                value={shopPrice}
                onChange={(e) => setShopPrice(e.target.value)}
                required
              />
            </label>
            <label>
              MRP (₹)
              <input
                type="number"
                inputMode="decimal"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Shuru ka Stock (quantity)
            <input
              type="number"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Barcode (khali chodo to auto-generate ho jayega)
            <div className="barcode-input-row">
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan karo ya type karo"
              />
              {scanSupported && (
                <button type="button" className="btn-scan" onClick={startScan}>
                  📷 Scan
                </button>
              )}
            </div>
          </label>

          <button type="submit" className="btn-primary">
            Product Add Karo
          </button>
        </form>
      )}

      {scanning && (
        <div className="scan-overlay">
          <video ref={videoRef} className="scan-video" muted playsInline />
          <p>Barcode ko camera ke saamne rakho</p>
          <button className="btn-secondary" onClick={stopScan}>
            Band Karo
          </button>
        </div>
      )}

      <div className="list">
        {products.length === 0 && <p className="empty-state">Abhi koi product add nahi hua</p>}

        {products.map((p) =>
          bulkMode ? (
            <div className="product-row bulk-row" key={p.id}>
              <div className="product-info">
                <strong>{p.name}</strong>
              </div>
              <div className="bulk-fields">
                <label>
                  Dukan
                  <input
                    type="number"
                    value={bulkEdits[p.id]?.shopPrice ?? ''}
                    onChange={(e) => updateBulkField(p.id, 'shopPrice', e.target.value)}
                  />
                </label>
                <label>
                  MRP
                  <input
                    type="number"
                    value={bulkEdits[p.id]?.mrp ?? ''}
                    onChange={(e) => updateBulkField(p.id, 'mrp', e.target.value)}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    value={bulkEdits[p.id]?.stock ?? ''}
                    onChange={(e) => updateBulkField(p.id, 'stock', e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="product-row" key={p.id}>
              <div className="product-info">
                <strong>{p.name}</strong>
                <span className="barcode-tag">#{p.barcode}</span>
                <span className={'stock-tag' + ((p.stock ?? 0) <= 0 ? ' stock-low' : '')}>
                  Stock: {p.stock ?? 0}
                </span>
              </div>
              <div className="product-prices">
                <span className="price-shop">₹{p.shopPrice}</span>
                <span className="price-mrp">MRP ₹{p.mrp}</span>
              </div>
              <div className="product-actions">
                <button
                  className="btn-icon"
                  title="Stock adjust karo"
                  onClick={() => setAdjustingId(adjustingId === p.id ? null : p.id)}
                >
                  ±
                </button>
                <button
                  className="btn-icon"
                  title="Barcode print karo"
                  onClick={() => setPrintProduct(p)}
                >
                  🖨️
                </button>
                <button className="btn-delete" onClick={() => handleDelete(p.id)}>
                  ✕
                </button>
              </div>

              {adjustingId === p.id && (
                <div className="adjust-panel">
                  <input
                    type="number"
                    placeholder="+5 ya -5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                  <button className="btn-primary btn-small" onClick={() => saveAdjustment(p)}>
                    Save
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {printProduct && (
        <PrintBarcodeLabel product={printProduct} onDone={() => setPrintProduct(null)} />
      )}
    </div>
  )
}
