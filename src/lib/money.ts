// ============================================================
// lib/money.ts — SATU-SATUNYA tempat rumus uang StudioKasir
// Semua file lain WAJIB import dari sini. Jangan tulis ulang rumus.
// ============================================================

/** Format angka ke Rupiah: 1500000 → "Rp 1.500.000" */
export function formatRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID')
}

/**
 * Rumus inti transaksi StudioKasir:
 *   grandTotal      = subtotal - discount  (tidak pernah negatif)
 *   diterimaSaatIni = grandTotal - dpAmount (uang yang diterima SAAT transaksi ini)
 *
 * dpAmount = DP yang sudah dibayar SEBELUMNYA (dari booking),
 * bukan bagian dari pendapatan transaksi ini.
 */
export function hitungTransaksi(input: {
  packagesTotal: number
  addonsTotal: number
  discount: number
  dpAmount: number
}) {
  const subtotal = input.packagesTotal + input.addonsTotal
  const grandTotal = Math.max(0, subtotal - input.discount)
  const diterimaSaatIni = Math.max(0, grandTotal - input.dpAmount)
  return { subtotal, grandTotal, diterimaSaatIni, remainingPayment: 0 }
}

/** Profit bulanan = omzet - biaya ops - pengeluaran */
export function hitungProfit(omzet: number, biayaOps: number, expenses: number): number {
  return omzet - biayaOps - expenses
}

/** Nominal booking: REFUND dihitung negatif */
export function nominalBooking(dpAmount: number, status: string): number {
  return status === 'REFUND' ? -dpAmount : dpAmount
}
