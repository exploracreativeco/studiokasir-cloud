// api/inv-token — buat token invoice publik (hanya user login)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { makeInvToken } from '@/lib/inv-token'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as 'P' | 'O' | 'B'
  const id = searchParams.get('id') || ''
  if (!['P', 'O', 'B'].includes(type) || !id) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  return NextResponse.json({ token: makeInvToken(type, id) })
}
