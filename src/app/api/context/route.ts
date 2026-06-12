// ============================================================
// api/context — konteks mode/studio + switch studio (cookie)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BRANCH_HEADER, MODE_HEADER } from '@/lib/branch'

export async function GET(req: NextRequest) {
  const session = await auth()
  const u: any = session?.user || {}
  // canSwitch: user akses-semua-studio (branchId null) di mode manajemen
  let canSwitch = false
  let branches: any[] = []
  if (session) {
    const dbUser = await prisma.user.findUnique({ where: { id: u.id }, select: { branchId: true } }).catch(() => null)
    canSwitch = !dbUser?.branchId
    if (canSwitch) {
      branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, slug: true, nama: true }, orderBy: { nama: 'asc' } })
    }
  }
  return NextResponse.json({
    mode: req.headers.get(MODE_HEADER) || 'kasir',
    branchSlug: req.headers.get(BRANCH_HEADER) || null,
    override: req.cookies.get('branch-override')?.value ?? null,
    canSwitch,
    branches,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { branchId: true } })
  if (dbUser?.branchId) return NextResponse.json({ error: 'Akun terkunci ke satu studio' }, { status: 403 })

  const { branchSlug } = await req.json().catch(() => ({}))
  const res = NextResponse.json({ ok: true })
  if (branchSlug === null || branchSlug === undefined) {
    res.cookies.delete('branch-override')
  } else {
    // '' = Semua Studio, 'explora'/'yours'/'booth' = spesifik
    if (branchSlug !== '') {
      const valid = await prisma.branch.findUnique({ where: { slug: branchSlug } })
      if (!valid) return NextResponse.json({ error: 'Studio tidak valid' }, { status: 400 })
    }
    res.cookies.set('branch-override', branchSlug, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  }
  return res
}
