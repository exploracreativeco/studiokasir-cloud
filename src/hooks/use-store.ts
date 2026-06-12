import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Package, Addon, PromoCode } from '@prisma/client'
import type { SyncQueueItem } from '@/types'

interface POSState {
  selectedPackage: Package | null
  selectedAddons: Addon[]
  appliedPromo: PromoCode | null
  customerId: string
  customerName: string
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS'
  paymentStatus: 'DP' | 'LUNAS'
  dpAmount: number
  notes: string
  jumlahOrang: number
  // computed
  subtotal: number
  discount: number
  grandTotal: number
  remainingPayment: number
  // actions
  setPackage: (pkg: Package | null) => void
  toggleAddon: (addon: Addon) => void
  setPromo: (promo: PromoCode | null) => void
  setCustomer: (id: string, name: string) => void
  setPaymentMethod: (method: 'CASH' | 'TRANSFER' | 'QRIS') => void
  setPaymentStatus: (status: 'DP' | 'LUNAS') => void
  setDpAmount: (amount: number) => void
  setNotes: (notes: string) => void
  setJumlahOrang: (n: number) => void
  reset: () => void
  recalculate: () => void
}

const initialState = {
  selectedPackage: null,
  selectedAddons: [],
  appliedPromo: null,
  customerId: '',
  customerName: '',
  paymentMethod: 'TRANSFER' as const,
  paymentStatus: 'DP' as const,
  dpAmount: 0,
  notes: '',
  jumlahOrang: 1,
  subtotal: 0,
  discount: 0,
  grandTotal: 0,
  remainingPayment: 0,
}

function calcTotals(
  pkg: Package | null,
  addons: Addon[],
  promo: PromoCode | null,
  paymentStatus: 'DP' | 'LUNAS',
  dpAmount: number,
  jumlahOrang: number = 1
) {
  const pkgPrice = pkg ? ((pkg as any).pricePerPerson ? pkg.price * jumlahOrang : pkg.price) : 0
  const subtotal = pkgPrice + addons.reduce((s, a) => s + a.price, 0)
  let discount = 0
  if (promo && subtotal > 0) {
    discount = promo.discountType === 'PERCENTAGE'
      ? Math.round(subtotal * promo.discountValue / 100)
      : promo.discountValue
  }
  const grandTotal = Math.max(0, subtotal - discount)
  const dp = paymentStatus === 'LUNAS' ? grandTotal : dpAmount
  const remainingPayment = Math.max(0, grandTotal - dp)
  return { subtotal, discount, grandTotal, remainingPayment }
}

export const usePOSStore = create<POSState>()((set, get) => ({
  ...initialState,

  setPackage: (pkg) => {
    const s = get()
    const jml = pkg ? 1 : 1 // reset jumlah orang on package change
    const t = calcTotals(pkg, s.selectedAddons, s.appliedPromo, s.paymentStatus, s.dpAmount, jml)
    set({ selectedPackage: pkg, jumlahOrang: jml, ...t })
  },

  toggleAddon: (addon) => {
    const s = get()
    const exists = s.selectedAddons.find(a => a.id === addon.id)
    const newAddons = exists
      ? s.selectedAddons.filter(a => a.id !== addon.id)
      : [...s.selectedAddons, addon]
    const t = calcTotals(s.selectedPackage, newAddons, s.appliedPromo, s.paymentStatus, s.dpAmount, s.jumlahOrang)
    set({ selectedAddons: newAddons, ...t })
  },

  setPromo: (promo) => {
    const s = get()
    const t = calcTotals(s.selectedPackage, s.selectedAddons, promo, s.paymentStatus, s.dpAmount, s.jumlahOrang)
    set({ appliedPromo: promo, ...t })
  },

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setPaymentStatus: (status) => {
    const s = get()
    const dp = status === 'LUNAS' ? 0 : s.dpAmount
    const t = calcTotals(s.selectedPackage, s.selectedAddons, s.appliedPromo, status, dp, s.jumlahOrang)
    set({ paymentStatus: status, dpAmount: dp, ...t })
  },

  setDpAmount: (amount) => {
    const s = get()
    const t = calcTotals(s.selectedPackage, s.selectedAddons, s.appliedPromo, s.paymentStatus, amount, s.jumlahOrang)
    set({ dpAmount: amount, ...t })
  },

  setNotes: (notes) => set({ notes }),

  setJumlahOrang: (n) => {
    const s = get()
    const t = calcTotals(s.selectedPackage, s.selectedAddons, s.appliedPromo, s.paymentStatus, s.dpAmount, n)
    set({ jumlahOrang: n, ...t })
  },

  recalculate: () => {
    const s = get()
    const t = calcTotals(s.selectedPackage, s.selectedAddons, s.appliedPromo, s.paymentStatus, s.dpAmount, s.jumlahOrang)
    set(t)
  },

  reset: () => set(initialState),
}))

// Sync queue store with localStorage persistence
interface SyncQueueState {
  queue: SyncQueueItem[]
  addToQueue: (item: SyncQueueItem) => void
  removeFromQueue: (transactionId: string) => void
  clearQueue: () => void
  getQueueCount: () => number
}

export const useSyncQueue = create<SyncQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      addToQueue: (item) => {
        const existing = get().queue.find(q => q.transactionId === item.transactionId)
        if (!existing) set(s => ({ queue: [...s.queue, item] }))
      },
      removeFromQueue: (id) => set(s => ({ queue: s.queue.filter(q => q.transactionId !== id) })),
      clearQueue: () => set({ queue: [] }),
      getQueueCount: () => get().queue.length,
    }),
    { name: 'sk-sync-queue' }
  )
)
