export default function PrintLabel({ name, mrp }) {
  function handlePrint() {
    window.print()
  }

  return (
    <>
      <button className="btn-primary" onClick={handlePrint}>
        🖨️ Label Print Karo
      </button>

      {/* Ye hissa sirf print ke time dikhta hai (CSS mein @media print dekho) */}
      <div className="print-only-label">
        <p className="print-shop-name">{document.title}</p>
        <p className="print-product-name">{name}</p>
        <p className="print-mrp">MRP ₹{mrp}</p>
      </div>
    </>
  )
}
