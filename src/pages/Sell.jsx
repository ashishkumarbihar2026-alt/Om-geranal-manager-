import { useEffect, useRef, useState } from 'react'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PrintLabel from '../components/PrintLabel'

export default function Sell() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [soldPrice, setSoldPrice] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(true)
  const [scanMsg, setScanMsg] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'products'), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
  }, [])

  function pickProduct(p) {
    setSelected(p)
    setSoldPrice(String(p.mrp))
    setSearch('')
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
          // frame not ready yet, ignore
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
      pickProduct(match)
    } else {
      setScanMsg(`Ye barcode (${code}) kisi product se match nahi hua. Naam se search kar lo.`)
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function handleSell(e) {
    e.preventDefault()
    if (!selected || !soldPrice) return
    const sale = {
      productId: selected.id,
      productName: selected.name,
      shopPrice: selected.shopPrice,
      mrp: selected.mrp,
      soldPrice: Number(soldPrice),
      profit: Number(soldPrice) - selected.shopPrice,
      timestamp: Date.now(),
    }
    await addDoc(collection(db, 'users', user.uid, 'sales'), sale)
    setLastSale(sale)
    setSelected(null)
    setSoldPrice('')
  }

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="page">
      <h2 className="page-title">Sell</h2>

      {!selected && (
        <div className="card">
          <label>
            Product dhoondo
            <div className="barcode-input-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product ka naam type karo"
                autoFocus
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
                <button key={p.id} className="search-result-row" onClick={() => pickProduct(p)}>
                  <span>{p.name}</span>
                  <span className="price-mrp">MRP ₹{p.mrp}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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

      {selected && (
        <form className="card form-card" onSubmit={handleSell}>
          <p className="sell-selected-name">{selected.name}</p>
          <div className="sell-meta">
            <span>Dukan Price: ₹{selected.shopPrice}</span>
            <span>MRP: ₹{selected.mrp}</span>
          </div>
          <label>
            Customer se liya gaya price (₹)
            <input
              type="number"
              inputMode="decimal"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              required
              autoFocus
            />
          </label>
          <p className="profit-preview">
            Profit: ₹{soldPrice ? (Number(soldPrice) - selected.shopPrice).toFixed(2) : '0.00'}
          </p>
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Sale Confirm Karo
            </button>
          </div>
        </form>
      )}

      {lastSale && (
        <div className="card sale-done-card">
          <p>✅ Sale record ho gayi — profit ₹{lastSale.profit.toFixed(2)}</p>
          <PrintLabel name={lastSale.productName} mrp={lastSale.mrp} />
        </div>
      )}
    </div>
  )
}
