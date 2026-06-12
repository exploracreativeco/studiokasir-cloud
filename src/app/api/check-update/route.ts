import { NextResponse } from 'next/server'

const CURRENT_VERSION = '1.2.0'
const VERSION_URL = 'https://raw.githubusercontent.com/explorastudio/studiokasir/main/version.json'

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(VERSION_URL + '?t=' + Date.now(), {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) return NextResponse.json({ current: CURRENT_VERSION, hasUpdate: false })

    const data = await res.json()
    const hasUpdate = data.version && data.version !== CURRENT_VERSION

    return NextResponse.json({
      current: CURRENT_VERSION,
      latest: data.version,
      hasUpdate,
      notes: data.notes || null,
      downloadUrl: data.downloadUrl || null,
    })
  } catch {
    return NextResponse.json({ current: CURRENT_VERSION, hasUpdate: false })
  }
}
