'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Printer, Download, Smartphone, Mail } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'

interface InvoiceModalProps {
  tx: any
  onClose: () => void
}

export function InvoiceModal({ tx, onClose }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<any>(null)
  const [emailModal, setEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [barcodeUrl, setBarcodeUrl] = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setSettings(s)
      if (tx.customer?.email) setEmailTo(tx.customer.email)
    })
    setBarcodeUrl(`https://barcodeapi.org/api/128/${encodeURIComponent(tx.invoiceNumber)}`)
  }, [])

  const studioName = settings?.studioName || 'StudioHub'
  const studioAddress = settings?.address || ''
  const studioWa = settings?.whatsapp || ''
  const studioIg = settings?.instagram || ''
  const invoiceFooter = settings?.invoiceFooter || 'Terima kasih atas kepercayaan Anda.'
  const syaratKetentuan = settings?.syaratKetentuan || ''
  const metodePembayaran = tx.metodePembayaran
  const allAddons = tx.items?.flatMap((item: any) => item.addons?.map((a: any) => a.addon) || []) || []
  const uniqueAddons = allAddons.filter((a: any, idx: number, arr: any[]) => arr.findIndex((b: any) => b?.id === a?.id) === idx)

  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'

  const invoiceStyles = `
    @import url('${FONT_URL}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
    @media print { @page { margin: 10mm; size: A4; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  `

  function handlePrint() {
    const content = invoiceRef.current?.innerHTML || ''
    const w = window.open('', '_blank', 'width=800,height=1050')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice ${tx.invoiceNumber}</title>
      <style>${invoiceStyles}</style>
    </head><body>${content}</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 800)
  }

  function handleThermalPrint(size: '58mm' | '80mm') {
    const width = size === '58mm' ? '58mm' : '80mm'
    const w = window.open('', '_blank', 'width=300,height=600')
    if (!w) return
    const content = `<!DOCTYPE html><html><head><style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; }
      body { font-family: 'Plus Jakarta Sans', monospace; font-size: 10px; width: ${width}; padding: 5px; }
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .line { border-top: 1px dashed #000; margin: 5px 0; }
      .row { display: flex; justify-content: space-between; margin: 2px 0; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <div class="bold center" style="font-size:13px;margin-bottom:2px">${studioName}</div>
      ${studioAddress ? `<div class="center" style="font-size:9px;color:#555">${studioAddress}</div>` : ''}
      ${studioWa ? `<div class="center" style="font-size:9px;color:#555">${studioWa}</div>` : ''}
      <div class="line"></div>
      <div class="row"><span class="bold">${tx.invoiceNumber}</span><span>${formatDate(tx.transactionDate)}</span></div>
      <div class="row"><span>Customer</span><span class="bold">${tx.customer?.name}</span></div>

      <div class="line"></div>
      ${tx.items?.map((item: any) => `
        <div style="margin:3px 0">
          <div class="bold">${item.customItemName || item.package?.name}${item.jumlahOrang ? ` (${item.jumlahOrang} org)` : ''}${item.customItemName ? ' <span style="font-weight:400;font-size:9px">(Custom)</span>' : ''}</div>
          <div class="row"><span></span><span>${formatRupiah(item.price)}</span></div>
        </div>
      `).join('') || ''}
      ${uniqueAddons.map((a: any) => `<div class="row"><span style="padding-left:8px">+ ${a?.name}</span><span>${formatRupiah(a?.price)}</span></div>`).join('')}
      <div class="line"></div>
      ${tx.discount > 0 ? `<div class="row"><span>Diskon</span><span>- ${formatRupiah(tx.discount)}</span></div>` : ''}
      <div class="row bold" style="font-size:12px;border-top:1px solid #000;padding-top:4px;margin-top:2px"><span>TOTAL</span><span>${formatRupiah(tx.grandTotal)}</span></div>
      <div class="row" style="margin-top:3px"><span>Sudah Dibayarkan</span><span>${formatRupiah(tx.dpAmount)}</span></div>
      <div class="row bold"><span>Sisa</span><span>${formatRupiah(tx.remainingPayment)}</span></div>
      ${metodePembayaran ? `
        <div class="line"></div>
        <div class="row"><span>Metode</span><span class="bold">${metodePembayaran.nama}</span></div>
        ${metodePembayaran.nomorRekening ? `<div class="row"><span>No. Rek</span><span class="bold">${metodePembayaran.nomorRekening}</span></div>` : ''}
        ${metodePembayaran.atasNama ? `<div class="row"><span>a.n.</span><span>${metodePembayaran.atasNama}</span></div>` : ''}
      ` : ''}
      <div class="line"></div>
      <div class="center" style="font-size:9px;color:#555">${invoiceFooter}</div>
      <br/><br/></body></html>`
    w.document.write(content)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 600)
  }

  async function handleDownload() {
    const btn = document.getElementById('pdf-dl-btn') as HTMLButtonElement
    if (btn) { btn.textContent = 'Generating...'; btn.disabled = true }
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default
      if (!invoiceRef.current) return

      const clone = invoiceRef.current.cloneNode(true) as HTMLElement

      // Reset semua style agar konsisten di PDF
      // Hapus height yang terlalu besar
      clone.style.cssText = [
        'font-family: Arial, Helvetica, sans-serif',
        'color: #0a0a0a',
        'background: white',
        'width: 720px',
        'padding: 40px 44px',
        'margin: 0',
        'box-shadow: none',
        'overflow: hidden',
        'max-width: none',
      ].join(';')

      // Fix semua gambar agar crossorigin
      clone.querySelectorAll('img').forEach((img: any) => {
        img.crossOrigin = 'anonymous'
      })

      // Inject CSS untuk fix alignment
      const styleEl = document.createElement('style')
      styleEl.textContent = `
        * { font-family: Arial, Helvetica, sans-serif !important; box-sizing: border-box; }
        div { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      `
      clone.prepend(styleEl)

      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${tx.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 720,
          windowWidth: 768,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false },
      }).from(clone).save()
    } catch (err: any) {
      alert('Gagal generate PDF: ' + err.message)
    } finally {
      if (btn) { btn.textContent = '⬇ PDF'; btn.disabled = false }
    }
  }

  async function sendEmail() {
    if (!emailTo) return
    setSendingEmail(true)
    try {
      // 1. Generate PDF di browser
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default
      if (!invoiceRef.current) return

      const clone = invoiceRef.current.cloneNode(true) as HTMLElement
      const styleEl = document.createElement('style')
      styleEl.textContent = `@import url('${FONT_URL}'); * { font-family: 'Plus Jakarta Sans', Arial, sans-serif !important; }`
      clone.prepend(styleEl)

      const pdfBlob: Blob = await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `${tx.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false },
      }).from(clone).outputPdf('blob')

      // 2. Convert blob ke base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(pdfBlob)
      })

      // 3. Kirim ke server dengan PDF base64
      const res = await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, toEmail: emailTo, pdfBase64: base64, pdfFilename: `${tx.invoiceNumber}.pdf` }),
      })
      const data = await res.json()
      if (data.ok) { alert('Email terkirim!'); setEmailModal(false) }
      else alert('Gagal: ' + data.error)
    } catch (err: any) {
      alert('Gagal generate PDF: ' + err.message)
    } finally {
      setSendingEmail(false)
    }
  }

  // Navy accent color
  const NAVY = '#0f2d5c'
  const totalItemDiscount = tx.items?.reduce((s: number, i: any) => s + (i.discount || 0), 0) || 0
  const NAVY_LIGHT = '#e8eef7'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0 flex-wrap">
          <span className="flex-1 text-sm font-bold text-gray-800">Invoice Preview</span>
          <button onClick={handlePrint} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"><Printer className="w-3.5 h-3.5" /> Print A4</button>
          <button onClick={() => handleThermalPrint('58mm')} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"><Smartphone className="w-3 h-3" /> 58mm</button>
          <button onClick={() => handleThermalPrint('80mm')} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"><Smartphone className="w-3 h-3" /> 80mm</button>
          <button id="pdf-dl-btn" onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50" style={{ background: NAVY }}><Download className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={() => setEmailModal(true)} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition-colors"><Mail className="w-3.5 h-3.5" /> Email</button>
          <button onClick={onClose} className="border border-gray-200 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Invoice */}
        <div className="overflow-y-auto bg-gray-100 p-6">
          <div ref={invoiceRef} style={{
            fontFamily: "'Plus Jakarta Sans', -apple-system, Arial, sans-serif",
            color: '#0a0a0a',
            maxWidth: '640px',
            margin: '0 auto',
            background: 'white',
            padding: '44px 48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" style={{ width: '54px', height: '54px', objectFit: 'contain' }} />
                )}
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.4px', color: '#0a0a0a' }}>{studioName}</div>
                  {studioAddress && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', lineHeight: '1.5' }}>{studioAddress}</div>}
                  {studioWa && <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{studioWa}</div>}
                  {studioIg && <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{studioIg}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-1.5px', color: NAVY }}>INVOICE</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginTop: '6px', letterSpacing: '0.02em' }}>{tx.invoiceNumber}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{formatDate(tx.transactionDate)}</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '2px', background: `linear-gradient(to right, ${NAVY}, ${NAVY}22)`, marginBottom: '28px', borderRadius: '2px' }} />

            {/* Bill To */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Invoice To</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0a0a0a', letterSpacing: '-0.3px' }}>{tx.customer?.name}</div>
                {tx.customer?.whatsapp && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{tx.customer.whatsapp}</div>}
                {tx.customer?.email && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{tx.customer.email}</div>}
              </div>

            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ background: NAVY, borderRadius: '8px 8px 0 0' }}>
                  <th style={{ width: '36px', padding: '10px 8px 10px 14px', fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'left' }}>NO</th>
                  <th style={{ padding: '10px 8px', fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'left' }}>DESKRIPSI</th>
                  <th style={{ width: '50px', padding: '10px 8px', fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'center' }}>QTY</th>
                  <th style={{ width: '110px', padding: '10px 8px', fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'right' }}>HARGA</th>
                  <th style={{ width: '110px', padding: '10px 14px 10px 8px', fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {tx.items?.map((item: any, idx: number) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 8px 11px 14px', fontSize: '11px', color: '#9ca3af', verticalAlign: 'top' }}>{idx + 1}</td>
                    <td style={{ padding: '11px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a0a0a' }}>
                        {item.customItemName || item.package?.name}
                        {item.jumlahOrang && <span style={{ fontWeight: '500', color: '#6b7280' }}> · {item.jumlahOrang} orang</span>}
                      </div>
                      {item.customItemName && (
                        <div style={{ fontSize: '10px', color: '#f97316', marginTop: '2px' }}>Custom Item</div>
                      )}
                      {!item.customItemName && item.package?.description && (
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', lineHeight: '1.5' }}>{item.package.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '11px 8px', fontSize: '11px', color: '#6b7280', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                    <td style={{ padding: '11px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                      {item.discount > 0 && item.jumlahOrang ? (<>
                        <div style={{ fontSize: '10px', color: '#9ca3af', textDecoration: 'line-through' }}>{formatRupiah(item.hargaPerOrang || item.package?.price)}/org</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{formatRupiah(Math.round((item.price - item.discount) / item.jumlahOrang))}/org</div>
                      </>) : (
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {item.jumlahOrang ? `${formatRupiah(item.hargaPerOrang || item.package?.price)}/org` : formatRupiah(item.price)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px 11px 8px', fontSize: '12px', fontWeight: '700', color: '#0a0a0a', textAlign: 'right', verticalAlign: 'top' }}>
                      {formatRupiah(item.price - (item.discount || 0))}
                    </td>
                  </tr>
                ))}
                {uniqueAddons.map((addon: any, idx: number) => (
                  <tr key={idx} style={{ background: (tx.items?.length + idx) % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 8px 8px 14px' }}></td>
                    <td style={{ padding: '8px 8px', fontSize: '11px', color: '#9ca3af' }} colSpan={1}>↳ Add-On: {addon?.name}</td>
                    <td style={{ padding: '8px 8px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '8px 8px', fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{formatRupiah(addon?.price)}</td>
                    <td style={{ padding: '8px 14px 8px 8px', fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{formatRupiah(addon?.price)}</td>
                  </tr>
                ))}
                <tr><td colSpan={5} style={{ height: '2px', background: '#0a0a0a', padding: 0 }}></td></tr>
              </tbody>
            </table>

            {/* Payment + Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '28px' }}>
              {/* Payment Method + Barcode */}
              <div>
                {metodePembayaran && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Metode Pembayaran</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>{metodePembayaran.nama}</div>
                    {metodePembayaran.namaBank && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>Bank {metodePembayaran.namaBank}</div>}
                    {metodePembayaran.nomorRekening && (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a', fontFamily: 'monospace', marginTop: '3px', letterSpacing: '0.05em' }}>
                        {metodePembayaran.nomorRekening}
                      </div>
                    )}
                    {metodePembayaran.atasNama && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>a.n. {metodePembayaran.atasNama}</div>}
                  </div>
                )}
                {/* Barcode */}
                {barcodeUrl && (
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>No. Invoice</div>
                    <img src={barcodeUrl} alt={tx.invoiceNumber} style={{ height: '38px', maxWidth: '200px', display: 'block' }} crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
              </div>

              {/* Totals */}
              <div style={{ paddingTop: '4px' }}>
                <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Subtotal</span>
                    <span style={{ fontSize: '11px', color: '#374151' }}>{formatRupiah(tx.subtotal)}</span>
                  </div>
                  {tx.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#16a34a' }}>Diskon{tx.promoCode ? ` (${tx.promoCode.code})` : ''}</span>
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>- {formatRupiah(totalItemDiscount)}</span>
                    </div>
                  )}
                </div>
                {/* Grand Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#374151' }}>Total</span>
                  <span style={{ fontSize: '11px', color: '#374151' }}>{formatRupiah(tx.grandTotal)}</span>
                </div>
                {tx.dpAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Sudah Dibayarkan</span>
                    <span style={{ fontSize: '11px', color: '#374151' }}>{formatRupiah(tx.dpAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: NAVY, borderRadius: '8px', padding: '12px 16px', marginTop: '8px', gap: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', letterSpacing: '0.05em' }}>
                    {tx.dpAmount > 0 ? 'PELUNASAN' : 'TOTAL'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: 'white', letterSpacing: '-0.3px' }}>
                    {tx.dpAmount > 0 ? formatRupiah(tx.grandTotal - tx.dpAmount) : formatRupiah(tx.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Hemat Box */}
            {totalItemDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', letterSpacing: '0.05em' }}>
                    🎉 SELAMAT! ANDA HEMAT
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d', letterSpacing: '-0.5px', marginTop: '2px' }}>
                    {formatRupiah(totalItemDiscount)}
                  </div>
                </div>
              </div>
            )}
            {/* Payment Status Stamp */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginTop: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 18px',
                borderRadius: '6px',
                border: '2px solid #166534',
                color: '#166534',
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                opacity: 0.85,
              }}>
                ✓ LUNAS
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
              {tx.notes && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#374151' }}>Catatan:</strong> {tx.notes}
                </div>
              )}
              {syaratKetentuan && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '12px', lineHeight: '1.6' }}>
                  <strong style={{ color: '#6b7280' }}>Syarat & Ketentuan:</strong> {syaratKetentuan}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#374151', fontStyle: 'italic' }}>{invoiceFooter}</div>
                <div style={{ fontSize: '10px', color: '#d1d5db', fontWeight: '600' }}>{studioName}</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-bold mb-1">Kirim Invoice via Email</h2>
            <p className="text-xs text-gray-500 mb-4">{tx.invoiceNumber} — {tx.customer?.name}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Tujuan</label>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEmailModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={sendEmail} disabled={sendingEmail || !emailTo}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: NAVY }}>
                {sendingEmail ? 'Mengirim...' : 'Kirim Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
