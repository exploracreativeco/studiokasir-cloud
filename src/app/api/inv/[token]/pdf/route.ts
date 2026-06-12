// ============================================================
// api/inv/[token]/pdf — PDF invoice langsung terdownload (pdf-lib)
// Layout sesuai mockup yang di-acc (tanpa badge status).
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { parseInvToken } from '@/lib/inv-token'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!parseInvToken(params.token)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ambil data dari endpoint data (logika satu pintu)
  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/inv/${params.token}`, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const d = await res.json()

  const fmtRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const M = 50
  let y = height - 60

  const dark = rgb(0.1, 0.1, 0.12), gray = rgb(0.55, 0.55, 0.58), light = rgb(0.93, 0.93, 0.94)
  const green = rgb(0.13, 0.55, 0.3), amber = rgb(0.85, 0.55, 0.1)
  const text = (s: any, x: number, yy: number, size = 10, f = font, color = dark) =>
    page.drawText(String(s ?? ''), { x, y: yy, size, font: f, color })
  const right = (s: any, xR: number, yy: number, size = 10, f = font, color = dark) => {
    const w = f.widthOfTextAtSize(String(s ?? ''), size)
    page.drawText(String(s ?? ''), { x: xR - w, y: yy, size, font: f, color })
  }

  // HEADER
  text(d.studio.nama.toUpperCase(), M, y, 18, bold)
  if (d.studio.alamat) text(d.studio.alamat, M, y - 16, 9, font, gray)
  if (d.studio.whatsapp) text(`WA ${d.studio.whatsapp}`, M, y - 28, 9, font, gray)
  page.drawRectangle({ x: width - M - 170, y: y - 34, width: 170, height: 52, color: dark })
  right('INVOICE', width - M - 12, y + 2, 14, bold, rgb(1, 1, 1))
  right(d.nomor, width - M - 12, y - 14, 10, font, rgb(1, 1, 1))
  right(new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), width - M - 12, y - 27, 9, font, rgb(0.8, 0.8, 0.8))

  y -= 70
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: light })
  y -= 24

  // CUSTOMER + jenis
  text('DITAGIHKAN KEPADA', M, y, 8, bold, gray)
  text(d.customer, M, y - 14, 12, bold)
  if (d.whatsapp) text(d.whatsapp, M, y - 28, 9, font, gray)
  right(d.jenis.toUpperCase(), width - M, y - 14, 9, bold, gray)
  y -= 52

  // TABEL
  page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 22, color: dark })
  text('DESKRIPSI', M + 10, y, 9, bold, rgb(1, 1, 1))
  right('QTY', width - M - 170, y, 9, bold, rgb(1, 1, 1))
  right('JUMLAH', width - M - 10, y, 9, bold, rgb(1, 1, 1))
  y -= 28
  for (let i = 0; i < d.items.length; i++) {
    const it = d.items[i]
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 22, color: rgb(0.97, 0.97, 0.98) })
    text(String(it.deskripsi).slice(0, 60), M + 10, y, 10)
    right(it.qty, width - M - 170, y, 10)
    right(fmtRp(it.jumlah), width - M - 10, y, 10)
    y -= 22
    if (y < 200) break // jaga-jaga item sangat banyak
  }
  y -= 6
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: light })
  y -= 22

  // RINGKASAN — adaptif per jenis
  const xL = width - M - 210
  if (d.diskon > 0) {
    right('Subtotal', xL + 100, y, 10, font, gray); right(fmtRp(d.subtotal), width - M - 10, y, 10); y -= 18
    right(`Diskon${d.promo ? ` (${d.promo})` : ''}`, xL + 100, y, 10, font, gray); right('- ' + fmtRp(d.diskon), width - M - 10, y, 10); y -= 18
    page.drawLine({ start: { x: xL, y: y + 6 }, end: { x: width - M, y: y + 6 }, thickness: 0.7, color: light })
  }
  right('TOTAL', xL + 100, y - 6, 12, bold); right(fmtRp(d.total), width - M - 10, y - 6, 12, bold); y -= 26
  if (d.sisa > 0) {
    right(`Dibayar${d.metode ? ` (${d.metode})` : ''}`, xL + 100, y, 10, font, gray); right(fmtRp(d.dibayar), width - M - 10, y, 10, font, green); y -= 18
    right('SISA PEMBAYARAN', xL + 100, y, 11, bold, amber); right(fmtRp(d.sisa), width - M - 10, y, 11, bold, amber); y -= 22
  } else {
    right(d.isDP ? `DP diterima — terima kasih` : `LUNAS${d.metode ? ` · ${d.metode}` : ''} — terima kasih`, xL + 100, y, 10, bold, green); y -= 22
  }

  y -= 22
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: light }); y -= 18
  if (d.fotografer) { text(`Fotografer: ${d.fotografer}`, M, y, 9, font, gray); y -= 14 }
  if (d.catatan) { text(String(d.catatan).slice(0, 100), M, y, 9, font, gray); y -= 14 }
  text(`Terima kasih telah memilih ${d.studio.nama}! Simpan invoice ini sebagai bukti transaksi.`, M, y, 9, font, gray); y -= 14
  text('Dokumen ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan.', M, y, 8, font, rgb(0.7, 0.7, 0.72))

  const bytes = await doc.save()
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${d.nomor}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
