// ============================================================
// api/context — mode & branch dari middleware (untuk client)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { BRANCH_HEADER, MODE_HEADER } from '@/lib/branch'

export async function GET(req: NextRequest) {
  return NextResponse.json({
    mode: req.headers.get(MODE_HEADER) || 'kasir',
    branchSlug: req.headers.get(BRANCH_HEADER) || null,
  })
}
