// ============================================================
// lib/sheet-sync.ts — SATU-SATUNYA tempat logika sync ke Google Sheets
// Dipakai oleh: transaction.service (auto saat create),
//   api/transactions/[id]/sync (retry manual / re-sync edit),
//   api/sync/retry (retry massal).
// Format payload PERSIS sesuai Apps Script doPost (TX_HEADERS).
// ============================================================
import { prisma } from '@/lib/prisma'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/** Label sheet bulan (untuk disimpan di syncSheet, tampilan saja) */
export function monthSheetLabel(date: Date): string {
  const d = new Date(date)
  return `${MONTHS[d.getMonth()]}_${d.getFullYear()}`
}

/** Bangun payload transaksi sesuai format Apps Script (TX_HEADERS) */
export function buildTxPayload(tx: any) {
  const d = new Date(tx.transactionDate)
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const paketNama = (tx.items || []).map((i: any) => i.package?.name || i.customItemName).filter(Boolean).join(', ')
  const jumlahOrang = (tx.items || []).reduce((s: number, i: any) => s + (i.jumlahOrang || 0), 0) || null
  return {
    type: 'transaction',
    date: dateStr,
    invoiceNumber: tx.invoiceNumber,
    customer: tx.customer?.name || '-',
    package: paketNama || '-',
    fotografer: tx.fotografer?.name || '-',
    jumlahOrang,
    subtotal: tx.subtotal || 0,
    discount: tx.discount || 0,
    dp: tx.dpAmount || 0,
    sisa: tx.remainingPayment || 0,
    total: tx.diterimaSaatIni || tx.grandTotal || 0,
    biayaOps: tx.biayaOpsTotal || 0,
    method: tx.metodePembayaran?.nama || '-',
    status: tx.paymentStatus || 'LUNAS',
    cashier: tx.user?.name || '-',
    notes: tx.notes || '',
  }
}

/** Include standar agar payload lengkap */
export const SYNC_INCLUDE = {
  customer: true,
  user: { select: { id: true, name: true, email: true } },
  fotografer: true,
  metodePembayaran: true,
  items: { include: { package: true } },
} as const

/**
 * Sync SATU transaksi ke Apps Script webhook, dengan retry internal.
 * - retries: jumlah percobaan (default 3), jeda 1.5s antar percobaan.
 * - Update syncStatus: SYNCED kalau berhasil, FAILED kalau semua gagal.
 * - TIDAK pernah throw — aman dipanggil dari mana pun.
 * Return: { ok, sheet?, error? }
 */
export async function syncOneTransaction(tx: any, retries = 3): Promise<{ ok: boolean; sheet?: string; error?: string }> {
  try {
    const setting = await prisma.setting.findFirst({ select: { webhookUrl: true } })
    const webhookUrl = setting?.webhookUrl?.trim()
    if (!webhookUrl) return { ok: false, error: 'Webhook URL belum diatur' }

    const payload = buildTxPayload(tx)
    const sheet = monthSheetLabel(tx.transactionDate)

    let lastErr = ''
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Apps Script balikkan { ok: true/false, duplicate?, message? }
        const result = await res.json().catch(() => ({ ok: true }))
        // duplicate dianggap sukses (data sudah ada di sheet)
        if (result.ok || result.duplicate) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { syncStatus: 'SYNCED', syncSheet: sheet, syncedAt: new Date() },
          })
          return { ok: true, sheet }
        }
        lastErr = result.message || 'Apps Script menolak'
      } catch (e: any) {
        lastErr = e?.message || 'Network error'
      }
      // jeda sebelum coba lagi (kecuali percobaan terakhir)
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500))
    }

    // Semua percobaan gagal → FAILED
    await prisma.transaction.update({ where: { id: tx.id }, data: { syncStatus: 'FAILED' } }).catch(() => {})
    return { ok: false, error: lastErr }
  } catch (e: any) {
    try { await prisma.transaction.update({ where: { id: tx.id }, data: { syncStatus: 'FAILED' } }) } catch {}
    return { ok: false, error: e?.message || 'Unknown error' }
  }
}
