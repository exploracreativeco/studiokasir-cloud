// Helper konteks studio untuk API route (membaca header dari middleware)
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export async function ctxBranchId(req: NextRequest): Promise<string | null> {
  const slug = req.headers.get('x-branch-slug')
  if (!slug) return null
  const b = await prisma.branch.findUnique({ where: { slug }, select: { id: true } })
  return b?.id || null
}

/** Filter master data: milik studio context + milik "Semua" (null) */
export function branchOr(bid: string | null) {
  return bid ? { OR: [{ branchId: null }, { branchId: bid }] } : {}
}
