// ============================================================
// api/manajemen/gaji-slip — kirim slip gaji via email (SMTP Setting)
// Body: { to, subject, text } — isi sudah dirakit di client (custom-able)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(2),
  text: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  const s = await prisma.setting.findFirst()
  if (!s?.emailHost || !s?.emailUser || !s?.emailPass) {
    return NextResponse.json({ error: 'SMTP belum dikonfigurasi di Pengaturan → Email' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host: s.emailHost,
    port: s.emailPort || 587,
    secure: (s.emailPort || 587) === 465,
    auth: { user: s.emailUser, pass: s.emailPass },
  })

  try {
    await transporter.sendMail({
      from: s.emailFrom || s.emailUser,
      to: parsed.data.to,
      subject: parsed.data.subject,
      text: parsed.data.text,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Gagal kirim: ' + (e.message || '').slice(0, 200) }, { status: 500 })
  }
}
