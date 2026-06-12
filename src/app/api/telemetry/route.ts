import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TELEMETRY_URL = 'https://script.google.com/macros/s/AKfycbwabxRCL7EdIDTh9YWjwIDpIzw2IPQRGhQNXWyZN7OXT-3mFkugK80EtPTtRWoEurXj/exec'
const APP_VERSION = '1.2.0'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Ambil nama studio dari settings
    const setting = await prisma.setting.findFirst()
    const studioName = setting?.studioName || 'Unknown Studio'
    const alamat = setting?.address || '-'
    const whatsapp = setting?.whatsapp || '-'

    // Ambil IP publik client
    let ip = 'unknown'
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000)
      })
      const ipData = await ipRes.json()
      ip = ipData.ip || 'unknown'
    } catch {
      // Fallback ke header kalau ipify tidak bisa diakses
      ip = req.headers.get('x-forwarded-for')
        || req.headers.get('x-real-ip')
        || 'localhost'
    }

    // Kirim ping ke Google Sheet (fire and forget)
    fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioName,
        alamat,
        whatsapp,
        version: APP_VERSION,
        ip,
        status: 'ACTIVE',
      }),
    }).catch(() => {}) // tidak throw kalau gagal

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
