import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const NAVY = '0F2D5C'
const EMERALD = '059669'

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
  })
  row.height = 26
}

function styleRow(row: ExcelJS.Row, even: boolean) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFF9FAFB' : 'FFFFFFFF' } }
    cell.font = { size: 10 }
    cell.alignment = { vertical: 'middle' }
  })
  row.height = 20
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  // Pakai local timezone (ikut timezone server/Windows)
  const toLocalDate = (dateStr: string, endOfDay = false) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59)
    return new Date(y, m - 1, d, 0, 0, 0)
  }

  const dateFilter: any = {}
  if (from) dateFilter.gte = toLocalDate(from)
  if (to) dateFilter.lte = toLocalDate(to, true)
  const hasFilter = Object.keys(dateFilter).length > 0

  const [transactions, otsOrders, bookings, customers, expenses, settings, allTransactions, allOts, allBookings, allExpenses] = await Promise.all([
    prisma.transaction.findMany({
      where: hasFilter ? { transactionDate: dateFilter } : {},
      include: { customer: true, fotografer: true, metodePembayaran: true, promoCode: true, items: { include: { package: true } } },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.otsOrder.findMany({
      where: hasFilter ? { orderDate: dateFilter } : {},
      include: { metodePembayaran: true, items: true },
      orderBy: { orderDate: 'asc' },
    }),
    prisma.booking.findMany({
      where: hasFilter ? { createdAt: dateFilter } : {},
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.expense.findMany({
      where: hasFilter ? { date: dateFilter } : {},
      orderBy: { date: 'asc' },
    }),
    prisma.setting.findFirst(),
    // Semua data untuk sheet summary & tahunan (tanpa filter tanggal)
    prisma.transaction.findMany({
      include: { customer: true, fotografer: true, metodePembayaran: true, items: { include: { package: true } } },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.otsOrder.findMany({ orderBy: { orderDate: 'asc' } }),
    prisma.booking.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({ orderBy: { date: 'asc' } }),
  ])

  const studioName = settings?.studioName || 'StudioKasir'
  const wb = new ExcelJS.Workbook()
  wb.creator = studioName

  // â”€â”€ SHEET 1: TRANSAKSI KASIR â”€â”€
  const ws1 = wb.addWorksheet('Transaksi Kasir', { tabColor: { argb: 'FF' + NAVY } })
  ws1.columns = [
    { header: 'NO INVOICE', key: 'inv', width: 20 },
    { header: 'TANGGAL', key: 'tgl', width: 14 },
    { header: 'CUSTOMER', key: 'cust', width: 22 },
    { header: 'WHATSAPP', key: 'wa', width: 16 },
    { header: 'PAKET', key: 'paket', width: 30 },
    { header: 'FOTOGRAFER', key: 'foto', width: 16 },
    { header: 'METODE BAYAR', key: 'metode', width: 14 },
    { header: 'PROMO', key: 'promo', width: 10 },
    { header: 'SUBTOTAL', key: 'sub', width: 16 },
    { header: 'DISKON', key: 'disc', width: 14 },
    { header: 'DP SEBELUMNYA', key: 'dp', width: 18 },
    { header: 'DITERIMA', key: 'total', width: 16 },
    { header: 'STATUS', key: 'status', width: 10 },
    { header: 'CATATAN', key: 'notes', width: 20 },
  ]
  styleHeader(ws1.getRow(1))
  transactions.forEach((tx: any, i) => {
    const r = ws1.addRow({
      inv: tx.invoiceNumber,
      tgl: new Date(tx.transactionDate).toLocaleDateString('id-ID'),
      cust: tx.customer?.name || '',
      wa: tx.customer?.whatsapp || '',
      paket: tx.items.map((item: any) => item.package?.name).join(', '),
      foto: tx.fotografer?.name || '',
      metode: tx.metodePembayaran?.nama || '',
      promo: tx.promoCode?.code || '',
      sub: tx.subtotal,
      disc: tx.discount,
      dp: tx.dpAmount,
      total: tx.diterimaSaatIni || tx.grandTotal,
      status: tx.paymentStatus,
      notes: tx.notes || '',
    })
    styleRow(r, i % 2 === 0)
    ;['I','J','K','L'].forEach(col => {
      ws1.getCell(`${col}${r.number}`).numFmt = '"Rp "#,##0'
    })
  })

  // â”€â”€ SHEET 2: ORDER OTS â”€â”€
  const ws2 = wb.addWorksheet('Order OTS', { tabColor: { argb: 'FF7C3AED' } })
  ws2.columns = [
    { header: 'NO ORDER', key: 'no', width: 18 },
    { header: 'TANGGAL', key: 'tgl', width: 14 },
    { header: 'CUSTOMER', key: 'cust', width: 22 },
    { header: 'WHATSAPP', key: 'wa', width: 16 },
    { header: 'JENIS', key: 'jenis', width: 14 },
    { header: 'ITEMS', key: 'items', width: 30 },
    { header: 'METODE BAYAR', key: 'metode', width: 14 },
    { header: 'TOTAL', key: 'total', width: 16 },
    { header: 'CATATAN', key: 'notes', width: 20 },
  ]
  styleHeader(ws2.getRow(1))
  otsOrders.forEach((o: any, i) => {
    const r = ws2.addRow({
      no: o.orderNumber,
      tgl: new Date(o.orderDate).toLocaleDateString('id-ID'),
      cust: o.namaCustomer,
      wa: o.whatsapp || '',
      jenis: o.jenis || '',
      items: o.items.map((item: any) => `${item.deskripsi} (${item.jumlah}x${item.ukuran || ''})`).join(', '),
      metode: o.metodePembayaran?.nama || '',
      total: o.total,
      notes: o.notes || '',
    })
    styleRow(r, i % 2 === 0)
    ws2.getCell(`H${r.number}`).numFmt = '"Rp "#,##0'
  })

  // â”€â”€ SHEET 3: BOOKING â”€â”€
  const ws3 = wb.addWorksheet('Booking', { tabColor: { argb: 'FFD97706' } })
  ws3.columns = [
    { header: 'NO BOOKING', key: 'no', width: 18 },
    { header: 'TGL BOOKING', key: 'tgl', width: 14 },
    { header: 'CUSTOMER', key: 'cust', width: 22 },
    { header: 'WHATSAPP', key: 'wa', width: 16 },
    { header: 'KEPERLUAN', key: 'kep', width: 20 },
    { header: 'TGL SESI', key: 'sesi', width: 14 },
    { header: 'DITERIMA (DP)', key: 'dp', width: 18 },
    { header: 'STATUS', key: 'status', width: 12 },
    { header: 'CATATAN', key: 'notes', width: 20 },
  ]
  styleHeader(ws3.getRow(1))
  bookings.forEach((b: any, i) => {
    const r = ws3.addRow({
      no: b.bookingNumber,
      tgl: new Date(b.createdAt).toLocaleDateString('id-ID'),
      cust: b.namaCustomer,
      wa: b.whatsapp || b.customer?.whatsapp || '',
      kep: b.keperluan,
      sesi: b.tanggalSesi ? new Date(b.tanggalSesi).toLocaleDateString('id-ID') : '',
      dp: b.dpAmount,
      status: b.status,
      notes: b.catatan || '',
    })
    styleRow(r, i % 2 === 0)
    ws3.getCell(`G${r.number}`).numFmt = '"Rp "#,##0'
  })

  // â”€â”€ SHEET 4: CUSTOMER â”€â”€
  const ws4 = wb.addWorksheet('Customer', { tabColor: { argb: 'FF0891B2' } })
  ws4.columns = [
    { header: 'NAMA', key: 'nama', width: 24 },
    { header: 'WHATSAPP', key: 'wa', width: 16 },
    { header: 'EMAIL', key: 'email', width: 24 },
  ]
  styleHeader(ws4.getRow(1))
  customers.forEach((c: any, i) => {
    const r = ws4.addRow({ nama: c.name, wa: c.whatsapp || '', email: c.email || '' })
    styleRow(r, i % 2 === 0)
  })

  // â”€â”€ SHEET 5: PENGELUARAN â”€â”€
  const ws5 = wb.addWorksheet('Pengeluaran', { tabColor: { argb: 'FFE11D48' } })
  ws5.columns = [
    { header: 'TANGGAL', key: 'tgl', width: 14 },
    { header: 'JUDUL', key: 'judul', width: 24 },
    { header: 'KATEGORI', key: 'kat', width: 16 },
    { header: 'JUMLAH', key: 'jml', width: 16 },
    { header: 'CATATAN', key: 'notes', width: 24 },
  ]
  styleHeader(ws5.getRow(1))
  expenses.forEach((e: any, i) => {
    const r = ws5.addRow({
      tgl: new Date(e.date).toLocaleDateString('id-ID'),
      judul: e.title,
      kat: e.category,
      jml: e.amount,
      notes: e.description || '',
    })
    styleRow(r, i % 2 === 0)
    ws5.getCell(`D${r.number}`).numFmt = '"Rp "#,##0'
  })

  // ── HELPER ──
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

  // Kumpulkan semua tahun yang ada di data
  const allYears = Array.from(new Set([
    ...allTransactions.map((t: any) => new Date(t.transactionDate).getFullYear()),
    ...allOts.map((o: any) => new Date(o.orderDate).getFullYear()),
    ...allBookings.filter((b: any) => b.dpAmount > 0).map((b: any) => new Date(b.createdAt).getFullYear()),
    ...allExpenses.map((e: any) => new Date(e.date).getFullYear()),
  ])).sort() as number[]

  // Fungsi hitung omzet per tahun per bulan
  function getOmzetMatrix() {
    const matrix: Record<number, number[]> = {}
    for (const yr of allYears) {
      matrix[yr] = Array(12).fill(0)
      allTransactions.forEach((t: any) => {
        const d = new Date(t.transactionDate)
        if (d.getFullYear() === yr) matrix[yr][d.getMonth()] += t.diterimaSaatIni || t.grandTotal || 0
      })
      allOts.forEach((o: any) => {
        const d = new Date(o.orderDate)
        if (d.getFullYear() === yr) matrix[yr][d.getMonth()] += o.total || 0
      })
      allBookings.filter((b: any) => b.dpAmount > 0).forEach((b: any) => {
        const d = new Date(b.createdAt)
        if (d.getFullYear() === yr) matrix[yr][d.getMonth()] += b.dpAmount || 0
      })
    }
    return matrix
  }

  function getExpenseMatrix() {
    const matrix: Record<number, number[]> = {}
    for (const yr of allYears) {
      matrix[yr] = Array(12).fill(0)
      allExpenses.forEach((e: any) => {
        const d = new Date(e.date)
        if (d.getFullYear() === yr) matrix[yr][d.getMonth()] += e.amount || 0
      })
    }
    return matrix
  }

  const omzetMatrix = getOmzetMatrix()
  const expenseMatrix = getExpenseMatrix()

  // ── SHEET SUMMARY ──
  const wsSummary = wb.addWorksheet('Summary', { tabColor: { argb: 'FF059669' } })

  // Total keseluruhan
  const totalOmzetAll = allYears.reduce((s, yr) => s + omzetMatrix[yr].reduce((a, b) => a + b, 0), 0)
  const totalExpAll = allYears.reduce((s, yr) => s + expenseMatrix[yr].reduce((a, b) => a + b, 0), 0)
  const totalLabaAll = totalOmzetAll - totalExpAll

  const titleRow = wsSummary.addRow(['RINGKASAN KEUANGAN ' + studioName.toUpperCase()])
  titleRow.getCell(1).font = { bold: true, size: 14 }
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } }
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  wsSummary.mergeCells(`A1:${String.fromCharCode(65 + allYears.length + 1)}1`)
  titleRow.height = 32

  wsSummary.addRow([])

  // Kartu total
  const cardRow = wsSummary.addRow(['', 'TOTAL OMZET', 'TOTAL PENGELUARAN', 'TOTAL LABA'])
  styleHeader(cardRow)
  const valRow = wsSummary.addRow(['', totalOmzetAll, totalExpAll, totalLabaAll])
  valRow.height = 24
  ;['B','C','D'].forEach(col => {
    wsSummary.getCell(`${col}${valRow.number}`).numFmt = '"Rp "#,##0'
    wsSummary.getCell(`${col}${valRow.number}`).font = { bold: true, size: 11 }
  })
  wsSummary.getCell(`D${valRow.number}`).font = { bold: true, size: 11, color: { argb: 'FF' + EMERALD } }

  wsSummary.addRow([])
  wsSummary.addRow([])

  // Tabel YoY per metrik
  const metrics = [
    { label: 'OMZET PER BULAN (YoY)', matrix: omzetMatrix, color: NAVY },
    { label: 'PENGELUARAN PER BULAN (YoY)', matrix: expenseMatrix, color: 'E11D48' },
    { label: 'LABA PER BULAN (YoY)', matrix: null, color: EMERALD },
  ]

  for (const metric of metrics) {
    const headRow = wsSummary.addRow([metric.label, ...allYears.map(y => y.toString()), 'TOTAL'])
    headRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + metric.color } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    headRow.height = 24

    let colTotals = allYears.map(() => 0)
    MONTHS_ID.forEach((mon, mIdx) => {
      const rowData = [mon]
      let rowTotal = 0
      allYears.forEach((yr, yIdx) => {
        let val = 0
        if (metric.matrix) {
          val = metric.matrix[yr][mIdx]
        } else {
          // Laba = omzet - expense
          val = omzetMatrix[yr][mIdx] - expenseMatrix[yr][mIdx]
        }
        rowData.push(val as any)
        colTotals[yIdx] += val
        rowTotal += val
      })
      rowData.push(rowTotal as any)
      const r = wsSummary.addRow(rowData)
      r.height = 20
      for (let c = 2; c <= allYears.length + 2; c++) {
        const cell = r.getCell(c)
        cell.numFmt = '"Rp "#,##0'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mIdx % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' } }
      }
    })

    // Baris total bawah
    let grandTotal = 0
    allYears.forEach(yr => {
      if (metric.matrix) grandTotal += metric.matrix[yr].reduce((a, b) => a + b, 0)
      else grandTotal += omzetMatrix[yr].reduce((a, b) => a + b, 0) - expenseMatrix[yr].reduce((a, b) => a + b, 0)
    })
    const totalRowData = ['TOTAL', ...colTotals.map(v => v as any), grandTotal as any]
    const totalR = wsSummary.addRow(totalRowData)
    totalR.eachCell(cell => {
      cell.font = { bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      cell.numFmt = '"Rp "#,##0'
    })
    totalR.getCell(1).numFmt = '@'
    totalR.height = 22

    wsSummary.addRow([])
    wsSummary.addRow([])
  }

  // Set kolom width summary
  wsSummary.getColumn(1).width = 22
  for (let i = 2; i <= allYears.length + 2; i++) {
    wsSummary.getColumn(i).width = 18
  }

  // ── SHEET TAHUNAN (1 per tahun) ──
  const COLORS_YEAR = ['FF0F2D5C','FF7C3AED','FFD97706','FF059669','FFE11D48','FF0891B2']
  for (let yIdx = 0; yIdx < allYears.length; yIdx++) {
    const yr = allYears[yIdx]
    const wsY = wb.addWorksheet(yr.toString(), { tabColor: { argb: COLORS_YEAR[yIdx % COLORS_YEAR.length] } })
    wsY.getColumn(1).width = 14
    wsY.getColumn(2).width = 20
    wsY.getColumn(3).width = 22
    wsY.getColumn(4).width = 28
    wsY.getColumn(5).width = 16
    wsY.getColumn(6).width = 16
    wsY.getColumn(7).width = 16

    // Judul tahun
    const yrTitle = wsY.addRow([`DATA TRANSAKSI ${yr} — ${studioName.toUpperCase()}`])
    yrTitle.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
    yrTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS_YEAR[yIdx % COLORS_YEAR.length] } }
    wsY.mergeCells(`A1:G1`)
    yrTitle.height = 30
    wsY.addRow([])

    // Kumpulkan transaksi tahun ini
    const txYear = allTransactions.filter((t: any) => new Date(t.transactionDate).getFullYear() === yr)
    const otsYear = allOts.filter((o: any) => new Date(o.orderDate).getFullYear() === yr)
    const bookYear = allBookings.filter((b: any) => new Date(b.createdAt).getFullYear() === yr && b.dpAmount > 0)

    let grandTotalYear = 0

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      // Filter per bulan
      const txMonth = txYear.filter((t: any) => new Date(t.transactionDate).getMonth() === mIdx)
      const otsMonth = otsYear.filter((o: any) => new Date(o.orderDate).getMonth() === mIdx)
      const bookMonth = bookYear.filter((b: any) => new Date(b.createdAt).getMonth() === mIdx)

      if (txMonth.length === 0 && otsMonth.length === 0 && bookMonth.length === 0) continue

      // Header bulan
      const monHead = wsY.addRow([MONTHS_ID[mIdx].toUpperCase() + ' ' + yr])
      monHead.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      monHead.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS_YEAR[yIdx % COLORS_YEAR.length] } }
      wsY.mergeCells(`A${monHead.number}:G${monHead.number}`)
      monHead.height = 22

      // Header kolom
      const colHead = wsY.addRow(['TANGGAL','NO INVOICE','CUSTOMER','PAKET','FOTOGRAFER','METODE','TOTAL'])
      styleHeader(colHead)

      let monthTotal = 0
      let rowIdx = 0

      // Transaksi kasir
      txMonth.forEach((t: any) => {
        const r = wsY.addRow([
          new Date(t.transactionDate).toLocaleDateString('id-ID'),
          t.invoiceNumber,
          t.customer?.name || '',
          t.items.map((i: any) => i.package?.name).filter(Boolean).join(', '),
          t.fotografer?.name || '',
          t.metodePembayaran?.nama || '',
          t.diterimaSaatIni || t.grandTotal || 0,
        ])
        styleRow(r, rowIdx % 2 === 0)
        wsY.getCell(`G${r.number}`).numFmt = '"Rp "#,##0'
        monthTotal += t.diterimaSaatIni || t.grandTotal || 0
        rowIdx++
      })

      // OTS
      otsMonth.forEach((o: any) => {
        const r = wsY.addRow([
          new Date(o.orderDate).toLocaleDateString('id-ID'),
          o.orderNumber,
          o.namaCustomer || '',
          o.items.map((i: any) => i.deskripsi).filter(Boolean).join(', '),
          '',
          o.metodePembayaran?.nama || '',
          o.total || 0,
        ])
        styleRow(r, rowIdx % 2 === 0)
        wsY.getCell(`G${r.number}`).numFmt = '"Rp "#,##0'
        monthTotal += o.total || 0
        rowIdx++
      })

      // Booking DP
      bookMonth.forEach((b: any) => {
        const r = wsY.addRow([
          new Date(b.createdAt).toLocaleDateString('id-ID'),
          b.bookingNumber,
          b.customer?.name || b.namaCustomer || '',
          b.keperluan || 'Booking DP',
          '',
          '',
          b.dpAmount || 0,
        ])
        styleRow(r, rowIdx % 2 === 0)
        wsY.getCell(`G${r.number}`).numFmt = '"Rp "#,##0'
        monthTotal += b.dpAmount || 0
        rowIdx++
      })

      // Baris total bulan
      const totRow = wsY.addRow(['','','','','','TOTAL ' + MONTHS_SHORT[mIdx].toUpperCase(), monthTotal])
      totRow.eachCell(cell => {
        cell.font = { bold: true, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      })
      wsY.getCell(`G${totRow.number}`).numFmt = '"Rp "#,##0'
      totRow.height = 22
      grandTotalYear += monthTotal

      wsY.addRow([])
    }

    // Grand total tahun
    const grandRow = wsY.addRow(['','','','','','TOTAL ' + yr, grandTotalYear])
    grandRow.eachCell(cell => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS_YEAR[yIdx % COLORS_YEAR.length] } }
    })
    wsY.getCell(`G${grandRow.number}`).numFmt = '"Rp "#,##0'
    grandRow.height = 26
  }

  const buf = await wb.xlsx.writeBuffer()
  const now = new Date()
  const filename = `${studioName.replace(/\s+/g, '_')}_Data_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`

  return new NextResponse(buf as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
