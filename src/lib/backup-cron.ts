import cron from 'node-cron'
import { prisma } from './prisma'

let cronJob: cron.ScheduledTask | null = null

export function startBackupCron() {
  // Cek setiap menit
  cronJob = cron.schedule('* * * * *', async () => {
    try {
      const settings = await prisma.setting.findFirst()
      if (!settings) return
      if (!settings.backupSchedule || settings.backupSchedule === 'OFF') return
      if (!settings.emailUser || !settings.emailPass) return

      const now = new Date()
      const [hours, minutes] = (settings.backupTime || '22:00').split(':').map(Number)

      // Cek jam dan menit sesuai
      if (now.getHours() !== hours || now.getMinutes() !== minutes) return

      // Cek hari untuk weekly/monthly
      if (settings.backupSchedule === 'WEEKLY' && now.getDay() !== 1) return // Senin
      if (settings.backupSchedule === 'MONTHLY' && now.getDate() !== parseInt(settings.backupDay || '1')) return

      // Cek sudah backup hari ini (hindari double backup)
      if (settings.lastBackupAt) {
        const last = new Date(settings.lastBackupAt)
        const diffMinutes = (now.getTime() - last.getTime()) / 1000 / 60
        if (diffMinutes < 60) return // Skip kalau sudah backup dalam 1 jam terakhir
      }

      console.log('[Backup Cron] Menjalankan backup otomatis...')

      // Hit API backup internal
      const res = await fetch('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET || 'studiokasir-cron',
        },
      })

      const data = await res.json()
      if (data.ok) {
        console.log(`[Backup Cron] Berhasil! File: ${data.filename}`)
      } else {
        console.error('[Backup Cron] Gagal:', data.error)
      }
    } catch (err) {
      console.error('[Backup Cron] Error:', err)
    }
  })

  console.log('[Backup Cron] Scheduler aktif')
}

export function stopBackupCron() {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
    console.log('[Backup Cron] Scheduler dihentikan')
  }
}
