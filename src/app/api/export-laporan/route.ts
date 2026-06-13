import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const NAVY = '0F2D5C'
const EMERALD = '059669'
const ROSE = 'E11D48'
const AMBER = 'D97706'
const LIGHT_GRAY = 'F9FAFB'
const HEADER_TEXT = 'FFFFFF'

const MONTH_NAMES = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']

function styleHeader(row: ExcelJS.Row, bgColor: string = NAVY) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } }
    cell.font = { bold: true, color: { argb: 'FF' + HEADER_TEXT }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    }
  })
  row.height = 28
}

function styleDataRow(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF9FAFB' : 'FFFFFFFF' } }
    cell.font = { size: 10 }
    cell.alignment = { vertical: 'middle' }
    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } }
  })
  row.height = 22
}

function styleTotalRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle' }
  })
  row.height = 26
}

function formatRp(val: number) {
  return `Rp ${val.toLocaleString('id-ID')}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  // Fetch semua data tahun ini
  const [allTx, allOts, allBookings, allExpenses, settings] = await Promise.all([
    prisma.transaction.findMany({
      where: { transactionDate: { gte: start, lt: end } },
      include: { customer: true, fotografer: true, metodePembayaran: true, items: { include: { package: true } } },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.otsOrder.findMany({
      where: { orderDate: { gte: start, lt: end } },
      include: { metodePembayaran: true, items: true },
      orderBy: { orderDate: 'asc' },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: start, lt: end }, dpAmount: { gt: 0 } },
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.setting.findFirst(),
  ])

  const studioName = settings?.studioName || 'StudioHub'

  // Hitung data per bulan
  const monthlyData = MONTH_NAMES.map((name, mi) => {
    const mStart = new Date(year, mi, 1)
    const mEnd = new Date(year, mi + 1, 1)
    const txM = allTx.filter(t => new Date(t.transactionDate) >= mStart && new Date(t.transactionDate) < mEnd)
    const otsM = allOts.filter(o => new Date(o.orderDate) >= mStart && new Date(o.orderDate) < mEnd)
    const bookM = allBookings.filter(b => new Date(b.createdAt) >= mStart && new Date(b.createdAt) < mEnd)
    const expM = allExpenses.filter(e => new Date(e.date) >= mStart && new Date(e.date) < mEnd)
    const omzet = txM.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0)
      + otsM.reduce((s, o) => s + (o.total || 0), 0)
      + bookM.reduce((s, b) => s + (b.dpAmount || 0), 0)
    const pengeluaran = expM.reduce((s, e) => s + (e.amount || 0), 0)
    const order = txM.length + otsM.length + bookM.length
    return { name, omzet, pengeluaran, laba: omzet - pengeluaran, order, txM, otsM, bookM }
  })

  const totalOmzet = monthlyData.reduce((s, m) => s + m.omzet, 0)
  const totalPengeluaran = monthlyData.reduce((s, m) => s + m.pengeluaran, 0)
  const totalLaba = totalOmzet - totalPengeluaran
  const totalOrder = monthlyData.reduce((s, m) => s + m.order, 0)

  // Harian
  const dailyMap: Record<string, { omzet: number; order: number }> = {}
  for (let d = new Date(year, 0, 1); d < end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    dailyMap[key] = { omzet: 0, order: 0 }
  }
  for (const tx of allTx) {
    const d = new Date(tx.transactionDate)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (dailyMap[key]) { dailyMap[key].omzet += tx.diterimaSaatIni || tx.grandTotal || 0; dailyMap[key].order += 1 }
  }
  for (const o of allOts) {
    const d = new Date(o.orderDate)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (dailyMap[key]) { dailyMap[key].omzet += o.total || 0; dailyMap[key].order += 1 }
  }

  // Buat workbook
  const wb = new ExcelJS.Workbook()
  wb.creator = studioName
  wb.created = new Date()

  // ── SHEET 1: SUMMARY ──
  const wsSummary = wb.addWorksheet('Summary', { tabColor: { argb: 'FF' + NAVY } })
  wsSummary.columns = [{ width: 30 }, { width: 25 }]

  wsSummary.mergeCells('A1:B1')
  const titleCell = wsSummary.getCell('A1')
  titleCell.value = `${studioName.toUpperCase()} — LAPORAN TAHUNAN ${year}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF' + NAVY } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  wsSummary.getRow(1).height = 36

  wsSummary.addRow([])

  const summaryData = [
    ['RINGKASAN TAHUNAN', ''],
    ['Total Omzet', totalOmzet],
    ['Total Pengeluaran', totalPengeluaran],
    ['Total Laba', totalLaba],
    ['Total Order', totalOrder],
    ['Total Transaksi Kasir', allTx.length],
    ['Total Order OTS', allOts.length],
    ['Total Booking DP', allBookings.length],
  ]

  summaryData.forEach((row, i) => {
    const r = wsSummary.addRow(row)
    if (i === 0) {
      styleHeader(r, NAVY)
      wsSummary.mergeCells(`A${r.number}:B${r.number}`)
    } else {
      styleDataRow(r, i % 2 === 0)
      if (typeof row[1] === 'number' && i <= 4) {
        wsSummary.getCell(`B${r.number}`).value = row[1] as number
        wsSummary.getCell(`B${r.number}`).numFmt = '"Rp "#,##0'
        wsSummary.getCell(`B${r.number}`).font = {
          bold: true, size: 11,
          color: { argb: i === 2 ? 'FF' + EMERALD : i === 3 ? 'FF' + ROSE : 'FF' + NAVY }
        }
      }
    }
  })

  // ── SHEET 2: BULANAN ──
  const wsBulanan = wb.addWorksheet('Bulanan', { tabColor: { argb: 'FF059669' } })
  wsBulanan.columns = [
    { header: 'BULAN', key: 'bulan', width: 16 },
    { header: 'JUMLAH ORDER', key: 'order', width: 16 },
    { header: 'OMZET', key: 'omzet', width: 20 },
    { header: 'PENGELUARAN', key: 'pengeluaran', width: 20 },
    { header: 'LABA', key: 'laba', width: 20 },
  ]
  styleHeader(wsBulanan.getRow(1))

  monthlyData.forEach((m, i) => {
    const r = wsBulanan.addRow({ bulan: m.name, order: m.order, omzet: m.omzet, pengeluaran: m.pengeluaran, laba: m.laba })
    styleDataRow(r, i % 2 === 0)
    wsBulanan.getCell(`C${r.number}`).numFmt = '"Rp "#,##0'
    wsBulanan.getCell(`D${r.number}`).numFmt = '"Rp "#,##0'
    const labaCell = wsBulanan.getCell(`E${r.number}`)
    labaCell.numFmt = '"Rp "#,##0'
    labaCell.font = { bold: true, color: { argb: m.laba >= 0 ? 'FF' + EMERALD : 'FF' + ROSE }, size: 10 }
  })

  const totalRow = wsBulanan.addRow({ bulan: 'TOTAL', order: totalOrder, omzet: totalOmzet, pengeluaran: totalPengeluaran, laba: totalLaba })
  styleTotalRow(totalRow)
  wsBulanan.getCell(`C${totalRow.number}`).numFmt = '"Rp "#,##0'
  wsBulanan.getCell(`D${totalRow.number}`).numFmt = '"Rp "#,##0'
  wsBulanan.getCell(`E${totalRow.number}`).numFmt = '"Rp "#,##0'

  // ── SHEET 3: HARIAN ──
  const wsHarian = wb.addWorksheet('Harian', { tabColor: { argb: 'FF0891B2' } })
  wsHarian.columns = [
    { header: 'TANGGAL', key: 'tanggal', width: 16 },
    { header: 'OMZET', key: 'omzet', width: 20 },
    { header: 'JUMLAH ORDER', key: 'order', width: 16 },
  ]
  styleHeader(wsHarian.getRow(1))

  let harianIdx = 0
  Object.entries(dailyMap).sort().forEach(([key, val]) => {
    const [y, m, d] = key.split('-')
    const label = `${d}/${m}/${y}`
    const r = wsHarian.addRow({ tanggal: label, omzet: val.omzet, order: val.order })
    styleDataRow(r, harianIdx % 2 === 0)
    wsHarian.getCell(`B${r.number}`).numFmt = '"Rp "#,##0'
    if (val.omzet === 0) wsHarian.getCell(`B${r.number}`).font = { color: { argb: 'FFD1D5DB' }, size: 10 }
    harianIdx++
  })

  const harianTotal = wsHarian.addRow({ tanggal: 'TOTAL', omzet: totalOmzet, order: totalOrder })
  styleTotalRow(harianTotal)
  wsHarian.getCell(`B${harianTotal.number}`).numFmt = '"Rp "#,##0'

  // ── SHEET PER BULAN ──
  const tabColors = ['FF3B82F6','FF10B981','FF8B5CF6','FFF59E0B','FFEF4444','FF06B6D4','FF84CC16','FFF97316','FFEC4899','FF6366F1','FF14B8A6','FFF43F5E']

  monthlyData.forEach((m, mi) => {
    const ws = wb.addWorksheet(m.name, { tabColor: { argb: tabColors[mi % tabColors.length] } })
    ws.columns = [
      { header: 'NO', key: 'no', width: 6 },
      { header: 'TIPE', key: 'tipe', width: 10 },
      { header: 'NO INVOICE', key: 'invoice', width: 18 },
      { header: 'TANGGAL', key: 'tanggal', width: 14 },
      { header: 'CUSTOMER', key: 'customer', width: 22 },
      { header: 'WHATSAPP', key: 'wa', width: 16 },
      { header: 'KETERANGAN', key: 'ket', width: 30 },
      { header: 'FOTOGRAFER', key: 'foto', width: 14 },
      { header: 'METODE', key: 'metode', width: 12 },
      { header: 'TOTAL', key: 'total', width: 18 },
    ]
    styleHeader(ws.getRow(1), tabColors[mi % tabColors.length].slice(2))

    let rowIdx = 0
    let mTotal = 0

    // Transaksi kasir
    m.txM.forEach((tx: any) => {
      const r = ws.addRow({
        no: rowIdx + 1,
        tipe: 'Kasir',
        invoice: tx.invoiceNumber,
        tanggal: new Date(tx.transactionDate).toLocaleDateString('id-ID'),
        customer: tx.customer?.name || '',
        wa: tx.customer?.whatsapp || '',
        ket: tx.items.map((i: any) => i.package?.name).join(', '),
        foto: tx.fotografer?.name || '',
        metode: tx.metodePembayaran?.nama || '',
        total: tx.diterimaSaatIni || tx.grandTotal || 0,
      })
      styleDataRow(r, rowIdx % 2 === 0)
      ws.getCell(`J${r.number}`).numFmt = '"Rp "#,##0'
      ws.getCell(`J${r.number}`).font = { bold: true, color: { argb: 'FF' + NAVY }, size: 10 }
      mTotal += tx.diterimaSaatIni || tx.grandTotal || 0
      rowIdx++
    })

    // OTS
    m.otsM.forEach((o: any) => {
      const r = ws.addRow({
        no: rowIdx + 1,
        tipe: 'OTS',
        invoice: o.orderNumber,
        tanggal: new Date(o.orderDate).toLocaleDateString('id-ID'),
        customer: o.namaCustomer,
        wa: o.whatsapp || '',
        ket: o.items.map((i: any) => `${i.deskripsi} (${i.jumlah})`).join(', '),
        foto: '',
        metode: o.metodePembayaran?.nama || '',
        total: o.total || 0,
      })
      styleDataRow(r, rowIdx % 2 === 0)
      ws.getCell(`J${r.number}`).numFmt = '"Rp "#,##0'
      ws.getCell(`J${r.number}`).font = { bold: true, color: { argb: 'FF7C3AED' }, size: 10 }
      mTotal += o.total || 0
      rowIdx++
    })

    // Booking
    m.bookM.forEach((b: any) => {
      const r = ws.addRow({
        no: rowIdx + 1,
        tipe: 'Booking',
        invoice: b.bookingNumber,
        tanggal: new Date(b.createdAt).toLocaleDateString('id-ID'),
        customer: b.namaCustomer,
        wa: b.whatsapp || b.customer?.whatsapp || '',
        ket: `DP Booking - ${b.keperluan}`,
        foto: '',
        metode: '',
        total: b.dpAmount || 0,
      })
      styleDataRow(r, rowIdx % 2 === 0)
      ws.getCell(`J${r.number}`).numFmt = '"Rp "#,##0'
      ws.getCell(`J${r.number}`).font = { bold: true, color: { argb: 'FF' + AMBER }, size: 10 }
      mTotal += b.dpAmount || 0
      rowIdx++
    })

    if (rowIdx === 0) {
      const r = ws.addRow({ no: '', tipe: '', invoice: 'Tidak ada transaksi bulan ini', tanggal: '', customer: '', wa: '', ket: '', foto: '', metode: '', total: '' })
      r.getCell(3).font = { italic: true, color: { argb: 'FFD1D5DB' } }
    } else {
      const totalRow = ws.addRow({ no: '', tipe: '', invoice: '', tanggal: '', customer: '', wa: '', ket: '', foto: 'TOTAL', metode: '', total: mTotal })
      styleTotalRow(totalRow)
      ws.getCell(`J${totalRow.number}`).numFmt = '"Rp "#,##0'
    }
  })

  // Generate buffer
  const buf = await wb.xlsx.writeBuffer()
  const filename = `${studioName.replace(/\s+/g, '_')}_Laporan_${year}.xlsx`

  return new NextResponse(buf as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
