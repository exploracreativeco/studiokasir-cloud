'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Users, Building2, TrendingUp, Settings, X, ChevronDown, ChevronRight, BarChart2, Save, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatRupiah } from '@/lib/utils'

type Tab = 'gaji-team' | 'studio-profil' | 'investor' | 'setting'
const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

type StudioProfil = { id: string; nama: string; alamat?: string; noHp?: string; rekening?: string; isDefault: boolean }
type JobItem = { namaJob: string; nominal: number; auto?: boolean }
type KaryawanGaji = {
  id: string; nama: string; posisi: string; unitStudio?: string; studioProfilId?: string
  rateJam: number; rateLembur: number; insentifPersen: number; basisInsentif: string
  fotograferId?: string; aktif: boolean; punyaInsentif: boolean; jobTambahan: JobItem[]
}
type GajiRecord = {
  id?: string; karyawanId: string; bulan: number; tahun: number
  jamNormal: number; hariKerja: number; jamLembur: number
  jamKerjaTertentuJam: number; jamKerjaTertentuRate: number
  omzetInsentif: number; jobTambahan: string
  totalGajiPokok: number; totalLembur: number; totalKerjaTertentu: number
  totalInsentif: number; totalJobTambahan: number; totalGaji: number
  status: string; catatan?: string
}
type Investor = { id: string; nama: string; modal: number; skemaFlat: number; skemaPersen: number; aktif: boolean; laporan: any[] }
type ManajemenSetting = { ownerNama?: string; ownerJabatan?: string; pernyataanKepatuhan?: string }

const TABS = [
  { id: 'gaji-team', label: 'Gaji Team', icon: Users },
  { id: 'studio-profil', label: 'Profil Studio', icon: Building2 },
  { id: 'investor', label: 'Investor', icon: TrendingUp },
  { id: 'setting', label: 'Settings', icon: Settings },
] as const

function emptyRecord(karyawanId: string, bulan: number, tahun: number, k?: KaryawanGaji): GajiRecord {
  return {
    karyawanId, bulan, tahun,
    jamNormal: 8, hariKerja: 25, jamLembur: 0,
    jamKerjaTertentuJam: 0, jamKerjaTertentuRate: 0,
    omzetInsentif: 0,
    jobTambahan: JSON.stringify(k?.jobTambahan || []),
    totalGajiPokok: 0, totalLembur: 0, totalKerjaTertentu: 0,
    totalInsentif: 0, totalJobTambahan: 0, totalGaji: 0,
    status: 'DRAFT'
  }
}

function calcRecord(r: GajiRecord, k: KaryawanGaji): GajiRecord {
  const gajiPokok = k.rateJam * r.jamNormal * r.hariKerja
  const lembur = k.rateLembur * r.jamLembur
  const tertentu = r.jamKerjaTertentuRate * r.jamKerjaTertentuJam
  const insentif = Math.round(r.omzetInsentif * k.insentifPersen / 100)
  const jobs: JobItem[] = (() => { try { return JSON.parse(r.jobTambahan || '[]') } catch { return [] } })()
  const jobTotal = jobs.reduce((s, j) => s + j.nominal, 0)
  return { ...r, totalGajiPokok: gajiPokok, totalLembur: lembur, totalKerjaTertentu: tertentu, totalInsentif: insentif, totalJobTambahan: jobTotal, totalGaji: gajiPokok + lembur + tertentu + insentif + jobTotal }
}

export default function ManajemenPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('gaji-team')
  const [studios, setStudios] = useState<StudioProfil[]>([])
  const [karyawans, setKaryawans] = useState<KaryawanGaji[]>([])
  const [investors, setInvestors] = useState<Investor[]>([])
  const [setting, setSetting] = useState<ManajemenSetting>({})

  // Gaji Team
  const [gajiViewMode, setGajiViewMode] = useState<'bulan' | 'karyawan'>('bulan')
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth())
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear())
  const [gajiRows, setGajiRows] = useState<Record<string, GajiRecord>>({}) // karyawanId -> record
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoInfo, setAutoInfo] = useState('')
  const [autoEmails, setAutoEmails] = useState<Record<string, string | null>>({}) // karyawanId -> email
  const [slipModal, setSlipModal] = useState<{ mode: 'satu' | 'semua'; karyawanId?: string } | null>(null)
  const [editingCell, setEditingCell] = useState<{karyawanId: string; field: string} | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loadingGaji, setLoadingGaji] = useState(false)

  // Rekap per karyawan
  const [expandedKaryawan, setExpandedKaryawan] = useState<string | null>(null)
  const [karyawanRecords, setKaryawanRecords] = useState<Record<string, GajiRecord[]>>({})

  // Forms
  const [showStudioForm, setShowStudioForm] = useState(false)
  const [editStudio, setEditStudio] = useState<StudioProfil | null>(null)
  const [studioForm, setStudioForm] = useState({ nama: '', alamat: '', noHp: '', rekening: '', isDefault: false })

  const [showKaryawanForm, setShowKaryawanForm] = useState(false)
  const [editKaryawan, setEditKaryawan] = useState<KaryawanGaji | null>(null)
  const [karyawanForm, setKaryawanForm] = useState({ nama: '', posisi: '', unitStudio: '', studioProfilId: '', rateJam: 10000, rateLembur: 20000, insentifPersen: 0, basisInsentif: 'KESELURUHAN', fotograferId: '', aktif: true, punyaInsentif: false, jobTambahan: [] as JobItem[] })

  const [showInvestorForm, setShowInvestorForm] = useState(false)
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null)
  const [investorForm, setInvestorForm] = useState({ nama: '', modal: 0, skemaFlat: 0, skemaPersen: 0, aktif: true })
  const [fotografers, setFotografers] = useState<{id:string;name:string}[]>([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [savingSetting, setSavingSetting] = useState(false)

  async function loadAll() {
    const [s, k, i, st, f] = await Promise.all([
      fetch('/api/manajemen/studio-profil').then(r => r.json()),
      fetch('/api/manajemen/karyawan').then(r => r.json()),
      fetch('/api/manajemen/investor').then(r => r.json()),
      fetch('/api/manajemen/setting').then(r => r.json()),
      fetch('/api/fotografer').then(r => r.json()),
    ])
    setStudios(Array.isArray(s) ? s : [])
    setKaryawans(Array.isArray(k) ? k : [])
    setInvestors(Array.isArray(i) ? i.filter((x: any) => x.nama !== '__UMUM__') : [])
    setSetting(st || {})
    setFotografers(Array.isArray(f) ? f : [])
  }

  useEffect(() => { loadAll() }, [])

  // Load gaji rows untuk bulan tertentu
  async function loadGajiBulan(bulan: number, tahun: number, karyawanList: KaryawanGaji[]) {
    setLoadingGaji(true)
    const rows: Record<string, GajiRecord> = {}
    await Promise.all(karyawanList.filter(k => k.aktif).map(async k => {
      const res = await fetch(`/api/manajemen/gaji-record?karyawanId=${k.id}`)
      const data = await res.json()
      const record = Array.isArray(data) ? data.find((r: GajiRecord) => r.bulan === bulan + 1 && r.tahun === tahun) : null
      rows[k.id] = record || emptyRecord(k.id, bulan + 1, tahun, k)
    }))
    setGajiRows(rows)
    setLoadingGaji(false)
  }

  useEffect(() => {
    if (karyawans.length > 0 && tab === 'gaji-team') {
      loadGajiBulan(selectedBulan, selectedTahun, karyawans)
    }
  }, [selectedBulan, selectedTahun, karyawans, tab])

  // Update field di gajiRows
  function updateGajiField(karyawanId: string, field: string, value: any) {
    setGajiRows(prev => {
      const k = karyawans.find(x => x.id === karyawanId)
      if (!k) return prev
      const updated = { ...prev[karyawanId], [field]: value }
      return { ...prev, [karyawanId]: calcRecord(updated, k) }
    })
  }

  // Save single row
  async function saveGajiRow(karyawanId: string) {
    const record = gajiRows[karyawanId]
    if (!record) return
    setSaving(prev => ({ ...prev, [karyawanId]: true }))
    const method = record.id ? 'PUT' : 'POST'
    const res = await fetch('/api/manajemen/gaji-record', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    })
    if (res.ok) {
      const data = await res.json()
      setGajiRows(prev => ({ ...prev, [karyawanId]: data }))
      toast({ title: `Data ${karyawans.find(k => k.id === karyawanId)?.nama} disimpan!` })
    }
    setSaving(prev => ({ ...prev, [karyawanId]: false }))
  }

  // Save all rows
  async function saveAllGaji() {
    const aktifKaryawans = karyawans.filter(k => k.aktif)
    await Promise.all(aktifKaryawans.map(k => saveGajiRow(k.id)))
    toast({ title: 'Semua data gaji disimpan!' })
  }

  // ⚡ Tarik Otomatis: honor event + bonus absen → job tambahan (flag auto)
  // Item manual dipertahankan; item auto lama diganti hasil tarikan baru.
  async function tarikOtomatis() {
    setAutoLoading(true); setAutoInfo('')
    try {
      const res = await fetch(`/api/manajemen/gaji-auto?bulan=${bulan}&tahun=${tahun}`)
      const data = await res.json()
      if (!res.ok) { setAutoInfo(data.error || 'Gagal menarik data'); setAutoLoading(false); return }
      const aktifK = karyawans.filter(k => k.aktif)
      const emails: Record<string, string | null> = {}
      for (const k of aktifK) emails[k.id] = data.results?.[k.id]?.email || null
      setAutoEmails(emails)
      let applied = 0
      setGajiRows(prev => {
        const next = { ...prev }
        for (const k of aktifK) {
          const hasil = data.results?.[k.id]
          if (!hasil) continue
          const r = next[k.id] || emptyRecord(k.id, bulan, tahun, k)
          let jobs: JobItem[] = []
          try { jobs = JSON.parse(r.jobTambahan || '[]') } catch {}
          const manual = jobs.filter(j => !j.auto)
          const merged = [...manual, ...(hasil.items || [])]
          if ((hasil.items || []).length > 0) applied++
          // Jam & hari kerja otomatis dari Jadwal Shift (kalau ada datanya)
          const patch: any = { jobTambahan: JSON.stringify(merged) }
          if (hasil.shiftHari > 0) {
            patch.hariKerja = hasil.shiftHari
            patch.jamNormal = Math.round((hasil.shiftJam / hasil.shiftHari) * 10) / 10
          }
          next[k.id] = calcRecord({ ...r, ...patch }, k)
        }
        return next
      })
      const un = (data.unlinked || []).length
      setAutoInfo(`✓ ${applied} karyawan dapat komponen otomatis${un ? ` · nama tidak cocok akun: ${data.unlinked.join(', ')}` : ''}. Jangan lupa Simpan Semua.`)
    } catch { setAutoInfo('Gagal menarik data') }
    setAutoLoading(false)
  }

  // ============ SLIP GAJI: rakit teks, kirim email / WA ============
  const BULAN_NAMA = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  function buildSlipText(k: KaryawanGaji, r: GajiRecord) {
    const jobs: JobItem[] = (() => { try { return JSON.parse(r.jobTambahan || '[]') } catch { return [] } })()
    const lines = [
      `SLIP GAJI — ${BULAN_NAMA[bulan - 1]} ${tahun}`,
      `${k.nama} (${k.posisi})`,
      '─'.repeat(28),
      `Gaji Pokok (${r.jamNormal} jam × ${r.hariKerja} hari): ${formatRupiah(r.totalGajiPokok)}`,
      ...(r.totalLembur > 0 ? [`Lembur (${r.jamLembur} jam): ${formatRupiah(r.totalLembur)}`] : []),
      ...(r.totalKerjaTertentu > 0 ? [`Kerja Tertentu: ${formatRupiah(r.totalKerjaTertentu)}`] : []),
      ...(r.totalInsentif > 0 ? [`Insentif: ${formatRupiah(r.totalInsentif)}`] : []),
      ...(jobs.length > 0 ? ['Job Tambahan:', ...jobs.map(j => `  • ${j.namaJob}: ${formatRupiah(j.nominal)}`)] : []),
      '─'.repeat(28),
      `TOTAL: ${formatRupiah(r.totalGaji)}`,
      '',
      'Terima kasih atas kerja kerasnya! 🙏',
      '— Explora Creative',
    ]
    return lines.join('\n')
  }

  async function kirimSlipEmail(k: KaryawanGaji, customText?: string): Promise<string | null> {
    const r = gajiRows[k.id]
    if (!r) return `${k.nama}: belum ada data gaji`
    const to = autoEmails[k.id]
    if (!to) return `${k.nama}: email tidak ditemukan (klik Tarik Otomatis dulu / samakan nama dengan akun)`
    const res = await fetch('/api/manajemen/gaji-slip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject: `Slip Gaji ${BULAN_NAMA[bulan - 1]} ${tahun} — ${k.nama}`, text: customText || buildSlipText(k, r) }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); return `${k.nama}: ${d.error || 'gagal'}` }
    return null
  }

  function kirimSlipWA(k: KaryawanGaji) {
    const r = gajiRows[k.id]
    if (!r) { toast({ title: 'Belum ada data gaji bulan ini', variant: 'destructive' }); return }
    window.open('https://wa.me/?text=' + encodeURIComponent(buildSlipText(k, r)), '_blank')
  }

  // Load rekap per karyawan
  async function loadKaryawanRecords(karyawanId: string) {
    const res = await fetch(`/api/manajemen/gaji-record?karyawanId=${karyawanId}`)
    const data = await res.json()
    setKaryawanRecords(prev => ({ ...prev, [karyawanId]: Array.isArray(data) ? data : [] }))
  }

  function toggleExpand(id: string) {
    if (expandedKaryawan === id) setExpandedKaryawan(null)
    else { setExpandedKaryawan(id); loadKaryawanRecords(id) }
  }

  // CRUD helpers
  async function uploadLogo(studioId: string, file: File) {
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('logo', file)
    fd.append('studioId', studioId)
    const res = await fetch('/api/manajemen/upload-logo', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) { toast({ title: 'Logo berhasil diupload!' }); loadAll() }
    else toast({ title: data.error || 'Gagal upload', variant: 'destructive' })
    setUploadingLogo(false)
  }

  async function saveStudio() {
    if (!studioForm.nama) { toast({ title: 'Nama studio wajib', variant: 'destructive' }); return }
    const body = editStudio ? { id: editStudio.id, ...studioForm } : studioForm
    const res = await fetch('/api/manajemen/studio-profil', { method: editStudio ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast({ title: 'Studio disimpan!' }); loadAll(); setShowStudioForm(false); setEditStudio(null) }
  }

  async function deleteStudio(id: string) {
    if (!confirm('Hapus profil studio?')) return
    await fetch('/api/manajemen/studio-profil', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast({ title: 'Studio dihapus' }); loadAll()
  }

  async function saveKaryawan() {
    if (!karyawanForm.nama) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    const body = editKaryawan ? { id: editKaryawan.id, ...karyawanForm } : karyawanForm
    const res = await fetch('/api/manajemen/karyawan', { method: editKaryawan ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast({ title: 'Karyawan disimpan!' }); loadAll(); setShowKaryawanForm(false); setEditKaryawan(null) }
  }

  async function deleteKaryawan(id: string) {
    if (!confirm('Hapus karyawan ini?')) return
    await fetch('/api/manajemen/karyawan', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast({ title: 'Karyawan dihapus' }); loadAll()
  }

  async function saveInvestor() {
    if (!investorForm.nama) { toast({ title: 'Nama wajib', variant: 'destructive' }); return }
    const body = editInvestor ? { id: editInvestor.id, ...investorForm } : investorForm
    const res = await fetch('/api/manajemen/investor', { method: editInvestor ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast({ title: 'Investor disimpan!' }); loadAll(); setShowInvestorForm(false); setEditInvestor(null) }
  }

  async function deleteInvestor(id: string) {
    if (!confirm('Hapus investor?')) return
    await fetch('/api/manajemen/investor', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast({ title: 'Investor dihapus' }); loadAll()
  }

  async function saveSetting() {
    setSavingSetting(true)
    await fetch('/api/manajemen/setting', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(setting) })
    toast({ title: 'Settings disimpan!' }); setSavingSetting(false)
  }

  const aktifKaryawans = karyawans.filter(k => k.aktif)

  // Rekap tahunan
  function getRekapTahunan(karyawanId: string, tahun: number) {
    const records = karyawanRecords[karyawanId]?.filter(r => r.tahun === tahun) || []
    return {
      totalGajiPokok: records.reduce((s, r) => s + r.totalGajiPokok, 0),
      totalLembur: records.reduce((s, r) => s + r.totalLembur, 0),
      totalKerjaTertentu: records.reduce((s, r) => s + (r.totalKerjaTertentu || 0), 0),
      totalInsentif: records.reduce((s, r) => s + r.totalInsentif, 0),
      totalJobTambahan: records.reduce((s, r) => s + r.totalJobTambahan, 0),
      totalGaji: records.reduce((s, r) => s + r.totalGaji, 0),
      bulanAktif: records.length,
    }
  }

  // Inline input cell
  function NumCell({ karyawanId, field, value, small }: { karyawanId: string; field: string; value: number; small?: boolean }) {
    const isEditing = editingCell?.karyawanId === karyawanId && editingCell?.field === field
    return isEditing ? (
      <input type="number" autoFocus defaultValue={value} step="0.1"
        onBlur={e => { updateGajiField(karyawanId, field, Number(e.target.value)); setEditingCell(null) }}
        onKeyDown={e => { if (e.key === 'Enter') { updateGajiField(karyawanId, field, Number((e.target as HTMLInputElement).value)); setEditingCell(null) } if (e.key === 'Escape') setEditingCell(null) }}
        className={`${small ? 'w-14' : 'w-20'} border border-blue-400 rounded px-1.5 py-1 text-xs text-center outline-none bg-blue-50`} />
    ) : (
      <div onClick={() => setEditingCell({ karyawanId, field })}
        className="text-xs text-center cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1 py-1 transition-colors min-w-[32px]">
        {value || '—'}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Manajemen</h1>
            <p className="text-xs text-gray-400">Kelola tim, studio, investor, dan konfigurasi</p>
          </div>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id as Tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* ══ GAJI TEAM ══ */}
        {tab === 'gaji-team' && (
          <div className="space-y-4">
            {/* Sub-tab */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setGajiViewMode('bulan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${gajiViewMode === 'bulan' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Per Bulan
                </button>
                <button onClick={() => setGajiViewMode('karyawan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${gajiViewMode === 'karyawan' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Per Karyawan
                </button>
              </div>
              <button onClick={() => { setEditKaryawan(null); setKaryawanForm({ nama: '', posisi: '', unitStudio: '', studioProfilId: '', rateJam: 10000, rateLembur: 20000, insentifPersen: 0, basisInsentif: 'KESELURUHAN', fotograferId: '', aktif: true, punyaInsentif: false, jobTambahan: [] }); setShowKaryawanForm(true) }}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-800">
                <Plus className="w-3.5 h-3.5" /> Tambah Karyawan
              </button>
            </div>

            {/* VIEW: PER BULAN */}
            {gajiViewMode === 'bulan' && (
              <div className="space-y-3">
                {/* Kontrol bulan */}
                <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Bulan:</label>
                    <select value={selectedBulan} onChange={e => setSelectedBulan(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none bg-white focus:border-gray-400">
                      {BULAN_FULL.map((b, i) => <option key={i} value={i}>{b}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Tahun:</label>
                    <input type="number" value={selectedTahun} onChange={e => setSelectedTahun(Number(e.target.value))}
                      className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <button onClick={() => loadGajiBulan(selectedBulan, selectedTahun, karyawans)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700 hover:border-gray-300">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">{aktifKaryawans.length} karyawan aktif</span>
                    <button onClick={tarikOtomatis} disabled={autoLoading}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                      ⚡ {autoLoading ? 'Menarik…' : 'Tarik Otomatis'}
                    </button>
                    <button onClick={() => setSlipModal({ mode: 'semua' })}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg mr-2">
                      📧 Kirim Semua Slip
                    </button>
                    <button onClick={saveAllGaji} className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-800">
                      <Save className="w-3.5 h-3.5" /> Simpan Semua
                    </button>
                    {autoInfo && <span className="text-[11px] text-amber-700 self-center max-w-md">{autoInfo}</span>}
                  </div>
                </div>

                {/* Tabel gaji */}
                {aktifKaryawans.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">Belum ada karyawan aktif</div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 w-48 sticky left-0 bg-white">Karyawan</th>
                          {/* Jam Normal */}
                          <th className="text-center px-2 py-2 font-semibold text-gray-500 bg-gray-50 border-l border-gray-100" colSpan={3}>Jam Normal</th>
                          {/* Jam Tertentu */}
                          <th className="text-center px-2 py-2 font-semibold text-gray-500 bg-blue-50 border-l border-gray-100" colSpan={3}>Jam Tertentu</th>
                          {/* Lembur */}
                          <th className="text-center px-2 py-2 font-semibold text-gray-500 bg-amber-50 border-l border-gray-100" colSpan={2}>Lembur</th>
                          {/* Insentif */}
                          <th className="text-center px-2 py-2 font-semibold text-gray-500 bg-emerald-50 border-l border-gray-100" colSpan={2}>Insentif</th>
                          {/* Total */}
                          <th className="text-right px-4 py-2 font-semibold text-gray-700 border-l border-gray-100">Total</th>
                          <th className="px-3 py-2 border-l border-gray-100 w-16"></th>
                        </tr>
                        <tr className="border-b-2 border-gray-100 text-gray-400">
                          <th className="px-4 py-2 sticky left-0 bg-white"></th>
                          <th className="px-2 py-2 bg-gray-50 border-l border-gray-100 text-center font-medium">Hari</th>
                          <th className="px-2 py-2 bg-gray-50 text-center font-medium">Rate</th>
                          <th className="px-2 py-2 bg-gray-50 text-center font-medium">Total</th>
                          <th className="px-2 py-2 bg-blue-50 border-l border-gray-100 text-center font-medium">Jam</th>
                          <th className="px-2 py-2 bg-blue-50 text-center font-medium">Rate</th>
                          <th className="px-2 py-2 bg-blue-50 text-center font-medium">Total</th>
                          <th className="px-2 py-2 bg-amber-50 border-l border-gray-100 text-center font-medium">Jam</th>
                          <th className="px-2 py-2 bg-amber-50 text-center font-medium">Total</th>
                          <th className="px-2 py-2 bg-emerald-50 border-l border-gray-100 text-center font-medium">%</th>
                          <th className="px-2 py-2 bg-emerald-50 text-center font-medium">Omzet</th>
                          <th className="px-4 py-2 border-l border-gray-100 text-right font-medium"></th>
                          <th className="px-3 py-2 border-l border-gray-100"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {aktifKaryawans.map((k, idx) => {
                          const r = gajiRows[k.id]
                          if (!r) return null
                          const isSaving = saving[k.id]
                          const hasData = !!r.id
                          return (
                            <tr key={k.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                              {/* Nama */}
                              <td className="px-4 py-2.5 sticky left-0 bg-inherit">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-white">{k.nama[0]}</span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{k.nama}</div>
                                    <div className="text-gray-400">{k.posisi}</div>
                                  </div>
                                  {hasData && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" title="Data tersimpan" />}
                                </div>
                              </td>
                              {/* Jam Normal */}
                              <td className="px-1 py-2 bg-gray-50/50 border-l border-gray-100"><NumCell karyawanId={k.id} field="hariKerja" value={r.hariKerja} small /></td>
                              <td className="px-2 py-2 bg-gray-50/50 text-center text-gray-400">{formatRupiah(k.rateJam)}</td>
                              <td className="px-2 py-2 bg-gray-50/50 text-center font-medium text-gray-700">{formatRupiah(r.totalGajiPokok)}</td>
                              {/* Jam Tertentu */}
                              <td className="px-1 py-2 bg-blue-50/30 border-l border-gray-100"><NumCell karyawanId={k.id} field="jamKerjaTertentuJam" value={r.jamKerjaTertentuJam} small /></td>
                              <td className="px-1 py-2 bg-blue-50/30"><NumCell karyawanId={k.id} field="jamKerjaTertentuRate" value={r.jamKerjaTertentuRate} /></td>
                              <td className="px-2 py-2 bg-blue-50/30 text-center font-medium text-blue-700">{r.totalKerjaTertentu > 0 ? formatRupiah(r.totalKerjaTertentu) : '—'}</td>
                              {/* Lembur */}
                              <td className="px-1 py-2 bg-amber-50/30 border-l border-gray-100"><NumCell karyawanId={k.id} field="jamLembur" value={r.jamLembur} small /></td>
                              <td className="px-2 py-2 bg-amber-50/30 text-center font-medium text-amber-700">{r.totalLembur > 0 ? formatRupiah(r.totalLembur) : '—'}</td>
                              {/* Insentif */}
                              <td className="px-2 py-2 bg-emerald-50/30 border-l border-gray-100 text-center text-gray-400">{k.insentifPersen}%</td>
                              <td className="px-1 py-2 bg-emerald-50/30"><NumCell karyawanId={k.id} field="omzetInsentif" value={r.omzetInsentif} /></td>
                              {/* Total */}
                              <td className="px-4 py-2 text-right border-l border-gray-100">
                                <span className="font-bold text-gray-900">{formatRupiah(r.totalGaji)}</span>
                              </td>
                              {/* Aksi */}
                              <td className="px-3 py-2 border-l border-gray-100">
                                <button onClick={() => saveGajiRow(k.id)} disabled={isSaving}
                                  className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-50 transition-colors">
                                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setSlipModal({ mode: 'satu', karyawanId: k.id })} title="Kirim slip via email"
                                  className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors ml-1">📧</button>
                                <button onClick={() => kirimSlipWA(k)} title="Kirim slip via WhatsApp"
                                  className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors ml-1">💬</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-700 sticky left-0 bg-gray-50">Total</td>
                          <td colSpan={2} className="bg-gray-50/50 border-l border-gray-100"></td>
                          <td className="px-2 py-2.5 text-center font-bold text-gray-700 bg-gray-50/50">{formatRupiah(aktifKaryawans.reduce((s, k) => s + (gajiRows[k.id]?.totalGajiPokok || 0), 0))}</td>
                          <td colSpan={2} className="bg-blue-50/30 border-l border-gray-100"></td>
                          <td className="px-2 py-2.5 text-center font-bold text-blue-700 bg-blue-50/30">{formatRupiah(aktifKaryawans.reduce((s, k) => s + (gajiRows[k.id]?.totalKerjaTertentu || 0), 0))}</td>
                          <td className="bg-amber-50/30 border-l border-gray-100"></td>
                          <td className="px-2 py-2.5 text-center font-bold text-amber-700 bg-amber-50/30">{formatRupiah(aktifKaryawans.reduce((s, k) => s + (gajiRows[k.id]?.totalLembur || 0), 0))}</td>
                          <td colSpan={2} className="bg-emerald-50/30 border-l border-gray-100"></td>
                          <td className="px-4 py-2.5 text-right border-l border-gray-100">
                            <span className="font-bold text-gray-900">{formatRupiah(aktifKaryawans.reduce((s, k) => s + (gajiRows[k.id]?.totalGaji || 0), 0))}</span>
                          </td>
                          <td className="border-l border-gray-100"></td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                      💡 Klik angka untuk edit langsung · Titik hijau = data tersimpan · Titik kosong = belum disimpan
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: PER KARYAWAN */}
            {gajiViewMode === 'karyawan' && (
              <div className="space-y-3">
                {karyawans.length === 0 && <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">Belum ada karyawan</div>}
                {karyawans.map(k => {
                  const isExpanded = expandedKaryawan === k.id
                  const records = karyawanRecords[k.id] || []
                  const studio = studios.find(s => s.id === k.studioProfilId)
                  return (
                    <div key={k.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(k.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{k.nama[0]}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900">{k.nama}</span>
                              {!k.aktif && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Nonaktif</span>}
                            </div>
                            <div className="text-xs text-gray-400">{k.posisi}{studio ? ` · ${studio.nama}` : ''}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex gap-4 text-xs text-gray-400">
                            <span>{formatRupiah(k.rateJam)}/jam</span>
                            {k.insentifPersen > 0 && <span>Insentif {k.insentifPersen}%</span>}
                          </div>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditKaryawan(k); setKaryawanForm({ nama: k.nama, posisi: k.posisi, unitStudio: k.unitStudio || '', studioProfilId: k.studioProfilId || '', rateJam: k.rateJam, rateLembur: k.rateLembur, insentifPersen: k.insentifPersen, basisInsentif: k.basisInsentif, fotograferId: k.fotograferId || '', aktif: k.aktif, punyaInsentif: k.punyaInsentif ?? (k.insentifPersen > 0), jobTambahan: k.jobTambahan }); setShowKaryawanForm(true) }}
                              className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteKaryawan(k.id)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-4">
                          {/* Rekap tahunan */}
                          {records.length > 0 && (() => {
                            const tahunList = [...new Set(records.map(r => r.tahun))].sort((a, b) => b - a)
                            return (
                              <div className="mb-4">
                                {tahunList.map(tahun => {
                                  const rekap = getRekapTahunan(k.id, tahun)
                                  return (
                                    <div key={tahun} className="mb-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-700">Rekap {tahun}</span>
                                        <span className="text-xs text-gray-400">({rekap.bulanAktif} bulan)</span>
                                      </div>
                                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {[
                                          { label: 'Gaji Pokok', val: rekap.totalGajiPokok },
                                          { label: 'Lembur', val: rekap.totalLembur },
                                          { label: 'Kerja Tertentu', val: rekap.totalKerjaTertentu },
                                          { label: 'Insentif', val: rekap.totalInsentif },
                                          { label: 'Job Tambahan', val: rekap.totalJobTambahan },
                                          { label: 'Total Gaji', val: rekap.totalGaji, bold: true },
                                        ].map(item => (
                                          <div key={item.label} className={`bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 ${item.bold ? 'border-gray-900/20 bg-gray-900/5' : ''}`}>
                                            <div className="text-xs text-gray-400">{item.label}</div>
                                            <div className={`text-xs mt-0.5 ${item.bold ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{formatRupiah(item.val)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                          {/* Riwayat per bulan */}
                          <div className="text-xs font-semibold text-gray-600 mb-2">Riwayat Gaji</div>
                          {records.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-4">Belum ada riwayat. Input data di tab Per Bulan.</div>
                          ) : (
                            <div className="space-y-1.5">
                              {records.map(r => {
                                const jobs: JobItem[] = (() => { try { return JSON.parse(r.jobTambahan || '[]') } catch { return [] } })()
                                return (
                                  <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 hover:border-gray-200">
                                    <div className="flex items-center gap-3">
                                      <span className="font-semibold text-xs text-gray-900 w-28">{BULAN_FULL[r.bulan - 1]} {r.tahun}</span>
                                      <div className="flex gap-2 text-xs text-gray-400">
                                        <span>Pokok: {formatRupiah(r.totalGajiPokok)}</span>
                                        {r.totalLembur > 0 && <span>Lembur: {formatRupiah(r.totalLembur)}</span>}
                                        {r.totalInsentif > 0 && <span>Insentif: {formatRupiah(r.totalInsentif)}</span>}
                                      </div>
                                    </div>
                                    <span className="font-bold text-sm text-gray-900">{formatRupiah(r.totalGaji)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ STUDIO PROFIL ══ */}
        {tab === 'studio-profil' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-bold text-gray-800">Profil Studio</h2><p className="text-xs text-gray-400">Header untuk slip gaji, invoice, dan laporan</p></div>
              <button onClick={() => { setEditStudio(null); setStudioForm({ nama: '', alamat: '', noHp: '', rekening: '', isDefault: false }); setShowStudioForm(true) }}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-800"><Plus className="w-3.5 h-3.5" /> Tambah Studio</button>
            </div>
            <div className="grid gap-3">
              {studios.length === 0 && <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">Belum ada profil studio</div>}
              {studios.map(s => (
                <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {s.logoUrl && <img src={s.logoUrl} alt="logo" className="w-10 h-10 object-contain rounded-lg border border-gray-100 flex-shrink-0" />}
                      <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.nama}</span>
                        {s.isDefault && <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">Default</span>}
                      </div>
                      {s.alamat && <div className="text-xs text-gray-400 mt-1">{s.alamat}</div>}
                      {s.noHp && <div className="text-xs text-gray-400">{s.noHp}</div>}
                      {s.rekening && <div className="text-xs text-gray-400 mt-1 whitespace-pre-line">{s.rekening}</div>}
                    </div></div>
                    <div className="flex gap-1 items-center">
                      <label className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 cursor-pointer" title="Upload Logo">
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) uploadLogo(s.id, f) }} />
                        {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs font-medium px-0.5">Logo</span>}
                      </label>
                      <button onClick={() => { setEditStudio(s); setStudioForm({ nama: s.nama, alamat: s.alamat || '', noHp: s.noHp || '', rekening: s.rekening || '', isDefault: s.isDefault }); setShowStudioForm(true) }}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteStudio(s.id)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ INVESTOR ══ */}
        {tab === 'investor' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-bold text-gray-800">Data Investor</h2><p className="text-xs text-gray-400">Profil dan skema bagi hasil</p></div>
              <button onClick={() => { setEditInvestor(null); setInvestorForm({ nama: '', modal: 0, skemaFlat: 0, skemaPersen: 0, aktif: true }); setShowInvestorForm(true) }}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-800"><Plus className="w-3.5 h-3.5" /> Tambah Investor</button>
            </div>
            <div className="grid gap-3">
              {investors.length === 0 && <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">Belum ada investor</div>}
              {investors.map(inv => (
                <div key={inv.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{inv.nama}</span>
                        {!inv.aktif && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Nonaktif</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Modal: <span className="font-semibold text-gray-700">{formatRupiah(inv.modal)}</span></div>
                      <div className="text-xs text-gray-400 mt-0.5">Bagi hasil: {inv.skemaFlat > 0 ? `Flat ${inv.skemaFlat}% × modal = ${formatRupiah(Math.round(inv.modal * inv.skemaFlat / 100))}/bln` : ''}{inv.skemaFlat > 0 && inv.skemaPersen > 0 ? ' + ' : ''}{inv.skemaPersen > 0 ? `${inv.skemaPersen}% omzet` : ''}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditInvestor(inv); setInvestorForm({ nama: inv.nama, modal: inv.modal, skemaFlat: inv.skemaFlat, skemaPersen: inv.skemaPersen, aktif: inv.aktif }); setShowInvestorForm(true) }}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteInvestor(inv.id)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {inv.laporan?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="flex flex-wrap gap-1.5">
                        {inv.laporan.slice(0, 6).map((l: any) => (
                          <div key={l.id} className="text-xs bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100">
                            <span className="font-medium text-gray-700">{l.periode}</span>
                            <span className="text-gray-400 ml-1">· {formatRupiah(l.bagiHasil)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SETTING ══ */}
        {tab === 'setting' && (
          <div className="space-y-4 max-w-lg">
            <div><h2 className="text-sm font-bold text-gray-800">Settings Dokumen</h2></div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Nama Owner</label>
                <input value={setting.ownerNama || ''} onChange={e => setSetting(s => ({ ...s, ownerNama: e.target.value }))} placeholder="Nama lengkap..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Jabatan</label>
                <input value={setting.ownerJabatan || ''} onChange={e => setSetting(s => ({ ...s, ownerJabatan: e.target.value }))} placeholder="Owner / Direktur..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Pernyataan Kepatuhan</label>
                <textarea value={setting.pernyataanKepatuhan || ''} onChange={e => setSetting(s => ({ ...s, pernyataanKepatuhan: e.target.value }))} rows={4}
                  placeholder="Dengan ini kami menyatakan..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none" /></div>
              <button onClick={saveSetting} disabled={savingSetting} className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
                {savingSetting ? 'Menyimpan...' : 'Simpan Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL STUDIO ══ */}
      {showStudioForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold">{editStudio ? 'Edit' : 'Tambah'} Profil Studio</h2>
              <button onClick={() => { setShowStudioForm(false); setEditStudio(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Nama Studio*</label>
                <input value={studioForm.nama} onChange={e => setStudioForm(f => ({ ...f, nama: e.target.value }))} placeholder="Explora Studio"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Alamat</label>
                <textarea value={studioForm.alamat} onChange={e => setStudioForm(f => ({ ...f, alamat: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">No. HP</label>
                <input value={studioForm.noHp} onChange={e => setStudioForm(f => ({ ...f, noHp: e.target.value }))} placeholder="085xxx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Info Rekening</label>
                <textarea value={studioForm.rekening} onChange={e => setStudioForm(f => ({ ...f, rekening: e.target.value }))} rows={3}
                  placeholder={"BRI 1234567890\nBCA 0987654321"} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={studioForm.isDefault} onChange={e => setStudioForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <span className="text-sm text-gray-600">Set sebagai default</span>
              </label>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowStudioForm(false); setEditStudio(null) }} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Batal</button>
              <button onClick={saveStudio} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold">{editStudio ? 'Update' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL KARYAWAN ══ */}
      {showKaryawanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold">{editKaryawan ? 'Edit' : 'Tambah'} Karyawan</h2>
              <button onClick={() => { setShowKaryawanForm(false); setEditKaryawan(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Nama*</label>
                  <input value={karyawanForm.nama} onChange={e => setKaryawanForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Posisi</label>
                  <input value={karyawanForm.posisi} onChange={e => setKaryawanForm(f => ({ ...f, posisi: e.target.value }))} placeholder="Fotografer / Admin"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Profil Studio</label>
                <select value={karyawanForm.studioProfilId} onChange={e => setKaryawanForm(f => ({ ...f, studioProfilId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                  <option value="">-- Pilih Studio --</option>
                  {studios.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Rate Jam Normal (Rp)</label>
                  <input type="number" value={karyawanForm.rateJam} onChange={e => setKaryawanForm(f => ({ ...f, rateJam: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Rate Lembur (Rp)</label>
                  <input type="number" value={karyawanForm.rateLembur} onChange={e => setKaryawanForm(f => ({ ...f, rateLembur: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              </div>
              {/* Toggle Insentif */}
              <div className="border border-gray-100 rounded-xl p-3 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-gray-700">Punya Skema Insentif</div>
                    <div className="text-xs text-gray-400">Aktifkan kalau karyawan dapat insentif dari omzet</div>
                  </div>
                  <div onClick={() => setKaryawanForm(f => ({ ...f, punyaInsentif: !f.punyaInsentif }))}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${karyawanForm.punyaInsentif ? 'bg-gray-900' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${karyawanForm.punyaInsentif ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
                {karyawanForm.punyaInsentif && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
                    <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Insentif (%)</label>
                      <input type="number" step="0.5" value={karyawanForm.insentifPersen} onChange={e => setKaryawanForm(f => ({ ...f, insentifPersen: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Basis Insentif</label>
                      <select value={karyawanForm.basisInsentif} onChange={e => setKaryawanForm(f => ({ ...f, basisInsentif: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                        <option value="KESELURUHAN">Omzet keseluruhan</option>
                        <option value="FOTOGRAFER">Omzet sendiri</option>
                        <option value="MANUAL">Manual</option>
                      </select></div>
                  </div>
                )}
              </div>
              {karyawanForm.basisInsentif === 'FOTOGRAFER' && (
                <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Fotografer (untuk filter omzet)</label>
                  <select value={karyawanForm.fotograferId} onChange={e => setKaryawanForm(f => ({ ...f, fotograferId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                    <option value="">-- Pilih Fotografer --</option>
                    {fotografers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={karyawanForm.aktif} onChange={e => setKaryawanForm(f => ({ ...f, aktif: e.target.checked }))} />
                <span className="text-sm text-gray-600">Aktif</span>
              </label>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Job Tambahan Default</label>
                  <button onClick={() => setKaryawanForm(f => ({ ...f, jobTambahan: [...f.jobTambahan, { namaJob: '', nominal: 0 }] }))} className="text-xs text-gray-700 font-semibold hover:underline">+ Tambah</button>
                </div>
                {karyawanForm.jobTambahan.map((j, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={j.namaJob} onChange={e => setKaryawanForm(f => ({ ...f, jobTambahan: f.jobTambahan.map((x, idx) => idx === i ? { ...x, namaJob: e.target.value } : x) }))}
                      placeholder="Nama job" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    <input type="number" value={j.nominal} onChange={e => setKaryawanForm(f => ({ ...f, jobTambahan: f.jobTambahan.map((x, idx) => idx === i ? { ...x, nominal: Number(e.target.value) } : x) }))}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    <button onClick={() => setKaryawanForm(f => ({ ...f, jobTambahan: f.jobTambahan.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowKaryawanForm(false); setEditKaryawan(null) }} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Batal</button>
              <button onClick={saveKaryawan} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold">{editKaryawan ? 'Update' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL INVESTOR ══ */}
      {showInvestorForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold">{editInvestor ? 'Edit' : 'Tambah'} Investor</h2>
              <button onClick={() => { setShowInvestorForm(false); setEditInvestor(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Nama Investor*</label>
                <input value={investorForm.nama} onChange={e => setInvestorForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Total Modal (Rp)</label>
                <input type="number" value={investorForm.modal} onChange={e => setInvestorForm(f => ({ ...f, modal: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Imbal Hasil Flat (% dari Modal/bulan)</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={investorForm.skemaFlat} onChange={e => setInvestorForm(f => ({ ...f, skemaFlat: Number(e.target.value) }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">% × {formatRupiah(investorForm.modal)} = {formatRupiah(Math.round(investorForm.modal * investorForm.skemaFlat / 100))}/bln</span>
                </div>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1.5 block">Imbal Hasil % Omzet</label>
                <input type="number" step="0.1" value={investorForm.skemaPersen} onChange={e => setInvestorForm(f => ({ ...f, skemaPersen: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={investorForm.aktif} onChange={e => setInvestorForm(f => ({ ...f, aktif: e.target.checked }))} />
                <span className="text-sm text-gray-600">Aktif</span>
              </label>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowInvestorForm(false); setEditInvestor(null) }} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Batal</button>
              <button onClick={saveInvestor} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold">{editInvestor ? 'Update' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KIRIM SLIP */}
      {slipModal && (() => {
        const targets = slipModal.mode === 'satu'
          ? karyawans.filter(k => k.id === slipModal.karyawanId)
          : karyawans.filter(k => k.aktif && gajiRows[k.id])
        const first = targets[0]
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSlipModal(null)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
              <p className="font-bold text-sm">📧 Kirim Slip Gaji — {slipModal.mode === 'satu' ? first?.nama : `${targets.length} karyawan`}</p>
              <p className="text-xs text-gray-400">{slipModal.mode === 'satu'
                ? `Ke: ${autoEmails[first?.id || ''] || '(email tidak ditemukan — klik ⚡ Tarik Otomatis dulu)'}`
                : 'Dikirim ke email akun masing-masing (yang ter-link nama). Isi di bawah = slip orang pertama sebagai contoh format; tiap orang menerima slipnya sendiri.'}</p>
              <SlipEditor
                initial={first && gajiRows[first.id] ? buildSlipText(first, gajiRows[first.id]) : ''}
                editable={slipModal.mode === 'satu'}
                onSend={async (text) => {
                  const errs: string[] = []
                  for (const k of targets) {
                    const err = await kirimSlipEmail(k, slipModal.mode === 'satu' ? text : undefined)
                    if (err) errs.push(err)
                  }
                  setSlipModal(null)
                  toast(errs.length
                    ? { title: `Selesai dengan ${errs.length} gagal`, description: errs.slice(0, 3).join(' · '), variant: 'destructive' }
                    : { title: `Slip terkirim ke ${targets.length - errs.length} orang ✓` })
                }}
                onCancel={() => setSlipModal(null)}
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}


function SlipEditor({ initial, editable, onSend, onCancel }: { initial: string; editable: boolean; onSend: (text: string) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState(initial)
  const [sending, setSending] = useState(false)
  return (
    <>
      <textarea value={text} onChange={e => setText(e.target.value)} readOnly={!editable} rows={14}
        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono ${!editable ? 'bg-gray-50 text-gray-500' : ''}`} />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="border border-gray-200 rounded-lg px-4 py-2 text-sm">Batal</button>
        <button onClick={async () => { setSending(true); await onSend(text); setSending(false) }} disabled={sending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg px-5 py-2 text-sm font-semibold">
          {sending ? 'Mengirim…' : 'Kirim'}
        </button>
      </div>
    </>
  )
}
