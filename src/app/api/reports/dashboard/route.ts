// ============================================================
// api/reports/dashboard/route.ts — route TIPIS + branch-aware
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/services/report.service'
import { getBranchIdFromRequest } from '@/services/branch.service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branchId = await getBranchIdFromRequest(req)
  const data = await getDashboardData(branchId)
  return NextResponse.json(data)
}
