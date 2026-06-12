import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

// Helper: upload file ke Google Drive via Service Account
async function uploadToGDrive(folderId: string, fileName: string, fileBuffer: Buffer, existingFileId?: string | null) {
  const keyPath = path.join(process.cwd(), 'gdrive-key.json')
  if (!fs.existsSync(keyPath)) {
    throw new Error('File gdrive-key.json tidak ditemukan di folder StudioKasir')
  }

  const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'))

  // Buat JWT untuk Service Account
  const { SignJWT } = await import('jose')
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(key.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''), 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const now = Math.floor(Date.now() / 1000)
  const jwtToken = await new SignJWT({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }).setProtectedHeader({ alg: 'RS256' }).sign(privateKey)

  // Tukar JWT dengan access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Gagal mendapat access token GDrive')

  const accessToken = tokenData.access_token

  // Upload atau update file
  const metadata = JSON.stringify({
    name: fileName,
    ...(existingFileId ? {} : { parents: [folderId] }),
  })

  const boundary = 'boundary_studiokasir'
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

  const method = existingFileId ? 'PATCH' : 'POST'

  const uploadRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  })

  const uploadData = await uploadRes.json()
  if (!uploadData.id) throw new Error('Upload gagal: ' + JSON.stringify(uploadData))
  return uploadData.id as string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const setting = await prisma.setting.findFirst()
    if (!setting?.gdriveFolderId) {
      return NextResponse.json({ error: 'Folder ID GDrive belum diset di Settings' }, { status: 400 })
    }

    // Generate Excel export
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
    wb.creator = setting.studioName || 'StudioKasir'

    // Sheet Transaksi
    const ws1 = wb.addWorksheet('Transaksi Kasir')
    ws1.columns = [
      { header: 'NO INVOICE', key: 'inv', width: 20 },
      { header: 'TANGGAL', key: 'tgl', width: 14 },
      { header: 'CUSTOMER', key: 'cust', width: 22 },
      { header: 'PAKET', key: 'paket', width: 30 },
      { header: 'FOTOGRAFER', key: 'foto', width: 16 },
      { header: 'METODE', key: 'metode', width: 14 },
      { header: 'TOTAL', key: 'total', width: 16 },
      { header: 'STATUS', key: 'status', width: 10 },
    ]
    transactions.forEach((tx: any) => {
      ws1.addRow({
        inv: tx.invoiceNumber,
        tgl: new Date(tx.transactionDate).toLocaleDateString('id-ID'),
        cust: tx.customer?.name || '',
        paket: tx.items.map((i: any) => i.package?.name).join(', '),
        foto: tx.fotografer?.name || '',
        metode: tx.metodePembayaran?.nama || '',
        total: tx.diterimaSaatIni || tx.grandTotal,
        status: tx.paymentStatus,
      })
    })

    // Sheet Booking
    const ws2 = wb.addWorksheet('Booking')
    ws2.columns = [
      { header: 'NO BOOKING', key: 'no', width: 18 },
      { header: 'TANGGAL', key: 'tgl', width: 14 },
      { header: 'CUSTOMER', key: 'cust', width: 22 },
      { header: 'KEPERLUAN', key: 'kep', width: 20 },
      { header: 'DP', key: 'dp', width: 16 },
      { header: 'STATUS', key: 'status', width: 12 },
    ]
    bookings.forEach((b: any) => {
      ws2.addRow({
        no: b.bookingNumber,
        tgl: new Date(b.createdAt).toLocaleDateString('id-ID'),
        cust: b.customer?.name || '',
        kep: b.keperluan || '',
        dp: b.dpAmount,
        status: b.status,
      })
    })

    const buf = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer)
    const now = new Date()
    const fileName = `${setting.studioName || 'StudioKasir'}_Backup_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`

    // Upload ke GDrive
    const fileId = await uploadToGDrive(
      setting.gdriveFolderId,
      fileName,
      buf,
      setting.gdriveFileId || null
    )

    // Simpan fileId dan waktu sync
    await prisma.setting.update({
      where: { id: setting.id },
      data: { gdriveFileId: fileId, gdriveLastSync: new Date() },
    })

    return NextResponse.json({ ok: true, fileId, fileName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
