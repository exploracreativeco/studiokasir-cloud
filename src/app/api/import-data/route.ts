import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'


// Generate INV-YYMMDD-NNNN berbasis tanggal transaksi (anti-duplikat: ambil sequence tertinggi hari itu)
async function genInvoice(date: Date): Promise<string> {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const prefix = `INV-${yy}${mm}${dd}-`
  const last = await prisma.transaction.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const seq = last ? (parseInt(last.invoiceNumber.replace(prefix, '')) || 0) : 0
  return `${prefix}${String(seq + 1).padStart(4, '0')}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN')
    return NextResponse.json({ error: 'Hanya Superadmin yang dapat mengakses fitur ini' }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const preview = formData.get('preview') === 'true'
    const branchId = (formData.get('branchId') as string)?.trim() || null  // import ke cabang tertentu

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)

    const results = { imported: 0, skipped: 0, errors: [] as string[], failedRows: [] as any[], preview: [] as any[] }

    // STEP 1: Import Customer dulu (diperlukan oleh Transaksi & Booking)
    const wsCust = wb.getWorksheet('Customer')
    if (wsCust && !preview) {
      const custRows: any[] = []
      wsCust.eachRow((row, idx) => {
        if (idx === 1) return
        const nama = row.getCell(1).value?.toString()?.trim()
        if (!nama) return
        custRows.push({ nama, wa: row.getCell(2).value?.toString()?.trim() || null, email: row.getCell(3).value?.toString()?.trim() || null })
      })
      for (const row of custRows) {
        try {
          const existing = await prisma.customer.findFirst({ where: { name: { equals: row.nama, mode: 'insensitive' } } })
          if (existing) { results.skipped++; continue }
          await prisma.customer.create({ data: { name: row.nama, whatsapp: row.wa || null, email: row.email || null } })
          results.imported++
        } catch (e: any) { results.errors.push(`Customer ${row.nama}: ${e.message?.substring(0,100)}`) }
      }
    }

    // ── IMPORT TRANSAKSI KASIR ──
    const wsTx = wb.getWorksheet('Transaksi Kasir')
    if (wsTx) {
      const rows: any[] = []
      wsTx.eachRow((row, idx) => {
        if (idx === 1) return // skip header
        const inv = row.getCell(1).value?.toString()?.trim()
        // Baris tetap diproses walau tak ada invoice — nanti di-generate.
        // Tapi kalau SEMUA kolom kosong, lewati (baris kosong).
        const custCheck = row.getCell(3).value?.toString()?.trim()
        if (!inv && !custCheck) return
        rows.push({
          invoice: inv || '',
          tanggal: row.getCell(2).value?.toString()?.trim(),
          customer: row.getCell(3).value?.toString()?.trim(),
          wa: row.getCell(4).value?.toString()?.trim(),
          paket: row.getCell(5).value?.toString()?.trim(),
          fotografer: row.getCell(6).value?.toString()?.trim(),
          metode: row.getCell(7).value?.toString()?.trim(),
          promo: row.getCell(8).value?.toString()?.trim(),
          subtotal: Number(row.getCell(9).value) || 0,
          diskon: Number(row.getCell(10).value) || 0,
          dp: Number(row.getCell(11).value) || 0,
          total: Number(row.getCell(12).value) || 0,
          status: row.getCell(13).value?.toString()?.trim() || 'LUNAS',
          notes: row.getCell(14).value?.toString()?.trim() || '',
        })
      })

      if (preview) {
        results.preview = rows.slice(0, 5)
        return NextResponse.json({ ok: true, ...results, totalRows: rows.length })
      }

      for (const row of rows) {
        try {
          // Cek duplikat invoice (hanya kalau invoice diisi di file)
          if (row.invoice) {
            const existing = await prisma.transaction.findFirst({ where: { invoiceNumber: row.invoice } })
            if (existing) { results.skipped++; continue }
          }

          // Cari atau buat customer
          let customer = await prisma.customer.findFirst({ where: { name: { equals: row.customer, mode: 'insensitive' } } })
          if (!customer && row.customer) {
            customer = await prisma.customer.create({ data: { name: row.customer, whatsapp: row.wa || null } })
          }
          if (!customer) { results.errors.push(`Row ${row.invoice}: customer tidak valid`); continue }

          // Parse tanggal
          let txDate = new Date()
          if (row.tanggal) {
            const parts = row.tanggal.split('/')
            if (parts.length === 3) txDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
          }

          // Generate invoice kalau kosong (berbasis tanggal transaksi)
          const invoiceNumber = row.invoice || await genInvoice(txDate)

          // Cari metode pembayaran
          let metode = null
          if (row.metode) {
            metode = await prisma.metodePembayaran.findFirst({ where: { nama: { equals: row.metode } } })
          }

          // Cari fotografer
          let fotografer = null
          if (row.fotografer) {
            fotografer = await prisma.fotografer.findFirst({ where: { name: { equals: row.fotografer } } })
          }

          await prisma.transaction.create({
            data: {
              invoiceNumber: invoiceNumber,
              customerId: customer.id,
              userId: session.user.id,
              branchId: branchId,
              metodePembayaranId: metode?.id || null,
              fotograferId: fotografer?.id || null,
              subtotal: row.subtotal || 0,
              discount: row.diskon || 0,
              grandTotal: Math.max(0, (row.subtotal || 0) - (row.diskon || 0)),
              dpAmount: row.dp || 0,
              diterimaSaatIni: row.total,  // col12 = DITERIMA = sudah dikurangi DP
              paymentStatus: (row.status === 'DP' ? 'DP' : 'LUNAS') as any,
              notes: row.notes || null,
              transactionDate: txDate,
              syncStatus: 'PENDING',
            },
          })
          results.imported++
        } catch (e: any) {
          const errMsg = e.message?.substring(0, 200) || 'Unknown error'
          results.errors.push(`${row.invoice || row.customer || 'baris'}: ${errMsg}`)
          results.failedRows.push({ type: 'transaksi', invoice: row.invoice || '(auto)', customer: row.customer, total: row.total, error: errMsg })
        }
      }
    }

    // ── IMPORT PENGELUARAN ──
    const wsExp = wb.getWorksheet('Pengeluaran')
    if (wsExp && !preview) {
      // Kumpulkan baris dulu (eachRow tidak menunggu async) lalu simpan dengan await
      const expRows: any[] = []
      wsExp.eachRow((row, idx) => {
        if (idx === 1) return
        const judul = row.getCell(2).value?.toString()?.trim()
        if (!judul) return
        const tgl = row.getCell(1).value?.toString()?.trim()
        let expDate = new Date()
        if (tgl) {
          const parts = tgl.split('/')
          if (parts.length === 3) expDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        }
        expRows.push({
          title: judul,
          amount: Number(row.getCell(4).value) || 0,
          category: row.getCell(3).value?.toString() || 'LAINNYA',
          date: expDate,
        })
      })
      for (const e of expRows) {
        try {
          await prisma.expense.create({
            data: { title: e.title, amount: e.amount, category: e.category as any, date: e.date, branchId: branchId },
          })
          results.imported++
        } catch (err: any) {
          results.errors.push(`Pengeluaran ${e.title}: ${err.message?.substring(0, 100)}`)
        }
      }
    }

    // ── IMPORT BOOKING ──
    const wsBook = wb.getWorksheet('Booking')
    if (wsBook && !preview) {
      const bookRows: any[] = []
      wsBook.eachRow((row, idx) => {
        if (idx === 1) return // skip header
        const noBooking = row.getCell(1).value?.toString()?.trim()
        if (!noBooking) return
        bookRows.push({
          noBooking,
          tglBooking: row.getCell(2).value?.toString()?.trim(),
          customer: row.getCell(3).value?.toString()?.trim(),
          wa: row.getCell(4).value?.toString()?.trim() || null,
          keperluan: row.getCell(5).value?.toString()?.trim() || null,
          tglSesi: row.getCell(6).value?.toString()?.trim(),
          dp: Number(row.getCell(7).value) || 0,
          status: row.getCell(8).value?.toString()?.trim() || 'DIBAYAR',
          catatan: row.getCell(9).value?.toString()?.trim() || null,
        })
      })

      // Helper parse tanggal DD/MM/YYYY
      const parseDate = (str: string | undefined): Date => {
        if (!str) return new Date()
        const parts = str.split('/')
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        }
        return new Date()
      }

      for (const row of bookRows) {
        try {
          // Cek duplikat booking number
          const existing = await prisma.booking.findFirst({
            where: { bookingNumber: row.noBooking },
          })
          if (existing) { results.skipped++; continue }

          // Cari atau buat customer
          let customer = await prisma.customer.findFirst({
            where: { name: { equals: row.customer, mode: 'insensitive' } },
          })
          if (!customer && row.customer) {
            customer = await prisma.customer.create({
              data: {
                name: row.customer,
                whatsapp: row.wa || null,
              },
            })
          }
          if (!customer) {
            results.errors.push(`Booking ${row.noBooking}: customer tidak valid`)
            continue
          }

          await prisma.booking.create({
            data: {
              bookingNumber: row.noBooking,
              customerId: customer.id,
              namaCustomer: row.customer || '',
              whatsapp: row.wa || null,
              userId: session.user.id,
              branchId: branchId,
              keperluan: row.keperluan || '',
              dpAmount: row.dp,
              status: row.status as any,
              catatan: row.catatan || null,
              tanggalSesi: row.tglSesi ? parseDate(row.tglSesi) : null,
              syncStatus: 'PENDING',
            },
          })
          results.imported++
        } catch (e: any) {
          const errMsg = e.message?.substring(0, 200) || 'Unknown error'
          results.errors.push(`Booking ${row.noBooking}: ${errMsg}`)
          results.failedRows.push({ type: 'booking', noBooking: row.noBooking, customer: row.customer, dp: row.dp, error: errMsg })
        }
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
