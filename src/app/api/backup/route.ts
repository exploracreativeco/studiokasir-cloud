import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import ExcelJS from 'exceljs'
import nodemailer from 'nodemailer'

async function generateExcelBackup(settings: any): Promise<Buffer> {
  const [transactions, otsOrders, bookings, customers, expenses] = await Promise.all([
    prisma.transaction.findMany({
      include: { customer: true, fotografer: true, metodePembayaran: true, items: { include: { package: true } } },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.otsOrder.findMany({ include: { metodePembayaran: true, items: true }, orderBy: { orderDate: 'asc' } }),
    prisma.booking.findMany({ include: { customer: true }, orderBy: { createdAt: 'asc' } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.expense.findMany({ orderBy: { date: 'asc' } }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = settings?.studioName || 'StudioKasir'

  const addSheet = (name: string, cols: any[], rows: any[]) => {
    const ws = wb.addWorksheet(name)
    ws.columns = cols
    const hRow = ws.getRow(1)
    hRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2D5C' } }
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    })
    hRow.height = 24
    rows.forEach((row, i) => {
      const r = ws.addRow(row)
      r.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' } }
        c.font = { size: 10 }
      })
      r.height = 20
    })
  }

  addSheet('Transaksi Kasir',
    [{ header: 'NO INVOICE', key: 'inv', width: 20 }, { header: 'TANGGAL', key: 'tgl', width: 14 }, { header: 'CUSTOMER', key: 'cust', width: 22 }, { header: 'PAKET', key: 'paket', width: 30 }, { header: 'FOTOGRAFER', key: 'foto', width: 16 }, { header: 'METODE', key: 'metode', width: 14 }, { header: 'TOTAL', key: 'total', width: 16 }, { header: 'STATUS', key: 'status', width: 10 }],
    transactions.map((tx: any) => ({ inv: tx.invoiceNumber, tgl: new Date(tx.transactionDate).toLocaleDateString('id-ID'), cust: tx.customer?.name || '', paket: tx.items.map((i: any) => i.package?.name).join(', '), foto: tx.fotografer?.name || '', metode: tx.metodePembayaran?.nama || '', total: tx.diterimaSaatIni || tx.grandTotal, status: tx.paymentStatus }))
  )

  addSheet('Order OTS',
    [{ header: 'NO ORDER', key: 'no', width: 18 }, { header: 'TANGGAL', key: 'tgl', width: 14 }, { header: 'CUSTOMER', key: 'cust', width: 22 }, { header: 'ITEMS', key: 'items', width: 30 }, { header: 'TOTAL', key: 'total', width: 16 }],
    otsOrders.map((o: any) => ({ no: o.orderNumber, tgl: new Date(o.orderDate).toLocaleDateString('id-ID'), cust: o.namaCustomer, items: o.items.map((i: any) => i.deskripsi).join(', '), total: o.total }))
  )

  addSheet('Booking',
    [{ header: 'NO BOOKING', key: 'no', width: 18 }, { header: 'TANGGAL', key: 'tgl', width: 14 }, { header: 'CUSTOMER', key: 'cust', width: 22 }, { header: 'KEPERLUAN', key: 'kep', width: 20 }, { header: 'DP', key: 'dp', width: 14 }, { header: 'STATUS', key: 'status', width: 12 }],
    bookings.map((b: any) => ({ no: b.bookingNumber, tgl: new Date(b.createdAt).toLocaleDateString('id-ID'), cust: b.namaCustomer, kep: b.keperluan, dp: b.dpAmount, status: b.status }))
  )

  addSheet('Customer',
    [{ header: 'NAMA', key: 'nama', width: 24 }, { header: 'WHATSAPP', key: 'wa', width: 16 }, { header: 'EMAIL', key: 'email', width: 24 }],
    customers.map((c: any) => ({ nama: c.name, wa: c.whatsapp || '', email: c.email || '' }))
  )

  addSheet('Pengeluaran',
    [{ header: 'TANGGAL', key: 'tgl', width: 14 }, { header: 'JUDUL', key: 'judul', width: 24 }, { header: 'KATEGORI', key: 'kat', width: 16 }, { header: 'JUMLAH', key: 'jml', width: 16 }],
    expenses.map((e: any) => ({ tgl: new Date(e.date).toLocaleDateString('id-ID'), judul: e.title, kat: e.category, jml: e.amount }))
  )

  return wb.xlsx.writeBuffer() as Promise<Buffer>
}

export async function POST(req: NextRequest) {
  // Support cron internal call
  const cronSecret = req.headers.get('x-cron-secret')
  const isCron = cronSecret === (process.env.CRON_SECRET || 'studiokasir-cron')

  if (!isCron) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const settings = await prisma.setting.findFirst()

  if (!settings?.emailUser || !settings?.emailPass) {
    return NextResponse.json({ error: 'Konfigurasi email belum diisi di Settings → Email' }, { status: 400 })
  }

  try {
    // SQLite backup
    const dbPath = join(process.cwd(), 'prisma', 'studiokasir.db')
    const dbBuffer = await readFile(dbPath)
    const dbSize = (dbBuffer.length / 1024).toFixed(1)

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    const filename = `backup_studiokasir_${dateStr}_${timeStr}.db`

    // ── Backup ke folder lokal C:\StudioKasir\backups\ ──
    const backupLocalFolder = settings?.backupLocalFolder !== 'false'
    if (backupLocalFolder) {
      const backupDir = join(process.cwd(), 'backups')
      await mkdir(backupDir, { recursive: true })
      await writeFile(join(backupDir, filename), dbBuffer)

      // Simpan Excel juga ke folder lokal
      if (settings?.backupIncludeExcel !== 'false') {
        const excelFilename = `backup_excel_${dateStr}_${timeStr}.xlsx`
        const excelBuf = await generateExcelBackup(settings)
        await writeFile(join(backupDir, excelFilename), excelBuf)
      }
    }

    // Send via email
    const transporter = nodemailer.createTransport({
      host: settings.emailHost || 'smtp.gmail.com',
      port: settings.emailPort || 587,
      secure: false,
      auth: { user: settings.emailUser, pass: settings.emailPass },
    })

    const backupEmail = settings.backupEmail || settings.emailUser

    await transporter.sendMail({
      from: `"${settings.studioName} Backup" <${settings.emailUser}>`,
      to: backupEmail,
      subject: `🗄️ Backup Database ${settings.studioName} — ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">🗄️ Backup Database Berhasil</h2>
          <p style="color: #6b7280; margin: 0 0 16px; font-size: 13px;">Backup otomatis dari <strong>${settings.studioName}</strong></p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Tanggal</span>
              <span style="font-weight: 600;">${now.toLocaleString('id-ID')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #6b7280;">Database</span>
              <span style="font-weight: 600;">studiokasir.db (SQLite)</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #6b7280;">Ukuran File</span>
              <span style="font-weight: 600;">${dbSize} KB</span>
            </div>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">File backup terlampir sebagai <strong>${filename}</strong>. Untuk restore, cukup copy file ini ke folder aplikasi dengan nama <strong>studiokasir.db</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-size: 11px; color: #d1d5db; margin: 0; text-align: center;">StudioKasir · App By Explora Creative</p>
        </div>
      `,
      attachments: await (async () => {
        const attachments: any[] = [{
          filename,
          content: dbBuffer,
          contentType: 'application/octet-stream',
        }]
        if (settings?.backupIncludeExcel !== 'false') {
          const excelBuf = await generateExcelBackup(settings)
          const excelFilename = `data_excel_${dateStr}_${timeStr}.xlsx`
          attachments.push({
            filename: excelFilename,
            content: excelBuf,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        }
        return attachments
      })(),
    })

    await prisma.setting.update({
      where: { id: settings.id },
      data: { lastBackupAt: now } as any,
    })

    return NextResponse.json({ ok: true, filename, size: `${dbSize} KB`, sentTo: backupEmail })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
