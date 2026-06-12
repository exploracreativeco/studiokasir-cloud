'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'

interface TagihanModalProps {
  tx: any
  onClose: () => void
}

export function TagihanModal({ tx, onClose }: TagihanModalProps) {
  const tagihanRef = useRef<HTMLDivElement>(null)
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
  const metodePembayaran = tx.metodePembayaran
  const allAddons = tx.items?.flatMap((item: any) => item.addons?.map((a: any) => a.addon) || []) || []
  const uniqueAddons = allAddons.filter((a: any, idx: number, arr: any[]) => arr.findIndex((b: any) => b?.id === a?.id) === idx)

  const NAVY = '#0f2d5c'
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'

  async function handleDownload() {
    setDownloading(true)
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default
      if (!tagihanRef.current) return
      const clone = tagihanRef.current.cloneNode(true) as HTMLElement
      const styleEl = document.createElement('style')
      styleEl.textContent = `@import url('${FONT_URL}'); * { font-family: 'Plus Jakarta Sans', Arial, sans-serif !important; }`
      clone.prepend(styleEl)
      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `TAGIHAN-${tx.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false },
      }).from(clone).save()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="flex-1 text-sm font-bold text-gray-800">Tagihan Preview</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">PDF Only — Tanpa status pembayaran</span>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: NAVY }}>
            <Download className="w-3.5 h-3.5" /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={onClose} className="border border-gray-200 rounded-lg p-1.5 hover:bg-gray-50"><X className="w-4 h-4" /></button>
        </div>

        {/* Tagihan Content */}
        <div className="overflow-y-auto bg-gray-100 p-6">
          <div ref={tagihanRef} style={{
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
                <div style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-1.5px', color: NAVY }}>TAGIHAN</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginTop: '6px' }}>{tx.invoiceNumber}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{formatDate(tx.transactionDate)}</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '2px', background: `linear-gradient(to right, ${NAVY}, ${NAVY}22)`, marginBottom: '28px', borderRadius: '2px' }} />

            {/* Bill To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Tagihan Kepada</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0a0a0a', letterSpacing: '-0.3px' }}>{tx.customer?.name}</div>
                {tx.customer?.whatsapp && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{tx.customer.whatsapp}</div>}
                {tx.customer?.email && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{tx.customer.email}</div>}
              </div>
              <div>
                {tx.fotografer && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Fotografer: <strong style={{ color: '#0a0a0a' }}>{tx.fotografer.name}</strong></div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 50px 110px 110px',
                background: NAVY, borderRadius: '8px 8px 0 0',
                padding: '10px 14px', gap: '8px',
              }}>
                {['NO', 'DESKRIPSI', 'QTY', 'HARGA', 'TOTAL'].map((h, i) => (
                  <div key={h} style={{ fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.12em', textAlign: i > 2 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>
              {tx.items?.map((item: any, idx: number) => (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 50px 110px 110px',
                  padding: '11px 14px', gap: '8px',
                  background: idx % 2 === 0 ? 'white' : '#fafafa',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{idx + 1}</div>
                  <div>
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
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>1</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right' }}>
                    {item.jumlahOrang ? `${formatRupiah(item.hargaPerOrang || item.package?.price)}/org` : formatRupiah(item.price)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a0a0a', textAlign: 'right' }}>{formatRupiah(item.price)}</div>
                </div>
              ))}
              {uniqueAddons.map((addon: any, idx: number) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 50px 110px 110px',
                  padding: '8px 14px', gap: '8px',
                  background: (tx.items?.length + idx) % 2 === 0 ? 'white' : '#fafafa',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <div />
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>↳ Add-On: {addon?.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>1</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{formatRupiah(addon?.price)}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{formatRupiah(addon?.price)}</div>
                </div>
              ))}
              <div style={{ height: '2px', background: '#0a0a0a', borderRadius: '0 0 2px 2px' }} />
            </div>

            {/* Payment + Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '32px', marginBottom: '28px' }}>
              <div>
                {metodePembayaran && (
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Metode Pembayaran</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>{metodePembayaran.nama}</div>
                    {metodePembayaran.namaBank && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>Bank {metodePembayaran.namaBank}</div>}
                    {metodePembayaran.nomorRekening && (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a', fontFamily: 'monospace', marginTop: '3px' }}>{metodePembayaran.nomorRekening}</div>
                    )}
                    {metodePembayaran.atasNama && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>a.n. {metodePembayaran.atasNama}</div>}
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '4px' }}>
                <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Subtotal</span>
                    <span style={{ fontSize: '11px', color: '#374151' }}>{formatRupiah(tx.subtotal)}</span>
                  </div>
                  {tx.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#16a34a' }}>Diskon{tx.promoCode ? ` (${tx.promoCode.code})` : ''}</span>
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>- {formatRupiah(tx.discount)}</span>
                    </div>
                  )}
                </div>
                <div style={{ background: NAVY, borderRadius: '8px', padding: '10px 14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', letterSpacing: '0.05em' }}>TOTAL</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{formatRupiah(tx.grandTotal)}</span>
                  </div>
                </div>
                {tx.dpAmount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>Sudah Dibayarkan</span>
                      <span style={{ fontSize: '11px', color: '#374151' }}>- {formatRupiah(tx.dpAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151' }}>Dibayarkan Sekarang</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>{formatRupiah(tx.diterimaSaatIni || (tx.grandTotal - tx.dpAmount))}</span>
                    </div>
                  </>
                )}
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
                <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>Harap melakukan pembayaran sesuai dengan tagihan di atas.</div>
                <div style={{ fontSize: '10px', color: '#d1d5db', fontWeight: '600' }}>{studioName}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
