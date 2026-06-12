import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('logo') as File
    const studioId = formData.get('studioId') as string

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 })

    // Simpan sebagai base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const logoUrl = `data:${file.type};base64,${base64}`

    // Update StudioProfil
    await prisma.studioProfil.update({
      where: { id: studioId },
      data: { logoUrl }
    })

    return NextResponse.json({ ok: true, logoUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
