import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export default function PrintBarcodeLabel({ product, onDone }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && product?.barcode) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128',
          width: 1.6,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
        })
      } catch {
        // invalid barcode value, ignore rendering
      }
    }
  }, [product])

  function handlePrint() {
    window.print()
  }

  return (
    <div className="print-modal">
      <div className="print-modal-card">
        <p className="print-modal-title">{product.name}</p>
        <svg ref={svgRef} className="barcode-preview"></svg>
        <p className="print-modal-mrp">MRP ₹{product.mrp}</p>
        <div className="btn-row">
          <button className="btn-secondary" onClick={onDone}>
            Band Karo
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            🖨️ Print Karo
          </button>
        </div>
      </div>

      <div className="print-only-label">
        <p className="print-shop-name">{document.title}</p>
        <p className="print-product-name">{product.name}</p>
        <svg
          ref={(el) => {
            if (el && product?.barcode) {
              try {
                JsBarcode(el, product.barcode, {
                  format: 'CODE128',
                  width: 1.4,
                  height: 34,
                  displayValue: true,
                  fontSize: 10,
                  margin: 2,
                })
              } catch {
                // ignore
              }
            }
          }}
        ></svg>
        <p className="print-mrp">MRP ₹{product.mrp}</p>
      </div>
    </div>
  )
}
