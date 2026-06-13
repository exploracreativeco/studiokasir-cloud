// ============================================================
// lib/notify — kirim email notifikasi ke semua SUPERADMIN.
// Pakai SMTP dari Setting (sama seperti slip gaji & backup).
// Gagal kirim TIDAK menggagalkan aksi utama (selalu catch di pemanggil).
// ============================================================
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

export async function notifySuperadmin(opts: { subjek: string; isi: string }) {
  const settings = await prisma.setting.findFirst()
  if (!settings?.emailUser || !settings?.emailPass) return // email belum dikonfigurasi → skip diam

  // Tujuan: semua superadmin yang punya email, fallback ke emailUser
  const supers = await prisma.user.findMany({
    where: { role: 'SUPERADMIN', isActive: true, email: { not: '' } },
    select: { email: true },
  })
  const to = supers.map(s => s.email).filter(Boolean)
  if (to.length === 0) to.push(settings.backupEmail || settings.emailUser)

  const transporter = nodemailer.createTransport({
    host: settings.emailHost || 'smtp.gmail.com',
    port: settings.emailPort || 587,
    secure: (settings.emailPort || 587) === 465,
    auth: { user: settings.emailUser, pass: settings.emailPass },
  })

  await transporter.sendMail({
    from: `"${settings.studioName || 'StudioHub'}" <${settings.emailFrom || settings.emailUser}>`,
    to: to.join(', '),
    subject: opts.subjek,
    text: opts.isi,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;white-space:pre-line;font-size:14px;line-height:1.6;">${opts.isi.replace(/\n/g, '<br>')}</div>`,
  })
}
