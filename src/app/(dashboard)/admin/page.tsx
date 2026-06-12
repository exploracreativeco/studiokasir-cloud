'use client'

import React from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState } from 'react'
import { Save, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { PageHeader, Badge, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'
import { formatRupiah } from '@/lib/utils'
import { useSession } from 'next-auth/react'

const TABS = [
  { id: 'packages', label: 'Paket' },
  { id: 'addons', label: 'Add-On' },
  { id: 'promos', label: 'Promo' },
  { id: 'ots-paket', label: 'Paket OTS' },
  { id: 'biaya-ops', label: 'Biaya Ops' },
  { id: 'fotografer', label: 'Fotografer' },
  { id: 'metode', label: 'Metode Bayar' },
  { id: 'ots-jenis', label: 'Jenis OTS' },
  { id: 'ots-status', label: 'Status OTS' },
]


function SortableAddonRow({ addon, onEdit, onDelete }: { addon: any; onEdit: (a: any) => void; onDelete: (id: string) => void }) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: addon.id })
 const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
 return (
   <tr ref={setNodeRef} style={style} className="hover:bg-gray-50/50">
     <td className="px-2 py-3 w-8">
       <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex justify-center">
         <GripVertical className="w-4 h-4" />
       </div>
     </td>
     <td className="px-4 py-3 text-sm font-medium">{addon.name}</td>
     <td className="px-4 py-3 text-sm">{formatRupiah(addon.price)}</td>
     <td className="px-4 py-3">
       <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${addon.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
         {addon.isActive ? 'Aktif' : 'Nonaktif'}
       </span>
     </td>
     <td className="px-4 py-3">
       <div className="flex gap-1">
         <button onClick={() => onEdit(addon)}
           className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
         <button onClick={() => onDelete(addon.id)}
           className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
       </div>
     </td>
   </tr>
 )
}

export default function AdminPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('packages')
  const [loading, setLoading] = useState(true)

  // Data
  const [packages, setPackages] = useState<any[]>([])
  const [addons, setAddons] = useState<any[]>([])
  const dndSensors = useSensors(useSensor(PointerSensor))
  const [promos, setPromos] = useState<any[]>([])
  const [fotografers, setFotografers] = useState<any[]>([])
  const [metodes, setMetodes] = useState<any[]>([])
  const [otsStatuses, setOtsStatuses] = useState<any[]>([])
  const [otsPakets, setOtsPakets] = useState<any[]>([])
  const [biayaOpsSatuan, setBiayaOpsSatuan] = useState<any[]>([])

  // Categories & Tiers
  const [pkgCategories, setPkgCategories] = useState<any[]>([])
  const [pkgTiers, setPkgTiers] = useState<any[]>([])

  // Category form
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', label: '', perOrang: false, urutan: 0 })

  // Tier form
  const [showTierForm, setShowTierForm] = useState(false)
  const [editTierId, setEditTierId] = useState<string | null>(null)
  const [tierForm, setTierForm] = useState({ name: '', label: '', urutan: 0 })

  // Package form
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [editPackageId, setEditPackageId] = useState<string | null>(null)
  const [packageForm, setPackageForm] = useState({ name: '', category: '', tier: '', price: 0, pricePerPerson: false, isActive: true, description: '' })
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [inlineEditPkgId, setInlineEditPkgId] = useState<string | null>(null)
  const [tempPackageOps, setTempPackageOps] = useState<any[]>([])

  // Addon form
  const [showAddonForm, setShowAddonForm] = useState(false)
  const [editAddonId, setEditAddonId] = useState<string | null>(null)
  const [addonForm, setAddonForm] = useState({ name: '', price: 0, isActive: true })

  // Promo form
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [editPromoId, setEditPromoId] = useState<string | null>(null)
  const [promoForm, setPromoForm] = useState({ name: '', code: '', discountType: 'PERCENTAGE', discountValue: 0, isActive: true })

  // Fotografer form
  const [showFotograferForm, setShowFotograferForm] = useState(false)
  const [editFotograferId, setEditFotograferId] = useState<string | null>(null)
  const [fotograferForm, setFotograferForm] = useState({ name: '', phone: '' })

  // Metode form
  const [showMetodeForm, setShowMetodeForm] = useState(false)
  const [editMetodeId, setEditMetodeId] = useState<string | null>(null)
  const [metodeForm, setMetodeForm] = useState({ nama: '', namaBank: '', nomorRekening: '', atasNama: '' })

  // OTS Status form
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [editStatusId, setEditStatusId] = useState<string | null>(null)
  const [statusForm, setStatusForm] = useState({ nama: '', warna: '#3b82f6', urutan: 0 })

  // OTS Jenis
  const [otsJenis, setOtsJenis] = useState<any[]>([])
  const [showJenisForm, setShowJenisForm] = useState(false)
  const [editJenisId, setEditJenisId] = useState<string | null>(null)
  const [jenisForm, setJenisForm] = useState({ nama: '' })

  // OTS Paket form
  const [showOtsPaketForm, setShowOtsPaketForm] = useState(false)
  const [editOtsPaketId, setEditOtsPaketId] = useState<string | null>(null)
  const [otsPaketForm, setOtsPaketForm] = useState({ nama: '', jenis: '', harga: 0, satuan: 'sesi', backgrounds: [''] })

  // Biaya ops form
  const [showBiayaOpsForm, setShowBiayaOpsForm] = useState(false)
  const [biayaOpsForm, setBiayaOpsForm] = useState({ ukuran: '', jenis: 'CETAK', harga: 0 })

  async function load() {
    setLoading(true)
    const [pkgRes, addonRes, promoRes, fotRes, metRes, statusRes, otsPaketRes, biayaRes, catRes, tierRes, jenisRes] = await Promise.all([
      fetch('/api/packages?activeOnly=false'),
      fetch('/api/addons?activeOnly=false'),
      fetch('/api/promos'),
      fetch('/api/fotografer?activeOnly=false'),
      fetch('/api/metode-pembayaran?activeOnly=false'),
      fetch('/api/ots/status'),
      fetch('/api/ots/paket?activeOnly=false'),
      fetch('/api/biaya-ops?type=satuan'),
      fetch('/api/package-categories'),
      fetch('/api/package-tiers'),
      fetch('/api/ots/jenis'),
    ])
    if (pkgRes.ok) setPackages(await pkgRes.json())
    if (addonRes.ok) setAddons(await addonRes.json())
    if (promoRes.ok) setPromos(await promoRes.json())
    if (fotRes.ok) setFotografers(await fotRes.json())
    if (metRes.ok) setMetodes(await metRes.json())
    if (statusRes.ok) setOtsStatuses(await statusRes.json())
    if (otsPaketRes.ok) setOtsPakets(await otsPaketRes.json())
    if (biayaRes.ok) setBiayaOpsSatuan(await biayaRes.json())
    if (catRes.ok) setPkgCategories(await catRes.json())
    if (tierRes.ok) setPkgTiers(await tierRes.json())
    if (jenisRes.ok) setOtsJenis(await jenisRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(endpoint: string, item: any, activeField = 'isActive') {
    const res = await fetch(endpoint, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, [activeField]: !item[activeField] }),
    })
    if (res.ok) { toast({ title: item[activeField] ? 'Dinonaktifkan' : 'Diaktifkan kembali!' }); load() }
    else toast({ title: 'Gagal', variant: 'destructive' })
  }

  // -- PACKAGE --
  async function savePackage() {
    if (!packageForm.name || !packageForm.price) { toast({ title: 'Nama dan harga wajib diisi', variant: 'destructive' }); return }
    const url = editPackageId ? `/api/packages/${editPackageId}` : '/api/packages'
    const method = editPackageId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(packageForm) })
    toast({ title: editPackageId ? 'Paket diupdate!' : 'Paket ditambahkan!' })
    setShowPackageForm(false); setEditPackageId(null); setInlineEditPkgId(null); setPackageForm({ name: '', category: pkgCategories[0]?.name || '', tier: '', price: 0, pricePerPerson: false, isActive: true, description: '' }); load()
  }

  // -- CATEGORY --
  async function saveCat() {
    if (!catForm.name || !catForm.label) { toast({ title: 'Name dan label wajib diisi', variant: 'destructive' }); return }
    if (editCatId) {
      await fetch(`/api/package-categories/${editCatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) })
    } else {
      const res = await fetch('/api/package-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) })
      if (!res.ok) { const d = await res.json(); toast({ title: d.error || 'Gagal', variant: 'destructive' }); return }
    }
    toast({ title: editCatId ? 'Kategori diupdate!' : 'Kategori ditambahkan!' })
    setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', label: '', perOrang: false, urutan: 0 }); load()
  }

  async function deleteCat(id: string) {
    if (!confirm('Hapus kategori ini?')) return
    await fetch(`/api/package-categories/${id}`, { method: 'DELETE' })
    toast({ title: 'Kategori dihapus' }); load()
  }

  // -- TIER --
  async function saveTier() {
    if (!tierForm.name || !tierForm.label) { toast({ title: 'Name dan label wajib diisi', variant: 'destructive' }); return }
    if (editTierId) {
      await fetch(`/api/package-tiers/${editTierId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tierForm) })
    } else {
      const res = await fetch('/api/package-tiers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tierForm) })
      if (!res.ok) { const d = await res.json(); toast({ title: d.error || 'Gagal', variant: 'destructive' }); return }
    }
    toast({ title: editTierId ? 'Tier diupdate!' : 'Tier ditambahkan!' })
    setShowTierForm(false); setEditTierId(null); setTierForm({ name: '', label: '', urutan: 0 }); load()
  }

  async function deleteTier(id: string) {
    if (!confirm('Hapus tier ini?')) return
    await fetch(`/api/package-tiers/${id}`, { method: 'DELETE' })
    toast({ title: 'Tier dihapus' }); load()
  }

  async function loadPackageOps(packageId: string) {
    const res = await fetch(`/api/biaya-ops?type=package&packageId=${packageId}`)
    if (res.ok) { setTempPackageOps(await res.json()); setEditingPackageId(packageId) }
  }

  async function savePackageOps(packageId: string) {
    await fetch('/api/biaya-ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'package-ops', packageId, items: tempPackageOps.filter(i => i.ukuran) }) })
    toast({ title: 'Biaya ops paket tersimpan!' }); setEditingPackageId(null)
  }

  // -- ADDON --
  async function saveAddon() {
    if (!addonForm.name) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    const url = editAddonId ? `/api/addons/${editAddonId}` : '/api/addons'
    const method = editAddonId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addonForm) })
    toast({ title: editAddonId ? 'Add-on diupdate!' : 'Add-on ditambahkan!' })
    setShowAddonForm(false); setEditAddonId(null); setAddonForm({ name: '', price: 0, isActive: true }); load()
  }

  async function handleAddonDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = addons.findIndex((a: any) => a.id === active.id)
    const newIndex = addons.findIndex((a: any) => a.id === over.id)
    const newOrder = arrayMove(addons, oldIndex, newIndex)
    setAddons(newOrder)
    await fetch('/api/addons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: newOrder.map((a: any, i: number) => ({ id: a.id, urutan: i })) })
    })
  }


  // -- PROMO --
  async function savePromo() {
    if (!promoForm.name || !promoForm.code) { toast({ title: 'Nama dan kode wajib diisi', variant: 'destructive' }); return }
    const url = editPromoId ? `/api/promos/${editPromoId}` : '/api/promos'
    const method = editPromoId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(promoForm) })
    toast({ title: editPromoId ? 'Promo diupdate!' : 'Promo ditambahkan!' })
    setShowPromoForm(false); setEditPromoId(null); setPromoForm({ name: '', code: '', discountType: 'PERCENTAGE', discountValue: 0, isActive: true }); load()
  }

  // -- FOTOGRAFER --
  async function saveFotografer() {
    if (!fotograferForm.name) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    const url = editFotograferId ? `/api/fotografer/${editFotograferId}` : '/api/fotografer'
    const method = editFotograferId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fotograferForm) })
    toast({ title: editFotograferId ? 'Fotografer diupdate!' : 'Fotografer ditambahkan!' })
    setShowFotograferForm(false); setEditFotograferId(null); setFotograferForm({ name: '', phone: '' }); load()
  }

  // -- METODE --
  async function saveMetode() {
    if (!metodeForm.nama) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    if (editMetodeId) {
      await fetch('/api/metode-pembayaran', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editMetodeId, ...metodeForm }) })
    } else {
      await fetch('/api/metode-pembayaran', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metodeForm) })
    }
    toast({ title: editMetodeId ? 'Metode diupdate!' : 'Metode ditambahkan!' })
    setShowMetodeForm(false); setEditMetodeId(null); setMetodeForm({ nama: '', namaBank: '', nomorRekening: '', atasNama: '' }); load()
  }

  // -- STATUS OTS --
  async function saveStatus() {
    if (!statusForm.nama) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    if (editStatusId) {
      await fetch('/api/ots/status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editStatusId, ...statusForm }) })
    } else {
      await fetch('/api/ots/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(statusForm) })
    }
    toast({ title: 'Status tersimpan!' }); setShowStatusForm(false); setEditStatusId(null); setStatusForm({ nama: '', warna: '#3b82f6', urutan: 0 }); load()
  }


  // -- JENIS OTS --
  async function saveJenis() {
    if (!jenisForm.nama) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    if (editJenisId) {
      await fetch(`/api/ots/jenis/${editJenisId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jenisForm) })
      toast({ title: 'Jenis diupdate!' })
    } else {
      const res = await fetch('/api/ots/jenis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jenisForm) })
      if (!res.ok) { const d = await res.json(); toast({ title: d.error || 'Gagal', variant: 'destructive' }); return }
      toast({ title: 'Jenis ditambahkan!' })
    }
    setShowJenisForm(false); setEditJenisId(null); setJenisForm({ nama: '' }); load()
  }

  async function deleteJenis(id: string) {
    if (!confirm('Hapus jenis ini? Paket OTS dengan jenis ini tidak akan terpengaruh.')) return
    await fetch(`/api/ots/jenis/${id}`, { method: 'DELETE' })
    toast({ title: 'Jenis dihapus' }); load()
  }

  // -- OTS PAKET --
  async function saveOtsPaket() {
    if (!otsPaketForm.nama) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    if (!otsPaketForm.jenis) { toast({ title: 'Pilih jenis dulu', variant: 'destructive' }); return }
    const body = { ...otsPaketForm, harga: Number(otsPaketForm.harga) || 0, backgrounds: otsPaketForm.backgrounds.filter(b => b.trim()) }
    const res = editOtsPaketId
      ? await fetch(`/api/ots/paket/${editOtsPaketId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/ots/paket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Gagal menyimpan paket', description: typeof err.error === 'string' ? err.error : JSON.stringify(err.error?.fieldErrors || err.error || ''), variant: 'destructive' })
      return
    }
    toast({ title: 'Paket OTS tersimpan!' }); setShowOtsPaketForm(false); setEditOtsPaketId(null); setOtsPaketForm({ nama: '', jenis: otsJenis[0]?.nama || '', harga: 0, satuan: 'sesi', backgrounds: [''] }); load()
  }

  // -- BIAYA OPS --
  async function saveBiayaOps() {
    if (!biayaOpsForm.ukuran) { toast({ title: 'Ukuran wajib diisi', variant: 'destructive' }); return }
    await fetch('/api/biaya-ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'satuan', ...biayaOpsForm, harga: Number(biayaOpsForm.harga) }) })
    toast({ title: 'Biaya ops ditambahkan!' }); setShowBiayaOpsForm(false); setBiayaOpsForm({ ukuran: '', jenis: 'CETAK', harga: 0 }); load()
  }

  async function deleteBiayaOps(id: string) {
    await fetch(`/api/biaya-ops?id=${id}`, { method: 'DELETE' }); load()
  }

  const ToggleBtn = ({ item, endpoint, activeField = 'isActive' }: { item: any, endpoint: string, activeField?: string }) => (
    <button onClick={() => toggleActive(endpoint, item, activeField)}
      className={`px-2 py-1 text-xs font-medium rounded-lg border transition-colors ${
        item[activeField] ? 'border-red-200 text-red-400 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
      }`}>
      {item[activeField] ? 'Nonaktifkan' : 'Aktifkan'}
    </button>
  )

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Admin" subtitle="Kelola data master aplikasi" />

      <div className="px-5 pb-5">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeTab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* -- PAKET -- */}
        {activeTab === 'packages' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowPackageForm(true); setEditPackageId(null); setPackageForm({ name: '', category: pkgCategories[0]?.name || '', tier: '', price: 0, pricePerPerson: false, isActive: true, description: '' }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Paket</button>
            </div>
            {showPackageForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama Paket*</label>
                    <input value={packageForm.name} onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))} placeholder="Family Premium"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                    <select value={packageForm.category} onChange={e => setPackageForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      {pkgCategories.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                    </select></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Tier</label>
                    <select value={packageForm.tier} onChange={e => setPackageForm(f => ({ ...f, tier: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      <option value="">-- Tidak ada --</option>
                      {pkgTiers.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
                    </select></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Harga (Rp)*</label>
                    <input type="number" value={packageForm.price || 0} onChange={e => setPackageForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={packageForm.pricePerPerson} onChange={e => setPackageForm(f => ({ ...f, pricePerPerson: e.target.checked }))} className="rounded accent-blue-600" />
                    Harga per orang
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={packageForm.isActive} onChange={e => setPackageForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded accent-blue-600" />
                    Aktif
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi (opsional — tampil di invoice)</label>
                  <textarea value={packageForm.description} onChange={e => setPackageForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Contoh: 30 menit sesi foto, 10 file edited, backdrop pilihan..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowPackageForm(false); setEditPackageId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={savePackage} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editPackageId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Kategori','Tier','Harga','Per Orang','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {packages.map((p: any) => (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-gray-50/50 ${!p.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-3"><Badge variant="purple">{p.category}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.tier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3"><Badge variant={p.pricePerPerson ? 'blue' : 'default'}>{p.pricePerPerson ? 'Ya' : 'Tidak'}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={p.isActive ? 'green' : 'default'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => {
                          if (inlineEditPkgId === p.id) {
                            setInlineEditPkgId(null)
                          } else {
                            setInlineEditPkgId(p.id)
                            setEditPackageId(p.id)
                            setPackageForm({ name: p.name, category: p.category, tier: p.tier || '', price: p.price, pricePerPerson: p.pricePerPerson, isActive: p.isActive, description: p.description || '' })
                            setShowPackageForm(false)
                          }
                        }}
                          className={`p-1.5 border rounded-lg transition-colors ${inlineEditPkgId === p.id ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:text-blue-600'}`}><Pencil className="w-3.5 h-3.5" /></button>
                        <ToggleBtn item={p} endpoint={`/api/packages/${p.id}`} />
                      </div></td>
                    </tr>
                    {inlineEditPkgId === p.id && (
                      <tr className="bg-blue-50/60 border-b border-blue-100">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama Paket*</label>
                                <input value={packageForm.name} onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                              <div><label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                                <select value={packageForm.category} onChange={e => setPackageForm(f => ({ ...f, category: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                                  {pkgCategories.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                                </select></div>
                              <div><label className="block text-xs font-medium text-gray-500 mb-1">Tier</label>
                                <select value={packageForm.tier} onChange={e => setPackageForm(f => ({ ...f, tier: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                                  <option value="">-- Tidak ada --</option>
                                  {pkgTiers.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
                                </select></div>
                              <div><label className="block text-xs font-medium text-gray-500 mb-1">Harga (Rp)*</label>
                                <input type="number" value={packageForm.price || 0} onChange={e => setPackageForm(f => ({ ...f, price: Number(e.target.value) }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                            </div>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer text-xs">
                                <input type="checkbox" checked={packageForm.pricePerPerson} onChange={e => setPackageForm(f => ({ ...f, pricePerPerson: e.target.checked }))} className="rounded accent-blue-600" />
                                Harga per orang
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-xs">
                                <input type="checkbox" checked={packageForm.isActive} onChange={e => setPackageForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded accent-blue-600" />
                                Aktif
                              </label>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi (opsional — tampil di invoice)</label>
                              <textarea value={packageForm.description}
                                key={inlineEditPkgId}
                                onChange={e => { setPackageForm(f => ({ ...f, description: e.target.value })); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                                placeholder="Contoh: 30 menit sesi foto, 10 file edited, backdrop pilihan..."
                                rows={1}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white resize-none overflow-hidden"></textarea>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setInlineEditPkgId(null); setEditPackageId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                              <button onClick={savePackage} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">Update Paket</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* -- KATEGORI -- */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Kategori Paket</h3>
                <button onClick={() => { setShowCatForm(true); setEditCatId(null); setCatForm({ name: '', label: '', perOrang: false, urutan: 0 }) }}
                  className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-700">
                  <Plus className="w-3.5 h-3.5" /> Tambah Kategori
                </button>
              </div>
              {showCatForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3 mb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama (key)*</label>
                      <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="WEDDING"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white font-mono uppercase" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Label (tampilan)*</label>
                      <input value={catForm.label} onChange={e => setCatForm(f => ({ ...f, label: e.target.value }))} placeholder="Wedding"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Urutan</label>
                      <input type="number" value={catForm.urutan || 0} onChange={e => setCatForm(f => ({ ...f, urutan: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white" /></div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input type="checkbox" checked={catForm.perOrang} onChange={e => setCatForm(f => ({ ...f, perOrang: e.target.checked }))} className="rounded accent-purple-600" />
                        Harga per orang
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowCatForm(false); setEditCatId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                    <button onClick={saveCat} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold">{editCatId ? 'Update' : 'Tambah'}</button>
                  </div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {['Nama','Label','Per Orang','Urutan','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {pkgCategories.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-mono font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-sm">{c.label}</td>
                        <td className="px-4 py-3"><Badge variant={c.perOrang ? 'blue' : 'default'}>{c.perOrang ? 'Ya' : 'Tidak'}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.urutan}</td>
                        <td className="px-4 py-3"><div className="flex gap-1">
                          <button onClick={() => { setEditCatId(c.id); setCatForm({ name: c.name, label: c.label, perOrang: c.perOrang, urutan: c.urutan }); setShowCatForm(true) }}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteCat(c.id)}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* -- TIER -- */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Tier Paket</h3>
                <button onClick={() => { setShowTierForm(true); setEditTierId(null); setTierForm({ name: '', label: '', urutan: 0 }) }}
                  className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-600">
                  <Plus className="w-3.5 h-3.5" /> Tambah Tier
                </button>
              </div>
              {showTierForm && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3 mb-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama (key)*</label>
                      <input value={tierForm.name} onChange={e => setTierForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="GOLD"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white font-mono uppercase" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Label*</label>
                      <input value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} placeholder="Gold"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Urutan</label>
                      <input type="number" value={tierForm.urutan || 0} onChange={e => setTierForm(f => ({ ...f, urutan: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowTierForm(false); setEditTierId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                    <button onClick={saveTier} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold">{editTierId ? 'Update' : 'Tambah'}</button>
                  </div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {['Nama','Label','Urutan','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {pkgTiers.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-mono font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-sm">{t.label}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{t.urutan}</td>
                        <td className="px-4 py-3"><div className="flex gap-1">
                          <button onClick={() => { setEditTierId(t.id); setTierForm({ name: t.name, label: t.label, urutan: t.urutan }); setShowTierForm(true) }}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTier(t.id)}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -- ADD-ON -- */}
        {activeTab === 'addons' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Drag <GripVertical className="inline w-3 h-3" /> untuk mengatur urutan tampil di kasir</p>
              <button onClick={() => { setShowAddonForm(true); setEditAddonId(null); setAddonForm({ name: '', price: 0, isActive: true }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Add-On</button>
            </div>
            {showAddonForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={addonForm.name} onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))} placeholder="Album Foto"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Harga (Rp)</label>
                    <input type="number" value={addonForm.price || 0} onChange={e => setAddonForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddonForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveAddon} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editAddonId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleAddonDragEnd}>
                <SortableContext items={addons.map((a: any) => a.id)} strategy={verticalListSortingStrategy}>
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-8" />
                      {['Nama','Harga','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {addons.map((a: any) => (
                        <SortableAddonRow key={a.id} addon={a}
                          onEdit={(a) => { setEditAddonId(a.id); setAddonForm({ name: a.name, price: a.price, isActive: a.isActive }); setShowAddonForm(true) }}
                          onDelete={(id) => deleteItem('addons', id)} />
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* -- PROMO -- */}
        {activeTab === 'promos' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowPromoForm(true); setEditPromoId(null); setPromoForm({ name: '', code: '', discountType: 'PERCENTAGE', discountValue: 0, isActive: true }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Promo</button>
            </div>
            {showPromoForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} placeholder="Promo Lebaran"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Kode*</label>
                    <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="LEBARAN50"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white font-mono" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipe Diskon</label>
                    <select value={promoForm.discountType} onChange={e => setPromoForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      <option value="PERCENTAGE">Persen (%)</option>
                      <option value="FIXED">Nominal (Rp)</option>
                    </select></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nilai</label>
                    <input type="number" value={promoForm.discountValue || 0} onChange={e => setPromoForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPromoForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={savePromo} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editPromoId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Kode','Tipe','Nilai','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {promos.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-gray-50/50 ${!p.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-blue-600">{p.code}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.discountType === 'PERCENTAGE' ? 'Persen' : 'Nominal'}</td>
                      <td className="px-4 py-3 text-sm">{p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : formatRupiah(p.discountValue)}</td>
                      <td className="px-4 py-3"><Badge variant={p.isActive ? 'green' : 'default'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditPromoId(p.id); setPromoForm({ name: p.name, code: p.code, discountType: p.discountType, discountValue: p.discountValue, isActive: p.isActive }); setShowPromoForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <ToggleBtn item={p} endpoint={`/api/promos/${p.id}`} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -- FOTOGRAFER -- */}
        {activeTab === 'fotografer' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowFotograferForm(true); setEditFotograferId(null); setFotograferForm({ name: '', phone: '' }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Fotografer</button>
            </div>
            {showFotograferForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={fotograferForm.name} onChange={e => setFotograferForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama fotografer"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">No. HP</label>
                    <input value={fotograferForm.phone} onChange={e => setFotograferForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFotograferForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveFotografer} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editFotograferId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','No. HP','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {fotografers.map((f: any) => (
                    <tr key={f.id} className={`hover:bg-gray-50/50 ${!f.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{f.phone || '-'}</td>
                      <td className="px-4 py-3"><Badge variant={f.isActive ? 'green' : 'default'}>{f.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditFotograferId(f.id); setFotograferForm({ name: f.name, phone: f.phone || '' }); setShowFotograferForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <ToggleBtn item={f} endpoint={`/api/fotografer/${f.id}`} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -- METODE BAYAR -- */}
        {activeTab === 'metode' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowMetodeForm(true); setEditMetodeId(null); setMetodeForm({ nama: '', namaBank: '', nomorRekening: '', atasNama: '' }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Metode</button>
            </div>
            {showMetodeForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama Metode*</label>
                    <input value={metodeForm.nama} onChange={e => setMetodeForm(f => ({ ...f, nama: e.target.value }))} placeholder="Transfer BCA"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank</label>
                    <input value={metodeForm.namaBank} onChange={e => setMetodeForm(f => ({ ...f, namaBank: e.target.value }))} placeholder="BCA"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nomor Rekening</label>
                    <input value={metodeForm.nomorRekening} onChange={e => setMetodeForm(f => ({ ...f, nomorRekening: e.target.value }))} placeholder="1234567890"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white font-mono" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Atas Nama</label>
                    <input value={metodeForm.atasNama} onChange={e => setMetodeForm(f => ({ ...f, atasNama: e.target.value }))} placeholder="Nama pemilik"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowMetodeForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveMetode} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editMetodeId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Bank','No. Rekening','A.N.','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {metodes.map((m: any) => (
                    <tr key={m.id} className={`hover:bg-gray-50/50 ${!m.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">{m.nama}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.namaBank || '-'}</td>
                      <td className="px-4 py-3 text-xs font-mono">{m.nomorRekening || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.atasNama || '-'}</td>
                      <td className="px-4 py-3"><Badge variant={m.isActive ? 'green' : 'default'}>{m.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditMetodeId(m.id); setMetodeForm({ nama: m.nama, namaBank: m.namaBank || '', nomorRekening: m.nomorRekening || '', atasNama: m.atasNama || '' }); setShowMetodeForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <ToggleBtn item={m} endpoint="/api/metode-pembayaran" />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* -- JENIS OTS -- */}
        {activeTab === 'ots-jenis' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowJenisForm(true); setEditJenisId(null); setJenisForm({ nama: '' }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Jenis</button>
            </div>
            {showJenisForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama Jenis*</label>
                  <input value={jenisForm.nama} onChange={e => setJenisForm(f => ({ ...f, nama: e.target.value }))} placeholder="contoh: Pasfoto, Cetak, Wisuda"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowJenisForm(false); setEditJenisId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveJenis} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editJenisId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama Jenis','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {otsJenis.map((j: any) => (
                    <tr key={j.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium">{j.nama}</td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditJenisId(j.id); setJenisForm({ nama: j.nama }); setShowJenisForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteJenis(j.id)}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {otsJenis.length === 0 && (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-xs text-gray-400">Belum ada jenis. Tambah dulu sebelum membuat Paket OTS.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -- STATUS OTS -- */}
        {activeTab === 'ots-status' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowStatusForm(true); setEditStatusId(null); setStatusForm({ nama: '', warna: '#3b82f6', urutan: 0 }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Status</button>
            </div>
            {showStatusForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={statusForm.nama} onChange={e => setStatusForm(f => ({ ...f, nama: e.target.value }))} placeholder="Antrian"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Warna</label>
                    <input type="color" value={statusForm.warna} onChange={e => setStatusForm(f => ({ ...f, warna: e.target.value }))}
                      className="w-full h-9 border border-gray-200 rounded-lg cursor-pointer" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Urutan</label>
                    <input type="number" value={statusForm.urutan} onChange={e => setStatusForm(f => ({ ...f, urutan: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowStatusForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveStatus} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editStatusId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Warna','Urutan','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {otsStatuses.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium">{s.nama}</td>
                      <td className="px-4 py-3"><div className="w-6 h-6 rounded-full border border-gray-200" style={{ background: s.warna }} /></td>
                      <td className="px-4 py-3 text-sm">{s.urutan}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setEditStatusId(s.id); setStatusForm({ nama: s.nama, warna: s.warna, urutan: s.urutan }); setShowStatusForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -- PAKET OTS -- */}
        {activeTab === 'ots-paket' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowOtsPaketForm(true); setEditOtsPaketId(null); setOtsPaketForm({ nama: '', jenis: otsJenis[0]?.nama || '', harga: 0, satuan: 'sesi', backgrounds: [''] }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah Paket OTS</button>
            </div>
            {showOtsPaketForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={otsPaketForm.nama} onChange={e => setOtsPaketForm(f => ({ ...f, nama: e.target.value }))} placeholder="Pasfoto 4x6"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Jenis</label>
                    <select value={otsPaketForm.jenis} onChange={e => setOtsPaketForm(f => ({ ...f, jenis: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      <option value="">-- Pilih Jenis --</option>
                      {otsJenis.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}
                    </select></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Harga (Rp)</label>
                    <input type="number" value={otsPaketForm.harga || 0} onChange={e => setOtsPaketForm(f => ({ ...f, harga: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Satuan</label>
                    <input value={otsPaketForm.satuan} onChange={e => setOtsPaketForm(f => ({ ...f, satuan: e.target.value }))} placeholder="lembar / sesi"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Background</label>
                  {otsPaketForm.backgrounds.map((bg, idx) => (
                    <div key={idx} className="flex gap-2 mb-1.5">
                      <input value={bg} onChange={e => setOtsPaketForm(f => ({ ...f, backgrounds: f.backgrounds.map((b, i) => i === idx ? e.target.value : b) }))} placeholder={`Background ${idx + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" />
                      {idx > 0 && <button onClick={() => setOtsPaketForm(f => ({ ...f, backgrounds: f.backgrounds.filter((_, i) => i !== idx) }))} className="text-red-400 text-xs">x</button>}
                    </div>
                  ))}
                  <button onClick={() => setOtsPaketForm(f => ({ ...f, backgrounds: [...f.backgrounds, ''] }))} className="text-xs text-blue-600">+ Tambah background</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowOtsPaketForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveOtsPaket} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editOtsPaketId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Jenis','Harga','Satuan','Background','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {otsPakets.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-gray-50/50 ${!p.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium">{p.nama}</td>
                      <td className="px-4 py-3"><Badge variant="purple">{p.jenis}</Badge></td>
                      <td className="px-4 py-3 text-sm">{formatRupiah(p.harga)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">/{p.satuan}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.backgrounds?.length || 0} bg</td>
                      <td className="px-4 py-3"><Badge variant={p.isActive ? 'green' : 'default'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditOtsPaketId(p.id); setOtsPaketForm({ nama: p.nama, jenis: p.jenis, harga: p.harga, satuan: p.satuan, backgrounds: p.backgrounds?.map((b: any) => b.nama) || [''] }); setShowOtsPaketForm(true) }}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <ToggleBtn item={p} endpoint={`/api/ots/paket/${p.id}`} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -- BIAYA OPS -- */}
        {activeTab === 'biaya-ops' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Daftar Harga Satuan</h3>
                  <button onClick={() => setShowBiayaOpsForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah</button>
                </div>
                {showBiayaOpsForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Ukuran*</label>
                        <input value={biayaOpsForm.ukuran} onChange={e => setBiayaOpsForm(f => ({ ...f, ukuran: e.target.value }))} placeholder="10RS"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Jenis</label>
                        <select value={biayaOpsForm.jenis} onChange={e => setBiayaOpsForm(f => ({ ...f, jenis: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white">
                          <option value="CETAK">Cetak</option>
                          <option value="PIGURA">Pigura</option>
                        </select></div>
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Harga</label>
                        <input type="number" value={biayaOpsForm.harga || 0} onChange={e => setBiayaOpsForm(f => ({ ...f, harga: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowBiayaOpsForm(false)} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                      <button onClick={saveBiayaOps} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">Tambah</button>
                    </div>
                  </div>
                )}
                {['CETAK', 'PIGURA'].map(jenis => (
                  <div key={jenis} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className={`px-4 py-2.5 border-b text-xs font-bold uppercase tracking-wide ${jenis === 'CETAK' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      {jenis === 'CETAK' ? 'Cetak' : 'Pigura / Frame'}
                    </div>
                    <table className="w-full">
                      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left text-xs text-gray-400">Ukuran</th><th className="px-3 py-2 text-right text-xs text-gray-400">Harga/pcs</th><th className="px-3 py-2 w-8"></th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {biayaOpsSatuan.filter(b => b.jenis === jenis).map((b: any) => (
                          <tr key={b.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-sm font-medium">{b.ukuran}</td>
                            <td className="px-3 py-2 text-sm text-right font-semibold">{formatRupiah(b.harga)}</td>
                            <td className="px-3 py-2"><button onClick={() => deleteBiayaOps(b.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                        {biayaOpsSatuan.filter(b => b.jenis === jenis).length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-xs text-gray-400 text-center">Belum ada data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Biaya Ops per Paket</h3>
                <p className="text-xs text-gray-400">Klik paket untuk set biaya ops yang include.</p>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                  {packages.filter(p => p.isActive).map((p: any) => (
                    <div key={p.id} className="border-b border-gray-50 last:border-0">
                      <button onClick={() => editingPackageId === p.id ? setEditingPackageId(null) : loadPackageOps(p.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.category}{p.tier ? ` - ${p.tier}` : ''}</div>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">{editingPackageId === p.id ? '^' : 'v'}</div>
                      </button>
                      {editingPackageId === p.id && (
                        <div className="px-4 pb-4 bg-blue-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Include:</span>
                            <button onClick={() => setTempPackageOps(prev => [...prev, { ukuran: '', jenis: 'CETAK', jumlah: 1 }])} className="text-xs text-blue-600">+ Tambah</button>
                          </div>
                          {tempPackageOps.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_1fr_60px_auto] gap-2 items-center">
                              <select value={item.ukuran} onChange={e => setTempPackageOps(prev => prev.map((it, i) => i === idx ? { ...it, ukuran: e.target.value } : it))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
                                <option value="">-- Ukuran --</option>
                                {biayaOpsSatuan.filter(b => b.jenis === item.jenis).map((b: any) => <option key={b.id} value={b.ukuran}>{b.ukuran} - {formatRupiah(b.harga)}</option>)}
                              </select>
                              <select value={item.jenis} onChange={e => setTempPackageOps(prev => prev.map((it, i) => i === idx ? { ...it, jenis: e.target.value, ukuran: '' } : it))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
                                <option value="CETAK">Cetak</option>
                                <option value="PIGURA">Pigura</option>
                              </select>
                              <input type="number" value={item.jumlah} min="1" onChange={e => setTempPackageOps(prev => prev.map((it, i) => i === idx ? { ...it, jumlah: parseInt(e.target.value) || 1 } : it))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 text-center" />
                              <button onClick={() => setTempPackageOps(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          {tempPackageOps.length === 0 && <div className="text-xs text-gray-400 italic">Tidak ada biaya ops</div>}
                          <button onClick={() => savePackageOps(p.id)} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-full justify-center mt-2">
                            <Save className="w-3 h-3" /> Simpan
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
