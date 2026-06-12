export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackupCron } = await import('./src/lib/backup-cron')
    startBackupCron()
  }
}
