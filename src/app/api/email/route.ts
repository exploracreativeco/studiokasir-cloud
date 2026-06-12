import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRupiah, formatDate } from '@/lib/utils'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactionId, toEmail, pdfBase64, pdfFilename } = await req.json()
  if (!transactionId || !toEmail) return NextResponse.json({ error: 'transactionId and toEmail required' }, { status: 400 })

  const [tx, settings] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        fotografer: true,
        metodePembayaran: true,
        promoCode: true,
        items: { include: { package: true, addons: { include: { addon: true } } } },
      },
    }),
    prisma.setting.findFirst(),
  ])

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (!settings?.emailUser || !settings?.emailPass) {
    return NextResponse.json({ error: 'Email belum dikonfigurasi di pengaturan' }, { status: 400 })
  }

  // Build email body from template
  const template = settings.emailTemplate || 'Halo {nama_customer},\n\nTerlampir invoice {no_invoice} dari {nama_studio}.\n\nTotal: {total}\nStatus: {status}\nTanggal: {tanggal}\n\nTerima kasih!'
  const subject = (settings.emailSubject || 'Invoice {no_invoice} - {nama_studio}')
    .replace('{no_invoice}', tx.invoiceNumber)
    .replace('{nama_studio}', settings.studioName)

  const body = template
    .replace('{nama_customer}', tx.customer.name)
    .replace('{no_invoice}', tx.invoiceNumber)
    .replace('{nama_studio}', settings.studioName)
    .replace('{total}', formatRupiah(tx.grandTotal))
    .replace('{status}', tx.paymentStatus)
    .replace('{tanggal}', formatDate(tx.transactionDate))
    .replace('{sisa}', formatRupiah(tx.remainingPayment))
    .replace('{dp}', formatRupiah(tx.dpAmount))

  // Build HTML invoice
  const allAddons = tx.items.flatMap(item => item.addons.map(a => a.addon))
  const htmlInvoice = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0; font-size: 20px;">${settings.studioName}</h2>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">${settings.address || ''}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Invoice</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #2563eb;">${tx.invoiceNumber}</p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">${formatDate(tx.transactionDate)}</p>
        </div>
      </div>
      <hr style="border: none; border-top: 2px solid #111; margin: 16px 0;" />
      <table style="width: 100%; margin-bottom: 16px; font-size: 13px;">
        <tr><td style="color: #6b7280; padding: 3px 0;">Customer</td><td style="font-weight: bold;">${tx.customer.name}</td></tr>
        <tr><td style="color: #6b7280; padding: 3px 0;">Kasir</td><td>${tx.user.name}</td></tr>
        ${tx.fotografer ? `<tr><td style="color: #6b7280; padding: 3px 0;">Fotografer</td><td>${tx.fotografer.name}</td></tr>` : ''}
        <tr><td style="color: #6b7280; padding: 3px 0;">Metode</td><td>${tx.metodePembayaran?.nama || '-'}</td></tr>
        <tr><td style="color: #6b7280; padding: 3px 0;">Status</td><td><span style="background:${tx.paymentStatus === 'LUNAS' ? '#d1fae5' : '#fef3c7'}; color:${tx.paymentStatus === 'LUNAS' ? '#065f46' : '#92400e'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${tx.paymentStatus}</span></td></tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead><tr style="background: #f9fafb;">
          <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb;">Item</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb;">Harga</th>
        </tr></thead>
        <tbody>
          ${tx.items.map(item => `<tr><td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${item.package.name}</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right; font-size: 13px;">${formatRupiah(item.price)}</td></tr>`).join('')}
          ${allAddons.map(addon => `<tr><td style="padding: 6px 12px 6px 24px; border: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">↳ ${addon.name}</td><td style="padding: 6px 12px; border: 1px solid #e5e7eb; text-align: right; font-size: 12px; color: #6b7280;">${formatRupiah(addon.price)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-left: auto; width: 220px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0;"><span style="color: #6b7280;">Subtotal</span><span>${formatRupiah(tx.subtotal)}</span></div>
        ${tx.discount > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0;"><span style="color: #059669;">Diskon</span><span style="color: #059669;">- ${formatRupiah(tx.discount)}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 8px 0; border-top: 2px solid #111; margin-top: 4px;"><span>Total</span><span style="color: #2563eb;">${formatRupiah(tx.grandTotal)}</span></div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0;"><span style="color: #6b7280;">DP</span><span>${formatRupiah(tx.dpAmount)}</span></div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0;"><span style="color: #6b7280;">Sisa</span><span style="font-weight: bold; color: ${tx.remainingPayment > 0 ? '#2563eb' : '#059669'};">${formatRupiah(tx.remainingPayment)}</span></div>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0;">${settings.invoiceFooter || 'Terima kasih!'}</p>
      <p style="text-align: center; font-size: 11px; color: #d1d5db; margin: 4px 0 0;">StudioKasir · App By Explora Creative</p>
    </div>
  `

  try {
    const transporter = nodemailer.createTransport({
      host: settings.emailHost || 'smtp.gmail.com',
      port: settings.emailPort || 587,
      secure: false,
      auth: { user: settings.emailUser, pass: settings.emailPass },
    })

    const attachments: any[] = []
    if (pdfBase64 && pdfFilename) {
      attachments.push({
        filename: pdfFilename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      })
    }

    await transporter.sendMail({
      from: `"${settings.studioName}" <${settings.emailFrom || settings.emailUser}>`,
      to: toEmail,
      subject,
      text: body,
      html: `<p style="white-space: pre-line; font-family: Arial; font-size: 14px;">${body.replace(/\n/g, '<br>')}</p>`,
      attachments,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
