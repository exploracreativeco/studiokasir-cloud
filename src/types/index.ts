import type {
  User, Customer, Package, Addon, PromoCode,
  Transaction, TransactionItem, TransactionItemAddon,
  Expense, Setting, Fotografer, MetodePembayaran,
} from '@prisma/client'

export type { User, Customer, Package, Addon, PromoCode, Transaction, Expense, Setting, Fotografer, MetodePembayaran }

export type TransactionWithRelations = Transaction & {
  customer: Customer
  user: Pick<User, 'id' | 'name' | 'email'>
  fotografer?: Fotografer | null
  metodePembayaran?: MetodePembayaran | null
  promoCode: PromoCode | null
  items: (TransactionItem & {
    package: Package
    addons: (TransactionItemAddon & { addon: Addon })[]
  })[]
}

export type CartItem = {
  package: Package
  addons: Addon[]
}

export type SyncQueueItem = {
  transactionId: string
  invoiceNumber: string
  customerName: string
  failReason?: string
  queuedAt: Date
  retryCount: number
}

export type DashboardStats = {
  todayRevenue: number
  monthRevenue: number
  totalTransactions: number
  dpTransactions: number
  repeatCustomers: number
  weeklyRevenue: { day: string; amount: number }[]
  monthlyRevenue: { month: string; amount: number }[]
  recentTransactions: TransactionWithRelations[]
}

// next-auth type augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }
}
