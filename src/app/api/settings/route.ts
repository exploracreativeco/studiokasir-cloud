import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  studioName: z.string().min(1),
  address: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  invoiceFooter: z.string().nullable().optional(),
  webhookUrl: z.string().nullable().optional(),
  spreadsheetId: z.string().nullable().optional(),
  syaratKetentuan: z.string().nullable().optional(),
  emailHost: z.string().nullable().optional(),
  emailPort: z.coerce.number().nullable().optional(),
  emailUser: z.string().nullable().optional(),
  emailPass: z.string().nullable().optional(),
  emailFrom: z.string().nullable().optional(),
  emailSubject: z.string().nullable().optional(),
  emailTemplate: z.string().nullable().optional(),
  backupEmail: z.string().nullable().optional(),
  backupSchedule: z.string().nullable().optional(),
  backupTime: z.string().nullable().optional(),
  backupDay: z.string().nullable().optional(),
  thermalSize: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  googleClientId: z.string().nullable().optional(),
  googleClientSecret: z.string().nullable().optional(),
  gdriveFolderId: z.string().nullable().optional(),
  gdriveSchedule: z.string().nullable().optional(),
  ownerNama: z.string().nullable().optional(),
  ownerJabatan: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.setting.findFirst()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const settings = await prisma.setting.upsert({
    where: { id: 'default' },
    update: parsed.data,
    create: { id: 'default', ...parsed.data },
  })

  return NextResponse.json(settings)
}
