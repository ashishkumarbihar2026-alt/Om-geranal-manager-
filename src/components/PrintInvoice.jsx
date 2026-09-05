export default function PrintInvoice({ invoice, shopName, printerWidth = '80' }) {
  function handlePrint() {
    window.print()
  }

  return (
    <>
      <button className="btn-primary" onClick={handlePrint}>
        🖨️ Invoice Print Karo
      </button>

      <div className={'print-only-invoice printer-' + printerWidth}>
        <p className="invoice-shop-name">{shopName || document.title}</p>
        <p className="invoice-no">Bill No: {invoice.invoiceNo}</p>
        <p className="invoice-date">
          {new Date(invoice.timestamp).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {invoice.customerName && <p className="invoice-date">Customer: {invoice.customerName}</p>}
        <div className="invoice-divider" />
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.qty}</td>
                <td>{item.price}</td>
                <td>{(item.price * item.qty).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-divider" />
        <p className="invoice-total">Total: ₹{invoice.total.toFixed(0)}</p>
        {invoice.due > 0 && <p className="invoice-total">Udhaar: ₹{invoice.due.toFixed(0)}</p>}
        <p className="invoice-thanks">Dhanyavaad! Phir aaiyega</p>
      </div>
    </>
  )
}
