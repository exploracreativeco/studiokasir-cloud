// ============================================================
// lib/activity-log — pencatat aktivitas user terpusat.
// Panggil logActivity() dari API mana pun setelah aksi penting.
// Gagal log TIDAK boleh menggagalkan aksi utama (selalu try-catch).
// ============================================================
import { prisma } from '@/lib/prisma'

export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'EXPORT' | 'OTHER'

export async function logActivity(opts: {
  userId?: string | null
  userName?: string | null
  action: LogAction
  entity: string          // mis. 'Transaction', 'User', 'Package'
  entityId?: string | null
  detail?: string | null  // ringkasan singkat, mis. 'Invoice INV-001 (Rp 100.000)'
  branchId?: string | null
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: opts.userId || null,
        userName: opts.userName || null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId || null,
        detail: opts.detail || null,
        branchId: opts.branchId || null,
      },
    })
  } catch (e) {
    console.error('[logActivity] gagal:', e)
  }
}
