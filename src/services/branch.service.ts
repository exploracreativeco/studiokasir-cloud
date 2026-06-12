// ============================================================
// services/branch.service.ts — Akses branch di API routes
// ============================================================
import { prisma } from '@/lib/prisma'
import { BRANCH_HEADER } from '@/lib/branch'

// Cache sederhana slug → id (branch jarang berubah)
const slugIdCache = new Map<string, string>()

/** Ambil branchId dari slug (cached) */
export async function getBranchId(slug: string): Promise<string | null> {
  if (slugIdCache.has(slug)) return slugIdCache.get(slug)!
  const branch = await prisma.branch.findUnique({ where: { slug }, select: { id: true } })
  if (!branch) return null
  slugIdCache.set(slug, branch.id)
  return branch.id
}

/**
 * Resolve branchId dari request (header di-set oleh middleware).
 * Return null = mode manajemen / tanpa filter branch.
 *
 * Pakai di route:
 *   const branchId = await getBranchIdFromRequest(req)
 *   const data = await listTransactions({ ..., branchId })
 */
export async function getBranchIdFromRequest(req: Request): Promise<string | null> {
  const slug = req.headers.get(BRANCH_HEADER)
  if (!slug) return null
  return getBranchId(slug)
}

/** List semua branch aktif (untuk dropdown di manajemen) */
export async function listBranches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { nama: 'asc' },
  })
}

/**
 * Helper untuk where clause:
 *   branchId ada  → filter branch itu
 *   branchId null → tanpa filter (manajemen lihat semua)
 */
export function branchWhere(branchId: string | null) {
  return branchId ? { branchId } : {}
}
