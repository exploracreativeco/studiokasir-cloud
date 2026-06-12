const fs = require('fs');
const p = 'C:\\StudioKasir\\src\\components\\pos\\invoice-modal.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix label "Sisa" -> "Diterima Kasir" dan nilai = grandTotal - dpAmount
// Di HTML string (untuk print)
c = c.replace(
  `<div class="row bold"><span>Sisa</span><span>\${formatRupiah(tx.remainingPayment)}</span></div>`,
  `<div class="row bold" style="font-size:14px;margin-top:4px"><span>Diterima Kasir</span><span style="color:#1a56db">\${formatRupiah(tx.grandTotal - (tx.dpAmount||0))}</span></div>`
);

// Di JSX (untuk preview)
c = c.replace(
  `                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151' }}>Sisa</span>
                  </div>
                  <div>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: tx.remainingPayment > 0 ? NAVY : '#16a34a' }}>{formatRupiah(tx.remainingPayment)}</span>`,
  `                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151' }}>Diterima Kasir</span>
                  </div>
                  <div>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: NAVY }}>{formatRupiah(tx.grandTotal - (tx.dpAmount||0))}</span>`
);

fs.writeFileSync(p, c, 'utf8');
console.log('done');
