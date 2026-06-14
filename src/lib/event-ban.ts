// ============================================================
// lib/event-ban.ts — cek larangan (ban) crew ikut Event Booth
// Tafsir A: user dilarang daftar event yang TANGGALNYA jatuh dalam masa ban.
// ============================================================
import { prisma } from '@/lib/prisma'

/**
 * Cek apakah user dilarang ikut event pada tanggal tertentu.
 * Ban aktif kalau: bannedFrom <= tanggalEvent <= bannedUntil.
 * Return: { banned, until?, reason? }
 */
export async function cekBanEventBooth(userId: string, tanggalEvent: Date): Promise<{ banned: boolean; until?: Date; reason?: string | null }> {
  const ban = await prisma.eventBoothBan.findFirst({
    where: {
      userId,
      bannedFrom: { lte: tanggalEvent },
      bannedUntil: { gte: tanggalEvent },
    },
    orderBy: { bannedUntil: 'desc' },
  })
  if (!ban) return { banned: false }
  return { banned: true, until: ban.bannedUntil, reason: ban.reason }
}

/** Pesan tolak yang ramah dibaca */
export function pesanBan(until?: Date, reason?: string | null): string {
  const tgl = until ? new Date(until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
  let msg = `Kamu sedang dilarang ikut Event Booth untuk tanggal tersebut (berlaku sampai ${tgl}).`
  if (reason) msg += ` Alasan: ${reason}`
  return msg
}
