import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) {
      return NextResponse.json({ valid: false })
    }

    const raw = fs.readFileSync(LICENSE_FILE, 'utf8')
    const data = JSON.parse(raw)

    if (!data.serial || !data.hash) {
      return NextResponse.json({ valid: false })
    }

    const expectedHash = crypto.createHash('sha256').update(data.serial + 'EXPLORA2026').digest('hex')
    const isValid = expectedHash === data.hash && VALID_SERIALS.includes(data.serial)

    if (!isValid) {
      return NextResponse.json({ valid: false })
    }

    // Set cookie saat license valid (refresh cookie)
    const response = NextResponse.json({ valid: true })
    response.cookies.set('sk_license', 'active', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ valid: false })
  }
}
