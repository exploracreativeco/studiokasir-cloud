import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const VALID_SERIALS = [
  'EXPLORA-KN-T6GF9YF6', 'EXPLORA-KN-MIHY8Z6T', 'EXPLORA-KN-IUT9M1IZ',
  'EXPLORA-KN-FAHH5HXI', 'EXPLORA-KN-KA2FQ9RF', 'EXPLORA-KN-4CCYHLE6',
  'EXPLORA-KN-VXKK943Y', 'EXPLORA-KN-YUD2QAS9', 'EXPLORA-KN-XMDBLTCC',
  'EXPLORA-KN-6VA935OW', 'EXPLORA-KN-MF9OWTY8', 'EXPLORA-KN-XGQEZQTA',
  'EXPLORA-KN-YFLTMY7O', 'EXPLORA-KN-QFVC49UJ', 'EXPLORA-KN-57255DUW',
  'EXPLORA-KN-OSKB0KRU', 'EXPLORA-KN-E4TRN62O', 'EXPLORA-KN-7KWL0WOL',
  'EXPLORA-KN-SSJA1290', 'EXPLORA-KN-V8VM93GC',
]

const LICENSE_FILE = path.join(process.cwd(), 'license.key')

export async function POST(req: NextRequest) {
  try {
    const { serial } = await req.json()
    if (!serial) return NextResponse.json({ success: false, message: 'Serial number diperlukan' }, { status: 400 })

    const serialUpper = serial.toUpperCase().trim()
    if (!VALID_SERIALS.includes(serialUpper)) {
      return NextResponse.json({ success: false, message: 'Serial number tidak valid' }, { status: 400 })
    }

    const hash = crypto.createHash('sha256').update(serialUpper + 'EXPLORA2026').digest('hex')
    const licenseData = { serial: serialUpper, hash, activatedAt: new Date().toISOString() }
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenseData), 'utf8')

    const response = NextResponse.json({ success: true, message: 'Aktivasi berhasil!' })
    // Set cookie permanen (10 tahun)
    response.cookies.set('sk_license', 'active', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
