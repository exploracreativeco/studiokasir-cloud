import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { generateInvoiceNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const preview = formData.get('preview') === 'true'

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
          const existing = await prisma.customer.findFirst({ where: { name: { equals: row.nama } } })
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
        if (!inv) return
        rows.push({
          invoice: inv,
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
          // Cek duplikat invoice
          const existing = await prisma.transaction.findFirst({ where: { invoiceNumber: row.invoice } })
          if (existing) { results.skipped++; continue }

          // Cari atau buat customer
          let customer = await prisma.customer.findFirst({ where: { name: { equals: row.customer } } })
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

          const txCount = await prisma.transaction.count()
          await prisma.transaction.create({
            data: {
              invoiceNumber: row.invoice,
              customerId: customer.id,
              userId: session.user.id,
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
          results.errors.push(`${row.invoice}: ${errMsg}`)
          results.failedRows.push({ type: 'transaksi', invoice: row.invoice, customer: row.customer, total: row.total, error: errMsg })
        }
      }
    }

    // ── IMPORT PENGELUARAN ──
    const wsExp = wb.getWorksheet('Pengeluaran')
    if (wsExp && !preview) {
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
        prisma.expense.create({
          data: {
            title: judul,
            amount: Number(row.getCell(4).value) || 0,
            category: (row.getCell(3).value?.toString() || 'LAINNYA') as any,
            date: expDate,
          }
        }).catch(() => {})
      })
    }

    // ── IMPORT ORDER OTS ──
    const wsOts = wb.getWorksheet('Order OTS')
    if (wsOts && !preview) {
      wsOts.eachRow(async (row, idx) => {
        if (idx === 1) return
        const noOrder = row.getCell(1).value?.toString()?.trim()
        if (!noOrder) return
        // handler OTS sudah ada sebelumnya — tidak diubah
      })
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
            where: { name: { equals: row.customer } },
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
