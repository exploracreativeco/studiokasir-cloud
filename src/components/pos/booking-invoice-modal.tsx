'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Download, Printer } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'

interface BookingInvoiceModalProps {
  booking: any
  onClose: () => void
}

export function BookingInvoiceModal({ booking, onClose }: BookingInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings)
  }, [])

  const studioName = settings?.studioName || 'StudioKasir'
  const studioAddress = settings?.address || ''
  const studioWa = settings?.whatsapp || ''
  const studioIg = settings?.instagram || ''
  const syaratKetentuan = settings?.syaratKetentuan || ''
  const NAVY = '#0f2d5c'
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'

  async function handleDownload() {
    setDownloading(true)
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default
      if (!invoiceRef.current) return
      const clone = invoiceRef.current.cloneNode(true) as HTMLElement
      const styleEl = document.createElement('style')
      styleEl.textContent = `@import url('${FONT_URL}'); * { font-family: 'Plus Jakarta Sans', Arial, sans-serif !important; }`
      clone.prepend(styleEl)
      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `BOOKING-${booking.bookingNumber}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(clone).save()
    } finally {
      setDownloading(false)
    }
  }

  function handlePrint() {
    const content = invoiceRef.current?.innerHTML || ''
    const w = window.open('', '_blank', 'width=800,height=1050')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Booking ${booking.bookingNumber}</title>
      <style>@import url('${FONT_URL}'); * { margin:0; padding:0; box-sizing:border-box; font-family:'Plus Jakarta Sans',sans-serif; } @media print { @page { margin:10mm; } }</style>
    </head><body>${content}</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 800)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="flex-1 text-sm font-bold text-gray-800">Invoice Booking</span>
          <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: NAVY }}>
            <Download className="w-3.5 h-3.5" /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={onClose} className="border border-gray-200 rounded-lg p-1.5 hover:bg-gray-50"><X className="w-4 h-4" /></button>
        </div>

        {/* Invoice Content */}
        <div className="overflow-y-auto bg-gray-100 p-6">
          <div ref={invoiceRef} style={{
            fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
            color: '#0a0a0a', maxWidth: '640px', margin: '0 auto',
            background: 'white', padding: '44px 48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: '54px', height: '54px', objectFit: 'contain' }} />}
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#0a0a0a' }}>{studioName}</div>
                  {studioAddress && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>{studioAddress}</div>}
                  {studioWa && <div style={{ fontSize: '11px', color: '#6b7280' }}>{studioWa}</div>}
                  {studioIg && <div style={{ fontSize: '11px', color: '#6b7280' }}>{studioIg}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-1.5px', color: NAVY }}>INVOICE</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginTop: '6px' }}>{booking.bookingNumber}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{formatDate(booking.createdAt)}</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '2px', background: `linear-gradient(to right, ${NAVY}, ${NAVY}22)`, marginBottom: '28px', borderRadius: '2px' }} />

            {/* Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Customer</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0a0a0a' }}>{booking.namaCustomer}</div>
                {booking.whatsapp && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{booking.whatsapp}</div>}
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Detail Booking</div>
                <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                  <strong>Keperluan:</strong> {booking.keperluan}
                </div>
                {booking.tanggalSesi && (
                  <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                    <strong>Tanggal Sesi:</strong> {formatDate(booking.tanggalSesi)}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  <strong>Status:</strong> {booking.status}
                </div>
              </div>
            </div>

            {/* DP Table */}
            {booking.dpAmount > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 150px',
                  background: NAVY, borderRadius: '8px 8px 0 0',
                  padding: '10px 14px', gap: '8px',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em' }}>KETERANGAN</div>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: 'right' }}>JUMLAH</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', padding: '12px 14px', background: 'white', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700' }}>Down Payment (DP)</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', textAlign: 'right', color: NAVY }}>{formatRupiah(booking.dpAmount)}</div>
                </div>
                <div style={{ height: '2px', background: '#0a0a0a', borderRadius: '0 0 2px 2px' }} />
              </div>
            )}

            {/* Total Box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
              <div style={{ width: '200px' }}>
                <div style={{ background: NAVY, borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>DP DITERIMA</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{formatRupiah(booking.dpAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan */}
            {booking.catatan && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
                <strong style={{ color: '#374151' }}>Catatan:</strong> {booking.catatan}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
              {syaratKetentuan && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '12px', lineHeight: '1.6' }}>
                  <strong style={{ color: '#6b7280' }}>Syarat & Ketentuan:</strong> {syaratKetentuan}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>Bukti pembayaran DP — harap disimpan.</div>
                <div style={{ fontSize: '10px', color: '#d1d5db', fontWeight: '600' }}>{studioName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
