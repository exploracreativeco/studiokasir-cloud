// api/landing-admin/upload — foto landing ke Supabase Storage bucket "landing"
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB (foto studio bisa besar)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Storage belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_KEY)' }, { status: 500 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Maksimal 8MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Hanya gambar' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `landing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const headers = { Authorization: `Bearer ${key}`, apikey: key }

  await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'landing', name: 'landing', public: true }),
  }).catch(() => {})

  const up = await fetch(`${url}/storage/v1/object/landing/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': file.type },
    body: buf,
  })
  if (!up.ok) {
    const err = await up.text().catch(() => '')
    return NextResponse.json({ error: 'Upload gagal: ' + err.slice(0, 200) }, { status: 500 })
  }
  return NextResponse.json({ url: `${url}/storage/v1/object/public/landing/${path}` })
}
