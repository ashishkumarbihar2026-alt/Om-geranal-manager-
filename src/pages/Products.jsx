import { useEffect, useRef, useState } from 'react'
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

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [shopPrice, setShopPrice] = useState('')
  const [mrp, setMrp] = useState('')
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(true)
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
          // frame not ready yet, ignore
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
      barcode: barcode || null,
      createdAt: Date.now(),
    })
    setName('')
    setShopPrice('')
    setMrp('')
    setBarcode('')
  }

  async function handleDelete(id) {
    if (!confirm('Ye product hata dein?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'products', id))
  }

  return (
    <div className="page">
      <h2 className="page-title">Products</h2>

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
          Barcode (optional)
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
        {products.map((p) => (
          <div className="product-row" key={p.id}>
            <div className="product-info">
              <strong>{p.name}</strong>
              {p.barcode && <span className="barcode-tag">#{p.barcode}</span>}
            </div>
            <div className="product-prices">
              <span className="price-shop">₹{p.shopPrice}</span>
              <span className="price-mrp">MRP ₹{p.mrp}</span>
            </div>
            <button className="btn-delete" onClick={() => handleDelete(p.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
