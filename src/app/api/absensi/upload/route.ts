// ============================================================
// api/absensi/upload — upload foto bukti ke Supabase Storage
// Env wajib: SUPABASE_URL, SUPABASE_SERVICE_KEY
// Bucket "absensi" (public) — auto-create saat pertama dipakai.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Storage belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_KEY)' }, { status: 500 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Maksimal 5MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Hanya gambar' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${(session.user as any).id}_${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const headers = { Authorization: `Bearer ${key}`, apikey: key }

  // Auto-create bucket public (idempotent — 409 kalau sudah ada)
  await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'absensi', name: 'absensi', public: true }),
  }).catch(() => {})

  const up = await fetch(`${url}/storage/v1/object/absensi/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': file.type },
    body: buf,
  })
  if (!up.ok) {
    const err = await up.text().catch(() => '')
    return NextResponse.json({ error: 'Upload gagal: ' + err.slice(0, 200) }, { status: 500 })
  }
  return NextResponse.json({ url: `${url}/storage/v1/object/public/absensi/${path}` })
}
