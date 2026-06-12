import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')

  try {
    switch (section) {
      case 'transactions':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.transactionItem.deleteMany()
        await prisma.biayaOpsItem.deleteMany()
        await prisma.transaction.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'bookings':
        await prisma.booking.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'ots':
        await prisma.otsOrderItem.deleteMany()
        await prisma.otsOrder.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'expenses':
        await prisma.expense.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'customers':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.transactionItem.deleteMany()
        await prisma.biayaOpsItem.deleteMany()
        await prisma.transaction.deleteMany()
        await prisma.booking.deleteMany()
        await prisma.otsOrderItem.deleteMany()
        await prisma.otsOrder.deleteMany()
        await prisma.customer.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'packages':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.transactionItem.deleteMany()
        await prisma.package.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'addons':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.addon.deleteMany()
        return NextResponse.json({ ok: true, section })

      case 'promos':
        await prisma.transaction.updateMany({ data: { promoCodeId: null } })
        await prisma.promoCode.deleteMany()
        return NextResponse.json({ ok: true, section })

      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
