'use client'

import { useEffect, useState } from 'react'
import { Search, UserPlus, Check, X, ShoppingCartIcon, Loader2, Users, Plus, Minus, ChevronLeft, ChevronRight, Pencil, RotateCcw, Tag, BookOpen } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatRupiah, generateInvoiceNumber } from '@/lib/utils'
import { useSyncQueue } from '@/hooks/use-store'
import { InvoiceModal } from '@/components/pos/invoice-modal'
import { useToast } from '@/components/ui/use-toast'
import type { Package, Addon, Customer, PromoCode, Fotografer, MetodePembayaran } from '@prisma/client'

const PKGS_PER_PAGE = 8
const CAT_LABELS: Record<string, string> = {
  PASFOTO: 'Pasfoto', CETAK: 'Cetak', GRADUATION: 'Graduation', FAMILY: 'Family',
  COUPLE: 'Couple', MATERNITY: 'Maternity', GROUP: 'Group', SQUAD: 'Squad',
  PARTY: 'Party', FESTIVAL: 'Festival', PERSONAL: 'Personal', PREWEDDING: 'Prewedding',
}

type SelectedPackage = {
  package: Package
  jumlahOrang: number
  quantity: number // jumlah item/sesi
  price: number // final price (already multiplied if per-orang and quantity)
  customPrice?: number | null // jika diisi, harga manual (override perhitungan)
  customItemName?: string | null // diisi kalau paket = Custom Item
  discount?: number // diskon per item
  promoCodeId?: string | null // promo code yang dipakai untuk item ini
}

const newCustSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
})

export default function KasirPage() {
  const { toast } = useToast()
  const syncQueue = useSyncQueue()
  const isOfflineMode = process.env.NEXT_PUBLIC_FEATURE_SHEETS !== 'true'

  const [packages, setPackages] = useState<Package[]>([])
  const [pkgCategories, setPkgCategories] = useState<any[]>([])
  const [activeCat, setActiveCat] = useState('')
  const [addons, setAddons] = useState<Addon[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [fotografers, setFotografers] = useState<Fotografer[]>([])
  const [metodes, setMetodes] = useState<MetodePembayaran[]>([])
  const [biayaOpsSatuan, setBiayaOpsSatuan] = useState<any[]>([])
  const [filteredPkgs, setFilteredPkgs] = useState<Package[]>([])
  const [page, setPage] = useState(1)
  const [pkgSearch, setPkgSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [showCustDD, setShowCustDD] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [activeItemPromo, setActiveItemPromo] = useState<string | null>(null) // packageId yang sedang edit promo
  const [promoDropdownPos, setPromoDropdownPos] = useState<{top: number, right: number} | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-promo]') && !target.closest('.promo-dropdown')) {
        setActiveItemPromo(null)
        setPromoDropdownPos(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const [showNewCust, setShowNewCust] = useState(false)
  const [invoiceTx, setInvoiceTx] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [txCount, setTxCount] = useState(0)
  const [selectedFotograferId, setSelectedFotograferId] = useState('')
  const [selectedMetodeId, setSelectedMetodeId] = useState('')
  // No paymentStatus - auto calculated from dpAmount
  const [dpAmount, setDpAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null)
  const [biayaOpsItems, setBiayaOpsItems] = useState<any[]>([])
  const [showAllAddons, setShowAllAddons] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])
  
  // Multi-package state
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>([])
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [activeBookingData, setActiveBookingData] = useState<any | null>(null)
  const [tanggalFoto, setTanggalFoto] = useState('')
  const [showBookingSearch, setShowBookingSearch] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingSearchResults, setBookingSearchResults] = useState<any[]>([])
  const [bookingSearchLoading, setBookingSearchLoading] = useState(false)
  const [customPriceEditing, setCustomPriceEditing] = useState<Record<number, boolean>>({}) // index -> sedang edit

  const { register: regCust, handleSubmit: handleCust, reset: resetCust, formState: { errors: custErrors } } = useForm({
    resolver: zodResolver(newCustSchema),
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [pkgRes, catRes, addonRes, custRes, promoRes, fotRes, metRes, biayaRes, txRes] = await Promise.all([
      fetch('/api/packages?activeOnly=true'),
      fetch('/api/package-categories'),
      fetch('/api/addons?activeOnly=true'),
      fetch('/api/customers'),
      fetch('/api/promos'),
      fetch('/api/fotografer?activeOnly=true'),
      fetch('/api/metode-pembayaran?activeOnly=true'),
      fetch('/api/biaya-ops?type=satuan'),
      fetch('/api/transactions?limit=1'),
    ])
    if (pkgRes.ok) setPackages(await pkgRes.json())
    if (catRes.ok) setPkgCategories(await catRes.json())
    if (addonRes.ok) setAddons(await addonRes.json())
    if (custRes.ok) setCustomers(await custRes.json())
    if (promoRes.ok) setPromos(await promoRes.json())
    if (fotRes.ok) setFotografers(await fotRes.json())
    if (metRes.ok) {
      const m = await metRes.json()
      setMetodes(m)
      if (m.length > 0) setSelectedMetodeId(m[0].id)
    }
    if (biayaRes.ok) setBiayaOpsSatuan(await biayaRes.json())
    if (txRes.ok) { const d = await txRes.json(); setTxCount(d.total || 0) }
  }

  useEffect(() => {
    let filtered = packages
    if (activeCat) filtered = filtered.filter(p => p.category === activeCat)
    if (pkgSearch) filtered = filtered.filter(p => p.name.toLowerCase().includes(pkgSearch.toLowerCase()))
    setFilteredPkgs(filtered)
    setPage(1)
  }, [packages, activeCat, pkgSearch])

  // Calculations
  function subtotalPackages() {
    return selectedPackages.reduce((s, p) => s + p.price, 0)
  }
  function subtotalAddons() {
    return selectedAddons.reduce((s, a) => s + a.price, 0)
  }
  const totalDiscount = selectedPackages.reduce((s, p) => s + (p.discount || 0), 0)
  const subtotal = subtotalPackages() + subtotalAddons()
  const grandTotal = Math.max(0, subtotal - totalDiscount)
  const discount = totalDiscount // alias untuk kompatibilitas
  const dibayarSekarang = Math.max(0, grandTotal - (dpAmount || 0))
  const biayaOpsTotal = biayaOpsItems.reduce((s, i) => s + i.total, 0)


  function applyPromoToItem(pkgId: string, promo: PromoCode) {
    setSelectedPackages(prev => prev.map(p => {
      if (p.package.id !== pkgId) return p
      // Hitung total harga item: harga/org Ã— jumlah orang Ã— quantity
      const totalHarga = p.jumlahOrang > 0
        ? p.package.price * p.jumlahOrang * (p.quantity || 1)
        : p.price
      const disc = promo.discountType === 'PERCENTAGE'
        ? Math.round(totalHarga * promo.discountValue / 100)
        : promo.discountValue
      return { ...p, discount: disc, promoCodeId: promo.id }
    }))
    setActiveItemPromo(null)
  }

  function removePromoFromItem(pkgId: string) {
    setSelectedPackages(prev => prev.map(p => {
      if (p.package.id !== pkgId) return p
      return { ...p, discount: 0, promoCodeId: null }
    }))
  }

  function togglePackage(pkg: Package) {
    const existing = selectedPackages.find(p => p.package.id === pkg.id)
    if (existing) {
      setSelectedPackages(prev => prev.filter(p => p.package.id !== pkg.id))
      return
    }
    const isPerOrang = pkg.pricePerPerson || pkgCategories.find((c:any) => c.name === pkg.category)?.perOrang
    setSelectedPackages(prev => [...prev, {
      package: pkg,
      jumlahOrang: isPerOrang ? 1 : 0,
      quantity: 1,
      price: pkg.price,
    }])
    if (selectedPackages.length === 0) loadBiayaOps(pkg.id)
  }

  function updateJumlahOrang(pkgId: string, jumlah: number, idx: number) {
    setSelectedPackages(prev => prev.map((p, i) => {
      if (p.package.id !== pkgId || i !== idx) return p
      const n = Math.max(1, jumlah)
      if (p.customPrice != null) return { ...p, jumlahOrang: n } // harga tetap manual
      const isPerOrang = p.package.pricePerPerson || pkgCategories.find((c:any) => c.name === p.package.category)?.perOrang
      const newPrice = isPerOrang ? p.package.price * n * p.quantity : p.package.price * p.quantity
      // Recalculate diskon kalau ada promo aktif
      const newDiscount = p.promoCodeId && p.discount > 0
        ? (() => {
            const promo = promos.find(pr => pr.id === p.promoCodeId)
            if (!promo) return 0
            return promo.discountType === 'PERCENTAGE'
              ? Math.round(newPrice * promo.discountValue / 100)
              : promo.discountValue
          })()
        : 0
      return { ...p, jumlahOrang: n, price: newPrice, discount: newDiscount }
    }))
  }

  function updateQuantity(pkgId: string, qty: number, idx: number) {
    setSelectedPackages(prev => prev.map((p, i) => {
      if (p.package.id !== pkgId || i !== idx) return p
      const q = Math.max(1, qty)
      if (p.customPrice != null) return { ...p, quantity: q } // harga tetap manual
      if (p.package.category === 'CUSTOM') return { ...p, quantity: q } // custom item: harga diisi manual lewat pensil
      const isPerOrang = p.package.pricePerPerson || pkgCategories.find((c:any) => c.name === p.package.category)?.perOrang
      const newPriceQ = isPerOrang ? p.package.price * p.jumlahOrang * q : p.package.price * q
      const newDiscountQ = p.promoCodeId && p.discount > 0
        ? (() => {
            const promo = promos.find(pr => pr.id === p.promoCodeId)
            if (!promo) return 0
            return promo.discountType === 'PERCENTAGE'
              ? Math.round(newPriceQ * promo.discountValue / 100)
              : promo.discountValue
          })()
        : 0
      return { ...p, quantity: q, price: newPriceQ, discount: newDiscountQ }
    }))
  }

  function setCustomPriceValue(idx: number, value: number) {
    setSelectedPackages(prev => prev.map((p, i) => {
      if (i !== idx) return p
      return { ...p, customPrice: value, price: value }
    }))
  }

  function resetCustomPrice(idx: number) {
    setSelectedPackages(prev => prev.map((p, i) => {
      if (i !== idx) return p
      const isPerOrang = p.package.pricePerPerson || pkgCategories.find((c:any) => c.name === p.package.category)?.perOrang
      const autoPrice = isPerOrang ? p.package.price * p.jumlahOrang * p.quantity : p.package.price * p.quantity
      return { ...p, customPrice: null, price: autoPrice }
    }))
    setCustomPriceEditing(prev => ({ ...prev, [idx]: false }))
  }

  function removePackage(idx: number) {
    setSelectedPackages(prev => prev.filter((_, i) => i !== idx))
  }

  async function loadBiayaOps(packageId: string) {
    const res = await fetch(`/api/biaya-ops?type=package&packageId=${packageId}`)
    if (res.ok) {
      const packageOps = await res.json()
      const items = packageOps.map((op: any) => {
        const satuan = biayaOpsSatuan.find((b: any) => b.ukuran === op.ukuran && b.jenis === op.jenis)
        const hargaSatuan = satuan?.harga || 0
        return { ukuran: op.ukuran, jenis: op.jenis, jumlah: op.jumlah, hargaSatuan, total: hargaSatuan * op.jumlah }
      })
      setBiayaOpsItems(items)
    }
  }

  function toggleAddon(addon: Addon) {
    setSelectedAddons(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  async function applyPromo(code?: string) {
    const c = (code || promoInput).toUpperCase().trim()
    if (!c) { toast({ title: 'Masukkan kode promo', variant: 'destructive' }); return }
    if (appliedPromo?.code === c) { setAppliedPromo(null); setPromoInput(''); return }
    const promo = promos.find(p => p.code === c && p.isActive)
    if (!promo) { toast({ title: 'Kode promo tidak valid', variant: 'destructive' }); return }
    setAppliedPromo(promo)
    setPromoInput(c)
    toast({ title: `Promo ${c} diterapkan!` })
  }

  const filteredCusts = custSearch
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c as any).whatsapp?.includes(custSearch))
    : customers.slice(0, 8)

  async function addNewCustomer(data: any) {
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) {
      const cust = await res.json()
      setCustomers(prev => [cust, ...prev])
      setCustomerId(cust.id); setCustomerName(cust.name); setCustSearch(cust.name)
      setShowNewCust(false); resetCust()
      toast({ title: 'Customer ditambahkan!' })
    }
  }

  function updateBiayaOpsItem(idx: number, field: string, value: any) {
    setBiayaOpsItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'jumlah' || field === 'hargaSatuan') updated.total = updated.jumlah * updated.hargaSatuan
      return updated
    }))
  }

  function reset() {
    setSelectedPackages([]); setSelectedAddons([]); setAppliedPromo(null)
    setCustomerId(''); setCustomerName(''); setCustSearch('')
    setPromoInput(''); setSelectedFotograferId(''); setBiayaOpsItems([]); setActiveItemPromo(null)
    setDpAmount(0); setNotes(''); setActiveBookingId(null); setActiveBookingData(null)
    setTanggalFoto(''); setBookingSearch(''); setBookingSearchResults([])
  }

  async function searchBooking(q: string) {
    if (!q || q.length < 2) { setBookingSearchResults([]); return }
    setBookingSearchLoading(true)
    try {
      const res = await fetch(`/api/booking?search=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.bookings || [])
        setBookingSearchResults(list.filter((b: any) => b.status !== 'LUNAS'))
      }
    } catch {}
    setBookingSearchLoading(false)
  }

  function loadBooking(b: any) {
    setActiveBookingId(b.id)
    setActiveBookingData(b)
    setDpAmount(b.dpAmount || 0)
    if (b.customerId) {
      setCustomerId(b.customerId)
      setCustomerName(b.namaCustomer || b.customer?.name || '')
      setCustSearch(b.namaCustomer || b.customer?.name || '')
    }
    if (b.tanggalFoto) setTanggalFoto(new Date(b.tanggalFoto).toISOString().split('T')[0])
    setShowBookingSearch(false)
    setBookingSearch('')
    toast({ title: `Booking ${b.bookingNumber} dimuat! DP: ${formatRupiah(b.dpAmount || 0)}` })
  }

  async function saveTx() {
    if (!customerId) { toast({ title: 'Pilih customer terlebih dahulu', variant: 'destructive' }); return }
    const missingCustomName = selectedPackages.find(p => p.package.category === 'CUSTOM' && !p.customItemName?.trim())
    if (missingCustomName) { toast({ title: 'Isi keterangan untuk Custom Item', variant: 'destructive' }); return }
    if (selectedPackages.length === 0) { toast({ title: 'Pilih minimal 1 paket', variant: 'destructive' }); return }
    if (!selectedMetodeId) { toast({ title: 'Pilih metode pembayaran', variant: 'destructive' }); return }

    setSaving(true)
    try {
      const finalDp = dpAmount || 0

      const body = {
        customerId,
        packages: selectedPackages.map(p => ({
          packageId: p.package.id,
          jumlahOrang: p.jumlahOrang > 0 ? p.jumlahOrang : null,
          quantity: p.quantity || 1,
          hargaPerOrang: (p.package.pricePerPerson || pkgCategories.find((c:any) => c.name === p.package.category)?.perOrang) ? p.package.price : null,
          price: p.price,
          customItemName: p.customItemName || null,
          discount: p.discount || 0,
          promoCodeId: p.promoCodeId || null,
        })),
        addonIds: selectedAddons.map(a => a.id),
        promoCodeId: null,
        discount: totalDiscount,
        dpAmount: finalDp,
        metodePembayaranId: selectedMetodeId,
        fotograferId: selectedFotograferId || null,

        notes,
        transactionDate: tanggal,
        biayaOpsTotal,
        biayaOps: biayaOpsItems.filter(b => b.ukuran && b.total > 0),
        bookingId: activeBookingId || null,
        tanggalFoto: tanggalFoto || null,
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        let errMsg = 'Terjadi kesalahan'
        try { const err = await res.json(); errMsg = err.error || errMsg } catch {}
        toast({ title: 'Gagal menyimpan', description: errMsg, variant: 'destructive' })
        return
      }

      const tx = await res.json()
      setInvoiceTx(tx)
      setTxCount(prev => prev + 1)
      if (!isOfflineMode) toast({ title: 'Transaksi disimpan! Sync sedang berjalan...' })
      else toast({ title: 'Transaksi berhasil disimpan!' })
      // Mark booking as selesai if there was an active booking
      if (activeBookingId) {
        setActiveBookingId(null)
        setActiveBookingData(null)
      }
      reset()

      if (!isOfflineMode) {
        const syncRes = await fetch(`/api/transactions/${tx.id}/sync`, { method: 'POST' })
        const syncData = await syncRes.json()
        if (syncData.ok) {
          toast({ title: `Tersync ke sheet ${syncData.sheet}!` })
        } else if (syncData.queued) {
          syncQueue.addToQueue({ transactionId: tx.id, invoiceNumber: tx.invoiceNumber, customerName: tx.customer?.name || '', queuedAt: new Date(), retryCount: 0 })
          toast({ title: 'Sync gagal, masuk queue otomatis', variant: 'default' })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(filteredPkgs.length / PKGS_PER_PAGE))
  const pagedPkgs = filteredPkgs.slice((page - 1) * PKGS_PER_PAGE, page * PKGS_PER_PAGE)
  const invNum = generateInvoiceNumber(txCount)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
        <div><h1 className="text-xl font-bold">Kasir</h1><p className="text-xs text-gray-500">Buat transaksi baru</p></div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-right">
          <div className="text-[10px] text-gray-400 font-medium">No. Invoice</div>
          <div className="text-sm font-bold text-blue-600">{invNum}</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_320px] overflow-hidden gap-0">
        {/* Left */}
        <div className="overflow-y-auto px-5 pb-5 space-y-3">

          {/* Customer + Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-4 gap-3 items-end">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer</label>
                <div className="relative">
                  <input value={custSearch} onChange={e => { setCustSearch(e.target.value); setShowCustDD(true) }}
                    onFocus={() => setShowCustDD(true)} placeholder="Pilih customer..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:border-blue-500" />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                </div>
                {(showCustDD && (filteredCusts.length > 0 || custSearch.length > 0)) && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredCusts.map(c => (
                      <button key={c.id} onMouseDown={async () => {
                        setCustomerId(c.id); setCustomerName(c.name); setCustSearch(c.name); setShowCustDD(false)
                        // Auto-load DP from active booking
                        const res = await fetch(`/api/booking?customerId=${c.id}&status=MENUNGGU`)
                        if (res.ok) {
                          const bookings = await res.json()
                          if (bookings.length > 0 && bookings[0].dpAmount > 0) {
                            setDpAmount(bookings[0].dpAmount)
                            setActiveBookingId(bookings[0].id)
                            toast({ title: `Ada booking Sudah Dibayarkan ${formatRupiah(bookings[0].dpAmount)} untuk ${c.name}!` })
                          }
                        }
                      }} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">{(c as any).whatsapp || 'Tidak ada WA'}</div>
                      </button>
                    ))}
                    {custSearch && !filteredCusts.find(c => c.name.toLowerCase() === custSearch.toLowerCase()) && (
                      <button onMouseDown={async () => {
                        const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: custSearch }) })
                        if (res.ok) {
                          const cust = await res.json()
                          setCustomers(prev => [cust, ...prev])
                          setCustomerId(cust.id); setCustomerName(cust.name); setCustSearch(cust.name); setShowCustDD(false)
                        }
                      }} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-t border-gray-100 text-blue-600 font-semibold text-sm flex items-center gap-2">
                        <span className="text-lg font-bold">+</span> Tambah "{custSearch}" sebagai customer baru
                      </button>
                    )}
                    {!custSearch && filteredCusts.length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-400">Ketik nama customer</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Transaksi</label>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Foto <span className="text-gray-300">(opsional)</span></label>
                <input type="date" value={tanggalFoto} onChange={e => setTanggalFoto(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fotografer (opsional)</label>
                <select value={selectedFotograferId} onChange={e => setSelectedFotograferId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Pilih Fotografer --</option>
                  {fotografers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            {/* Tombol search booking */}
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setShowBookingSearch(!showBookingSearch)}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-medium">
                <BookOpen className="w-3.5 h-3.5" /> Dari Booking?
              </button>
              {activeBookingId && (
                <span className="text-xs text-blue-600 font-medium">#{activeBookingData?.bookingNumber}</span>
              )}
            </div>

            {/* Search booking dropdown */}
            {showBookingSearch && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="text-xs font-semibold text-amber-800 mb-1">Cari Booking (nama / nomor / tanggal foto)</div>
                <input value={bookingSearch}
                  onChange={e => { setBookingSearch(e.target.value); searchBooking(e.target.value) }}
                  placeholder="Cari nama customer, BK-260605-xxx, atau 05/06/2026..."
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 bg-white" />
                {bookingSearchLoading && <div className="text-xs text-amber-600">Mencari...</div>}
                {bookingSearchResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {bookingSearchResults.map(b => (
                      <button key={b.id} onClick={() => loadBooking(b)}
                        className="w-full text-left bg-white border border-amber-100 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">{b.bookingNumber}</span>
                          <span className="text-xs text-amber-600">{b.status}</span>
                        </div>
                        <div className="text-xs text-gray-700 font-medium">{b.namaCustomer || b.customer?.name}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">{b.keperluan}</span>
                          {b.dpAmount > 0 && <span className="text-xs text-emerald-600 font-semibold">DP: {formatRupiah(b.dpAmount)}</span>}
                          {b.tanggalFoto && <span className="text-xs text-gray-400">📅 {new Date(b.tanggalFoto).toLocaleDateString('id-ID')}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {bookingSearch.length >= 2 && !bookingSearchLoading && bookingSearchResults.length === 0 && (
                  <div className="text-xs text-amber-600">Tidak ada booking ditemukan</div>
                )}
              </div>
            )}

            {activeBookingId && (
              <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-700 font-medium">📋 Booking aktif: {activeBookingData?.bookingNumber} — DP {formatRupiah(dpAmount)} otomatis diisi</span>
                <button onClick={() => { setActiveBookingId(null); setActiveBookingData(null); setDpAmount(0); setTanggalFoto('') }} className="ml-auto text-xs text-blue-500 hover:text-blue-700">✕ Hapus</button>
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <button onClick={() => setShowNewCust(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Customer Baru
              </button>
            </div>
          </div>

          {/* Package Selection - Multi */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold">Pilih Paket</span>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Bisa pilih lebih dari 1</span>
              <input value={pkgSearch} onChange={e => setPkgSearch(e.target.value)} placeholder="Cari paket..."
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-40 ml-auto" />
            </div>
            {/* Cat tabs */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {[{ name: '', label: 'Semua' }, ...pkgCategories].map(c => (
                <button key={c.name} onClick={() => setActiveCat(c.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeCat === c.name ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                  {c.name ? (c.label || c.name) : 'Semua'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {pagedPkgs.map(p => {
                const sel = selectedPackages.find(sp => sp.package.id === p.id)
                const perOrang = p.pricePerPerson || pkgCategories.find((c:any) => c.name === p.category)?.perOrang
                return (
                  <button key={p.id} onClick={() => togglePackage(p)}
                    className={`relative border-2 rounded-xl p-3 text-center transition-all ${sel ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                    {sel && <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                    {perOrang && <div className="absolute top-2 left-2"><Users className="w-3 h-3 text-blue-400" /></div>}
                    <div className="text-2xl mb-1"></div>
                    <div className="text-xs font-semibold leading-tight mb-1">{p.name}</div>
                    <div className={`text-xs ${sel ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{formatRupiah(p.price)}{perOrang ? '/org' : ''}</div>
                  </button>
                )
              })}
              {!pagedPkgs.length && <div className="col-span-4 text-center py-8 text-sm text-gray-400">Tidak ada paket</div>}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40" disabled={page === 1}><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-medium border transition-all ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40" disabled={page === totalPages}><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            )}
          </div>

          {/* Selected Packages with jumlah orang + quantity */}
          {selectedPackages.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1px_160px_1px_160px_1px_120px_32px] items-center bg-blue-100 px-4 py-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Paket</span>
                <div className="h-4 bg-blue-300" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide text-center">Jumlah Orang</span>
                <div className="h-4 bg-blue-300" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide text-center">Paket</span>
                <div className="h-4 bg-blue-300" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide text-right">Total</span>
                <div />
              </div>
              {/* Rows */}
              {selectedPackages.map((sp, idx) => {
                const isPerOrang = sp.package.pricePerPerson || pkgCategories.find((c:any) => c.name === sp.package.category)?.perOrang
                return (
                  <div key={idx} className="grid grid-cols-[1fr_1px_160px_1px_160px_1px_120px_32px] items-center bg-white border-t border-blue-100 px-4 py-2.5">
                    {/* Nama Paket */}
                    <div>
                      <div className="text-sm font-medium">{sp.package.name}</div>
                      {sp.package.category === 'CUSTOM' ? (
                        <input
                          type="text"
                          value={sp.customItemName || ''}
                          onChange={e => setSelectedPackages(prev => prev.map((p, i) => i === idx ? { ...p, customItemName: e.target.value } : p))}
                          placeholder="Keterangan item... (wajib)"
                          className="mt-1 w-full border border-orange-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-500 bg-orange-50 placeholder-orange-300"
                        />
                      ) : (
                        <div className="text-xs text-gray-400">{formatRupiah(sp.package.price)}{isPerOrang ? '/org' : ''}</div>
                      )}
                    </div>
                    <div className="h-full w-px bg-blue-100 mx-2" />
                    {/* Jumlah Orang */}
                    <div className="flex items-center justify-center gap-1.5">
                      {isPerOrang ? (
                        <>
                          <button onClick={() => updateJumlahOrang(sp.package.id, sp.jumlahOrang - 1, idx)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 flex-shrink-0"><Minus className="w-3 h-3" /></button>
                          <input type="number" value={sp.jumlahOrang} min="1"
                            onChange={e => updateJumlahOrang(sp.package.id, parseInt(e.target.value) || 1, idx)}
                            className="w-12 border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center outline-none focus:border-blue-500" />
                          <button onClick={() => updateJumlahOrang(sp.package.id, sp.jumlahOrang + 1, idx)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 flex-shrink-0"><Plus className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-300">â€”</span>
                      )}
                    </div>
                    <div className="h-full w-px bg-blue-100 mx-2" />
                    {/* Item / Quantity */}
                    <div className="flex items-center justify-center gap-1.5">
                      {sp.package.category === 'CUSTOM' ? (
                        <span className="text-sm text-gray-300">â€”</span>
                      ) : (
                        <>
                          <button onClick={() => { if(sp.quantity <= 1) removePackage(idx); else updateQuantity(sp.package.id, sp.quantity - 1, idx) }}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 flex-shrink-0"><Minus className="w-3 h-3" /></button>
                          <input type="number" value={sp.quantity} min="1"
                            onChange={e => updateQuantity(sp.package.id, parseInt(e.target.value) || 1, idx)}
                            className="w-12 border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center outline-none focus:border-blue-500" />
                          <button onClick={() => updateQuantity(sp.package.id, sp.quantity + 1, idx)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 flex-shrink-0"><Plus className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                    <div className="h-full w-px bg-blue-100 mx-2" />
                    {/* Total */}
                    <div className="flex items-center justify-end gap-1">
                      {customPriceEditing[idx] ? (
                        <input
                          type="number"
                          autoFocus
                          value={sp.customPrice ?? sp.price}
                          onChange={e => setCustomPriceValue(idx, Number(e.target.value) || 0)}
                          onBlur={() => setCustomPriceEditing(prev => ({ ...prev, [idx]: false }))}
                          className="w-24 border-2 border-orange-400 rounded-lg px-2 py-1 text-sm text-right font-bold text-orange-600 outline-none"
                        />
                      ) : (
                        <div className="text-right">
                          {sp.discount ? (<>
                            {sp.jumlahOrang > 0 ? (<>
                              <span className="text-xs text-gray-400 line-through">{formatRupiah(sp.package.price)}/org</span>
                              <div className={`text-sm font-bold ${sp.customPrice != null ? 'text-orange-500' : 'text-blue-600'}`}>
                                {formatRupiah(Math.round((sp.price - sp.discount) / sp.jumlahOrang / (sp.quantity || 1)))}/org
                              </div>
                            </>) : (<>
                              <span className="text-xs text-gray-400 line-through">{formatRupiah(sp.price)}</span>
                              <div className={`text-sm font-bold ${sp.customPrice != null ? 'text-orange-500' : 'text-blue-600'}`}>
                                {formatRupiah(sp.price - sp.discount)}
                              </div>
                            </>)}
                            <div className="text-xs text-emerald-600 font-medium">Hemat {formatRupiah(sp.discount)}</div>
                          </>) : (
                            <span className={`text-sm font-bold ${sp.customPrice != null ? 'text-orange-500' : 'text-blue-600'}`}>
                              {formatRupiah(sp.price)}
                            </span>
                          )}
                        </div>
                      )}
                      {sp.customPrice != null ? (
                        <button
                          onClick={() => resetCustomPrice(idx)}
                          title="Reset ke harga otomatis"
                          className="w-6 h-6 flex items-center justify-center text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors flex-shrink-0">
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setCustomPriceEditing(prev => ({ ...prev, [idx]: true }))}
                          title="Ubah harga manual"
                          className="w-6 h-6 flex items-center justify-center text-orange-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors flex-shrink-0">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Promo/Diskon */}
                    <div className="relative">
                      <button
                        data-promo={sp.package.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (activeItemPromo === sp.package.id) {
                            setActiveItemPromo(null)
                            setPromoDropdownPos(null)
                          } else {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setPromoDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
                            setActiveItemPromo(sp.package.id)
                          }
                        }}
                        title="Terapkan diskon/promo ke item ini"
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0 ${sp.discount ? 'text-yellow-500 bg-yellow-50' : 'text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50'}`}>
                        <Tag className="w-3 h-3" />
                      </button>
                      {activeItemPromo === sp.package.id && (
                        <div className="promo-dropdown" style={{ position: "fixed", top: promoDropdownPos?.top || 0, right: promoDropdownPos?.right || 0, zIndex: 9999 }}>
                          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56">
                            <div className="text-xs font-semibold text-gray-600 mb-2">Pilih Promo untuk item ini</div>
                            {promos.filter(p => p.isActive).length === 0 && (
                              <div className="text-xs text-gray-400 py-2 text-center">Tidak ada promo aktif</div>
                            )}
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {promos.filter(p => p.isActive).map(promo => (
                                <button key={promo.id} onClick={() => applyPromoToItem(sp.package.id, promo)}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-yellow-50 transition-colors ${sp.promoCodeId === promo.id ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-700'}`}>
                                  <span className="font-semibold">{promo.code}</span>
                                  <span className="text-gray-400 ml-1">
                                    {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : formatRupiah(promo.discountValue)}
                                  </span>
                                  {sp.promoCodeId === promo.id && <span className="ml-1 text-yellow-500">âœ“</span>}
                                </button>
                              ))}
                            </div>
                            {sp.discount ? (
                              <button onClick={() => { removePromoFromItem(sp.package.id); setActiveItemPromo(null) }}
                                className="w-full mt-2 pt-2 border-t border-gray-100 text-xs text-red-500 hover:text-red-700 text-center">
                                Hapus Diskon
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Hapus */}
                    <button onClick={() => removePackage(idx)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Addons + Promo + Catatan */}
          <div className="grid grid-cols-[1fr_210px] gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Add-On (berlaku untuk semua paket)</span>
                {selectedAddons.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedAddons.length} dipilih</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(showAllAddons ? addons : addons.slice(0, 6)).map(a => {
                  const sel = selectedAddons.some(sa => sa.id === a.id)
                  return (
                    <label key={a.id} className={`flex items-center justify-between cursor-pointer py-2 px-3 rounded-lg border transition-all ${sel ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={sel} onChange={() => toggleAddon(a)} className="w-3.5 h-3.5 rounded accent-blue-600" />
                        <span className="text-xs font-medium">{a.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatRupiah(a.price)}</span>
                    </label>
                  )
                })}
              </div>
              {addons.length > 6 && (
                <button type="button" onClick={() => setShowAllAddons(v => !v)}
                  className="mt-2 w-full text-xs font-semibold text-blue-600 hover:text-blue-700 py-1.5 border border-blue-100 hover:border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all">
                  {showAllAddons ? 'â†‘ Sembunyikan' : `+ Selengkapnya (${addons.length - 6} lainnya)`}
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Catatan</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan transaksi..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 h-16 resize-none" />
              </div>
              {totalDiscount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-emerald-700 mb-1">Diskon Aktif</div>
                  {selectedPackages.filter(p => p.discount).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-emerald-600">
                      <span>{p.package.name}</span>
                      <span>- {formatRupiah(p.discount || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold text-emerald-700 border-t border-emerald-200 mt-1 pt-1">
                    <span>Total Diskon</span>
                    <span>- {formatRupiah(totalDiscount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Biaya Ops */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Biaya Operasional</div>
              <button onClick={() => setBiayaOpsItems(prev => [...prev, { ukuran: '', jenis: 'CETAK', jumlah: 1, hargaSatuan: 0, total: 0 }])}
                className="text-xs text-blue-600 font-medium">+ Tambah</button>
            </div>
            {biayaOpsItems.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">Otomatis terisi dari paket pertama. Atau tambah manual.</div>
            ) : (
              <div className="space-y-2">
                {biayaOpsItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <input value={item.ukuran} onChange={e => updateBiayaOpsItem(idx, 'ukuran', e.target.value)} placeholder="Ukuran (10RS)"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                    <select value={item.jenis} onChange={e => updateBiayaOpsItem(idx, 'jenis', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
                      <option value="CETAK">Cetak</option>
                      <option value="PIGURA">Pigura</option>
                    </select>
                    <input type="number" value={item.jumlah} onChange={e => updateBiayaOpsItem(idx, 'jumlah', parseInt(e.target.value) || 1)} placeholder="Qty"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                    <input type="number" value={item.hargaSatuan || ''} onChange={e => updateBiayaOpsItem(idx, 'hargaSatuan', parseInt(e.target.value) || 0)} placeholder="Harga"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                    <span className="text-xs font-semibold text-right">{formatRupiah(item.total)}</span>
                    <button onClick={() => setBiayaOpsItems(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500">Total Biaya Ops</span>
                  <span className="text-sm font-bold text-red-500">{formatRupiah(biayaOpsTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right - Summary */}
        <div className="border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-100">
            <div className="font-bold text-[15px]">Ringkasan Transaksi</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">No. Invoice</span>
              <span className="text-xs font-bold text-blue-600">{invNum}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {selectedPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingCartIcon className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Pilih paket untuk memulai</p>
                <p className="text-xs text-gray-300 mt-1">Bisa pilih lebih dari 1 paket</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Paket ({selectedPackages.length})</div>
                  {selectedPackages.map((sp, idx) => (
                    <div key={idx} className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium leading-tight">
                          {sp.customItemName ? sp.customItemName : sp.package.name}
                        </div>
                        {sp.package.category === 'CUSTOM' ? (
                          <div className="text-xs text-orange-400">Custom Item</div>
                        ) : (
                          <>
                            {sp.jumlahOrang > 0 && <div className="text-xs text-blue-500">{sp.jumlahOrang} org Ã— {sp.quantity} item Ã— {formatRupiah(sp.customPrice != null ? sp.price / sp.jumlahOrang / sp.quantity : sp.package.price)}</div>}
                            {sp.jumlahOrang === 0 && sp.quantity > 1 && <div className="text-xs text-blue-500">{sp.quantity}x {formatRupiah(sp.customPrice != null ? sp.price / sp.quantity : sp.package.price)}</div>}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm font-medium">{formatRupiah(sp.price)}</span>
                        <button onClick={() => removePackage(idx)} className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 rounded transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedAddons.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Add-On</div>
                    {selectedAddons.map(a => (
                      <div key={a.id} className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium">{a.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{formatRupiah(a.price)}</span>
                          <button onClick={() => toggleAddon(a)} className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 rounded"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Harga Paket</span><span>{formatRupiah(subtotal)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Diskon <span className="bg-emerald-50 text-emerald-700 text-xs px-1.5 py-0.5 rounded font-semibold">{appliedPromo?.code}</span></span>
                      <span className="text-emerald-600 font-medium">- {formatRupiah(discount)}</span>
                    </div>
                  )}
                  {dpAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Sudah Dibayarkan</span><span>- {formatRupiah(dpAmount)}</span>
                    </div>
                  )}
                  {biayaOpsTotal > 0 && <div className="flex justify-between text-xs text-red-500"><span>Biaya Ops (internal)</span><span>{formatRupiah(biayaOpsTotal)}</span></div>}
                  <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-100">
                    <span>Dibayarkan</span><span>{formatRupiah(dibayarSekarang)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 space-y-2.5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pembayaran</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Metode</span>
              <select value={selectedMetodeId} onChange={e => setSelectedMetodeId(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white max-w-[160px]">
                {metodes.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Sudah Dibayarkan <span className="text-gray-300">(opsional)</span></span>
              <input type="number" value={dpAmount || ''} onChange={e => setDpAmount(Number(e.target.value))} placeholder="Sudah dibayarkan sebelumnya"
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-right w-36 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Dibayarkan</span>
              <span className="text-lg font-extrabold text-emerald-600">{formatRupiah(dibayarSekarang)}</span>
            </div>
            <button onClick={saveTx} disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : isOfflineMode ? 'Simpan Transaksi' : 'Simpan & Sync ke Sheets'}
            </button>
          </div>
          <div className="flex-shrink-0 bg-blue-50 border-t border-blue-100 px-4 py-2 text-xs text-blue-500">
             {!isOfflineMode && 'Auto sync ke Google Sheets setelah simpan.'}
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCust && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold mb-4">Tambah Customer Baru</h2>
            <form onSubmit={handleCust(addNewCustomer)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap*</label>
                <input {...regCust('name')} placeholder="Nama customer" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                {custErrors.name && <p className="text-xs text-red-500 mt-0.5">{custErrors.name.message as string}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
                <input {...regCust('whatsapp')} placeholder="08xxxxxxxxxx" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input {...regCust('email')} type="email" placeholder="customer@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowNewCust(false); resetCust() }} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium hover:bg-gray-50">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700">Tambah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {invoiceTx && <InvoiceModal tx={invoiceTx} onClose={() => setInvoiceTx(null)} />}
    </div>
  )
}
