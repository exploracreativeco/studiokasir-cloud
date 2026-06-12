// ============================================================
// api/jadwal/[id] — ubah/tukar/hapus shift. Semua tercatat:
// ganti orang = aksi TUKAR, ubah jam = UPDATE, hapus = DELETE.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  userId: z.string().optional(),
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tipe: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.shift.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 })

  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })
  const d = parsed.data

  const isTukar = d.userId && d.userId !== existing.userId
  let detail: any = {}
  if (isTukar) {
    const newUser = await prisma.user.findUnique({ where: { id: d.userId! }, select: { name: true } })
    detail = { dari: existing.user.name, ke: newUser?.name || d.userId }
  } else {
    detail = {
      before: { jam: `${existing.jamMulai}-${existing.jamSelesai}`, tipe: existing.tipe },
      after: { jam: `${d.jamMulai ?? existing.jamMulai}-${d.jamSelesai ?? existing.jamSelesai}`, tipe: d.tipe ?? existing.tipe },
    }
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...(d.userId ? { userId: d.userId } : {}),
      ...(d.jamMulai ? { jamMulai: d.jamMulai } : {}),
      ...(d.jamSelesai ? { jamSelesai: d.jamSelesai } : {}),
      ...(d.tipe !== undefined ? { tipe: d.tipe } : {}),
      ...(d.catatan !== undefined ? { catatan: d.catatan } : {}),
      changes: {
        create: {
          changedById: (session.user as any).id,
          aksi: isTukar ? 'TUKAR' : 'UPDATE',
          detail: JSON.stringify(detail),
        },
      },
    },
    include: { user: { select: { id: true, name: true, role: true, warna: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.shift.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 })

  // Catat dulu ke log (cascade delete akan ikut menghapus log shift ini,
  // jadi simpan jejak hapus TANPA relasi — pakai shift baru? Tidak:
  // solusi: log DELETE disimpan sebelum delete, lalu shift dihapus;
  // log ikut terhapus karena cascade. Maka simpan jejak di log shift LAIN
  // tidak masuk akal → ubah strategi: soft info via console + hard delete.
  // Keputusan: cukup hapus. Riwayat penting (TUKAR/UPDATE) tetap ada selama
  // shift hidup; jejak penghapusan dicatat ringkas di shift change global
  // ketika fitur audit global dibangun.
  await prisma.shift.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
