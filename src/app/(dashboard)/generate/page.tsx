'use client'

import { useEffect, useState, useRef } from 'react'
import { FileText, Receipt, TrendingUp, Download, Plus, X, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatRupiah } from '@/lib/utils'

type Tab = 'slip-gaji' | 'invoice' | 'laporan-investor'
const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const TABS = [
  { id: 'slip-gaji', label: 'Slip Gaji', icon: FileText },
  { id: 'invoice', label: 'Invoice Custom', icon: Receipt },
  { id: 'laporan-investor', label: 'Laporan Investor', icon: TrendingUp },
] as const

type KaryawanGaji = {
  id: string; nama: string; posisi: string; unitStudio?: string; studioProfilId?: string
  rateJam: number; rateLembur: number; insentifPersen: number; basisInsentif: string
  fotograferId?: string; punyaInsentif?: boolean
  jobTambahan: { namaJob: string; nominal: number }[]
}
type GajiRecord = {
  id?: string; bulan: number; tahun: number; jamNormal: number; hariKerja: number
  jamLembur: number; jamKerjaTertentuJam: number; jamKerjaTertentuRate: number
  omzetInsentif: number; jobTambahan: string
  totalGajiPokok: number; totalLembur: number; totalKerjaTertentu: number
  totalInsentif: number; totalJobTambahan: number; totalGaji: number; status: string
}
type StudioProfil = { id: string; nama: string; alamat?: string; noHp?: string; rekening?: string; logoUrl?: string; isDefault: boolean }
type Investor = { id: string; nama: string; modal: number; skemaFlat: number; skemaPersen: number }
type JobItem = { namaJob: string; nominal: number }

export default function GeneratePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('slip-gaji')
  const printRef = useRef<HTMLDivElement>(null)

  const [karyawans, setKaryawans] = useState<KaryawanGaji[]>([])
  const [studios, setStudios] = useState<StudioProfil[]>([])
  const [investors, setInvestors] = useState<Investor[]>([])
  const [setting, setSetting] = useState<any>({})

  // SLIP GAJI
  const [slipKaryawanId, setSlipKaryawanId] = useState('')
  const [slipRecord, setSlipRecord] = useState<GajiRecord | null>(null)
  const [slipRecords, setSlipRecords] = useState<GajiRecord[]>([])
  const [slipBulan, setSlipBulan] = useState(new Date().getMonth())
  const [slipTahun, setSlipTahun] = useState(new Date().getFullYear())
  const [slipJamNormal, setSlipJamNormal] = useState(8)
  const [slipHariKerja, setSlipHariKerja] = useState(25)
  const [slipJamLembur, setSlipJamLembur] = useState(0)
  const [slipOmzet, setSlipOmzet] = useState(0)
  const [slipJobs, setSlipJobs] = useState<JobItem[]>([])
  const [loadingSlip, setLoadingSlip] = useState(false)

  // INVOICE
  const [invStudioId, setInvStudioId] = useState('')
  const [invNomor, setInvNomor] = useState('')
  const [invTanggal, setInvTanggal] = useState(new Date().toISOString().split('T')[0])
  const [invClient, setInvClient] = useState('')
  const [invItems, setInvItems] = useState<{deskripsi:string;total:number}[]>([{deskripsi:'',total:0}])
  const [invDiskon, setInvDiskon] = useState(0)
  const [invDP, setInvDP] = useState(0)
  const [invCatatan, setInvCatatan] = useState('')

  // LAPORAN INVESTOR
  const [lapInvestorId, setLapInvestorId] = useState('')
  const [lapBulan, setLapBulan] = useState(new Date().getMonth())
  const [lapTahun, setLapTahun] = useState(new Date().getFullYear())
  const [lapOmzet, setLapOmzet] = useState(0)
  const [lapBagiHasil, setLapBagiHasil] = useState(0)
  const [lapCatatan, setLapCatatan] = useState('')
  const [lapTotalBH, setLapTotalBH] = useState(0)
  const [loadingLap, setLoadingLap] = useState(false)
  const [savingLap, setSavingLap] = useState(false)

  async function loadAll() {
    const [k, s, i, st] = await Promise.all([
      fetch('/api/manajemen/karyawan').then(r => r.json()),
      fetch('/api/manajemen/studio-profil').then(r => r.json()),
      fetch('/api/manajemen/investor').then(r => r.json()),
      fetch('/api/manajemen/setting').then(r => r.json()),
    ])
    setKaryawans(Array.isArray(k) ? k.filter((x:any) => x.aktif) : [])
    setStudios(Array.isArray(s) ? s : [])
    setInvestors(Array.isArray(i) ? i.filter((x:any) => x.aktif) : [])
    setSetting(st || {})
    const defS = Array.isArray(s) ? s.find((x:any) => x.isDefault) : null
    if (defS) setInvStudioId(defS.id)
  }

  useEffect(() => { loadAll() }, [])

  async function loadSlipRecord(karyawanId: string, bulan: number, tahun: number) {
    if (!karyawanId) return
    setLoadingSlip(true)
    const res = await fetch(`/api/manajemen/gaji-record?karyawanId=${karyawanId}`)
    const data = await res.json()
    setSlipRecords(Array.isArray(data) ? data : [])
    const record = Array.isArray(data) ? data.find((r:GajiRecord) => r.bulan === bulan + 1 && r.tahun === tahun) : null
    if (record) {
      setSlipRecord(record)
      setSlipJamNormal(record.jamNormal)
      setSlipHariKerja(record.hariKerja)
      setSlipJamLembur(record.jamLembur)
      setSlipOmzet(record.omzetInsentif)
      const jobs = (() => { try { const j = JSON.parse(record.jobTambahan || '[]'); return Array.isArray(j) ? j : [] } catch { return [] } })()
      setSlipJobs(jobs)
    } else {
      const k = karyawans.find(x => x.id === karyawanId)
      setSlipRecord(null)
      setSlipJamNormal(8); setSlipHariKerja(25); setSlipJamLembur(0); setSlipOmzet(0)
      setSlipJobs(k?.jobTambahan || [])
    }
    setLoadingSlip(false)
  }

  useEffect(() => { loadSlipRecord(slipKaryawanId, slipBulan, slipTahun) }, [slipKaryawanId, slipBulan, slipTahun])

  async function saveSlipRecord() {
    const k = karyawans.find(x => x.id === slipKaryawanId)
    if (!k) return
    const gajiPokok = k.rateJam * slipJamNormal * slipHariKerja
    const lembur = k.rateLembur * slipJamLembur
    const insentifVal = punyaInsentif ? Math.round(slipOmzet * k.insentifPersen / 100) : 0
    const jobTotal = slipJobs.filter(j => j.namaJob?.trim()).reduce((s,j) => s + j.nominal, 0)
    const body: any = {
      karyawanId: slipKaryawanId, bulan: slipBulan + 1, tahun: slipTahun,
      jamNormal: slipJamNormal, hariKerja: slipHariKerja, jamLembur: slipJamLembur,
      omzetInsentif: slipOmzet, jobTambahan: JSON.stringify(slipJobs),
      totalGajiPokok: gajiPokok, totalLembur: lembur, totalInsentif: insentifVal,
      totalJobTambahan: jobTotal, totalGaji: gajiPokok + lembur + insentifVal + jobTotal, status: 'DRAFT'
    }
    if (slipRecord) body.id = slipRecord.id
    const res = await fetch('/api/manajemen/gaji-record', { method: slipRecord ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast({ title: 'Data tersimpan!' }); loadSlipRecord(slipKaryawanId, slipBulan, slipTahun) }
  }

  async function fetchLapOmzet() {
    setLoadingLap(true)
    try {
      const month = `${lapTahun}-${String(lapBulan + 1).padStart(2,'0')}`
      const res = await fetch(`/api/laporan/bulanan?month=${month}`)
      const data = await res.json()
      const omzet = data?.omzet || 0
      setLapOmzet(omzet)
      const inv = investors.find(x => x.id === lapInvestorId)
      if (inv) setLapBagiHasil(Math.round(inv.modal * inv.skemaFlat / 100) + Math.round(omzet * inv.skemaPersen / 100))
    } catch {}
    setLoadingLap(false)
  }

  async function fetchTotalBH(investorId: string) {
    const res = await fetch(`/api/manajemen/laporan-investor?investorId=${investorId}`)
    const data = await res.json()
    setLapTotalBH(Array.isArray(data) ? data.reduce((s:number,l:any) => s + l.bagiHasil, 0) : 0)
  }

  useEffect(() => { if (lapInvestorId) fetchTotalBH(lapInvestorId) }, [lapInvestorId])

  // ============ ADVANCE: isi otomatis + kirim langsung ============
  const [autoBusy, setAutoBusy] = useState(false)

  // ⚡ Slip: honor event + bonus absen + jam/hari dari shift (item manual aman)
  async function isiOtomatisSlip() {
    if (!slipKaryawanId) { toast({ title: 'Pilih karyawan dulu', variant: 'destructive' }); return }
    setAutoBusy(true)
    try {
      const res = await fetch(`/api/manajemen/gaji-auto?bulan=${slipBulan + 1}&tahun=${slipTahun}`)
      const data = await res.json()
      const hasil = data.results?.[slipKaryawanId]
      if (!hasil || !hasil.userName) { toast({ title: 'Karyawan tidak ter-link akun (samakan nama di Team)', variant: 'destructive' }); setAutoBusy(false); return }
      const manual = slipJobs.filter((j: any) => !j.auto)
      setSlipJobs([...manual, ...(hasil.items || [])])
      if (hasil.shiftHari > 0) {
        setSlipHariKerja(hasil.shiftHari)
        setSlipJamNormal(Math.round((hasil.shiftJam / hasil.shiftHari) * 10) / 10)
      }
      toast({ title: `✓ Terisi: ${(hasil.items || []).length} job otomatis${hasil.shiftHari > 0 ? ` + ${hasil.shiftHari} hari dari shift` : ''}` })
    } catch { toast({ title: 'Gagal menarik data', variant: 'destructive' }) }
    setAutoBusy(false)
  }

  function buildSlipTextGen(): string {
    const k = karyawans.find(x => x.id === slipKaryawanId)
    if (!k) return ''
    const pokok = k.rateJam * slipJamNormal * slipHariKerja
    const lembur = k.rateLembur * slipJamLembur
    const tertentu = (slipRecord?.jamKerjaTertentuJam || 0) * (slipRecord?.jamKerjaTertentuRate || 0)
    const insentif = ((k as any).punyaInsentif ?? k.insentifPersen > 0) ? Math.round(slipOmzet * k.insentifPersen / 100) : 0
    const jobs = slipJobs.filter(j => j.namaJob?.trim())
    const jobTot = jobs.reduce((s, j) => s + j.nominal, 0)
    return [
      `SLIP GAJI — ${BULAN_FULL[slipBulan]} ${slipTahun}`,
      `${k.nama} (${k.posisi})`,
      '─'.repeat(28),
      `Gaji Pokok (${slipJamNormal} jam × ${slipHariKerja} hari): ${formatRupiah(pokok)}`,
      ...(lembur > 0 ? [`Lembur (${slipJamLembur} jam): ${formatRupiah(lembur)}`] : []),
      ...(tertentu > 0 ? [`Kerja Tertentu: ${formatRupiah(tertentu)}`] : []),
      ...(insentif > 0 ? [`Insentif: ${formatRupiah(insentif)}`] : []),
      ...(jobs.length > 0 ? ['Job Tambahan:', ...jobs.map(j => `  • ${j.namaJob}: ${formatRupiah(j.nominal)}`)] : []),
      '─'.repeat(28),
      `TOTAL: ${formatRupiah(pokok + lembur + tertentu + insentif + jobTot)}`,
      '', 'Terima kasih atas kerja kerasnya! 🙏', '— Explora Creative',
    ].join('\n')
  }

  async function kirimSlipEmailGen() {
    const text = buildSlipTextGen()
    if (!text) { toast({ title: 'Pilih karyawan dulu', variant: 'destructive' }); return }
    setAutoBusy(true)
    try {
      const res = await fetch(`/api/manajemen/gaji-auto?bulan=${slipBulan + 1}&tahun=${slipTahun}`)
      const data = await res.json()
      let to = data.results?.[slipKaryawanId]?.email
      if (!to) to = prompt('Email tidak ditemukan dari akun. Masukkan email tujuan:') || ''
      if (!to) { setAutoBusy(false); return }
      const send = await fetch('/api/manajemen/gaji-slip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject: `Slip Gaji ${BULAN_FULL[slipBulan]} ${slipTahun}`, text }),
      })
      const d = await send.json().catch(() => ({}))
      toast(send.ok ? { title: `✓ Slip terkirim ke ${to}` } : { title: d.error || 'Gagal kirim', variant: 'destructive' })
    } catch { toast({ title: 'Gagal kirim', variant: 'destructive' }) }
    setAutoBusy(false)
  }

  const kirimWA = (text: string) => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')

  function buildInvoiceText(): string {
    const items = invItems.filter(i => i.deskripsi?.trim())
    const total = items.reduce((s, i) => s + i.total, 0) - invDiskon
    return [
      `INVOICE ${invNomor || ''}`.trim(),
      `${invClient || 'Customer'} — ${invTanggal}`,
      '─'.repeat(28),
      ...items.map(i => `${i.deskripsi}: ${formatRupiah(i.total)}`),
      ...(invDiskon > 0 ? [`Diskon: -${formatRupiah(invDiskon)}`] : []),
      '─'.repeat(28),
      `TOTAL: ${formatRupiah(total)}`,
      ...(invDP > 0 ? [`DP: ${formatRupiah(invDP)}`, `SISA: ${formatRupiah(total - invDP)}`] : []),
      ...(invCatatan ? ['', invCatatan] : []),
      '', 'Terima kasih! 📸 — Explora Creative',
    ].join('\n')
  }

  function buildLaporanText(): string {
    const inv = investors.find(x => x.id === lapInvestorId)
    return [
      `LAPORAN INVESTOR — ${BULAN_FULL[lapBulan]} ${lapTahun}`,
      `Kepada: ${inv?.nama || 'Investor'}`,
      '─'.repeat(28),
      `Omzet bulan ini: ${formatRupiah(lapOmzet)}`,
      `Bagi hasil Anda: ${formatRupiah(lapBagiHasil)}`,
      ...(lapCatatan ? ['', `Catatan: ${lapCatatan}`] : []),
      '', 'Terima kasih atas kepercayaannya 🙏', '— Explora Creative',
    ].join('\n')
  }


  async function saveLaporan() {
    if (!lapInvestorId) { toast({ title: 'Pilih investor', variant: 'destructive' }); return }
    setSavingLap(true)
    const periode = `${lapTahun}-${String(lapBulan + 1).padStart(2,'0')}`
    const inv = investors.find(x => x.id === lapInvestorId)
    const roi = inv ? (lapBagiHasil / inv.modal) * 100 : 0
    await fetch('/api/manajemen/laporan-investor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investorId: lapInvestorId, periode, omzet: lapOmzet, bagiHasil: lapBagiHasil, totalRoi: roi, catatan: lapCatatan }) })
    toast({ title: 'Laporan disimpan!' }); setSavingLap(false)
    fetchTotalBH(lapInvestorId)
  }

  // Kalkulasi
  const karyawan = karyawans.find(x => x.id === slipKaryawanId)
  const punyaInsentif = karyawan ? (karyawan.punyaInsentif ?? karyawan.insentifPersen > 0) : false
  const gajiPokok = karyawan ? karyawan.rateJam * slipJamNormal * slipHariKerja : 0
  const gajiLembur = karyawan ? karyawan.rateLembur * slipJamLembur : 0
  const gajiTertentu = slipRecord ? slipRecord.jamKerjaTertentuJam * slipRecord.jamKerjaTertentuRate : 0
  const insentif = punyaInsentif ? Math.round(slipOmzet * (karyawan?.insentifPersen || 0) / 100) : 0
  const jobTotal = slipJobs.filter(j => j.namaJob?.trim()).reduce((s,j) => s + j.nominal, 0)
  const totalGaji = gajiPokok + gajiLembur + gajiTertentu + insentif + jobTotal

  const studioSlip = studios.find(x => x.id === (karyawan?.studioProfilId || ''))
  const studioInv = studios.find(x => x.id === invStudioId)
  const invSubtotal = invItems.reduce((s,i) => s + i.total, 0)
  const invTotal = invSubtotal - invDiskon - invDP
  const [invRiwayat, setInvRiwayat] = useState<any[]>([])
  const [invRiwayatLoading, setInvRiwayatLoading] = useState(false)
  const [slipRiwayat, setSlipRiwayat] = useState<any[]>([])
  const [slipRiwayatLoading, setSlipRiwayatLoading] = useState(false)
  const [lapRiwayat, setLapRiwayat] = useState<any[]>([])
  const [lapRiwayatLoading, setLapRiwayatLoading] = useState(false)

  function generateNextNomor(riwayat: any[]): string {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yy = String(today.getFullYear()).slice(-2)
    const prefix = `INV-${dd}${mm}${yy}`
    // Cari nomor tertinggi hari ini
    const todayInvoices = riwayat
      .map(inv => inv.nomor)
      .filter(n => n && n.startsWith(prefix))
      .map(n => {
        const parts = n.split('-')
        return parseInt(parts[parts.length - 1]) || 0
      })
    const next = todayInvoices.length > 0 ? Math.max(...todayInvoices) + 1 : 1
    return `${prefix}-${String(next).padStart(3, '0')}`
  }

  async function fetchInvRiwayat(autoFillNomor = false) {
    setInvRiwayatLoading(true)
    try {
      const r = await fetch('/api/invoice-custom')
      const data = await r.json()
      const list = Array.isArray(data) ? data : []
      setInvRiwayat(list)
      if (autoFillNomor) {
        setInvNomor(generateNextNomor(list))
      }
    } catch {}
    setInvRiwayatLoading(false)
  }

  async function fetchSlipRiwayat() {
    setSlipRiwayatLoading(true)
    try {
      const r = await fetch('/api/generate-riwayat?type=slip')
      const data = await r.json()
      setSlipRiwayat(Array.isArray(data) ? data : [])
    } catch {}
    setSlipRiwayatLoading(false)
  }

  async function saveSlipToDb() {
    if (!slipKaryawanId) return
    const k = karyawans.find(x => x.id === slipKaryawanId)
    try {
      await fetch('/api/generate-riwayat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'slip',
          label: `${k?.nama || 'Karyawan'} - ${BULAN_FULL[slipBulan]} ${slipTahun}`,
          data: { karyawanId: slipKaryawanId, bulan: slipBulan, tahun: slipTahun },
        }),
      })
      fetchSlipRiwayat()
    } catch {}
  }

  async function deleteSlipRiwayat(id: string) {
    if (!confirm('Hapus riwayat ini?')) return
    await fetch(`/api/generate-riwayat?id=${id}`, { method: 'DELETE' })
    fetchSlipRiwayat()
  }

  async function loadSlipFromRiwayat(item: any) {
    const d = item.data ? JSON.parse(item.data) : {}
    if (d.karyawanId) setSlipKaryawanId(d.karyawanId)
    if (d.bulan !== undefined) setSlipBulan(d.bulan)
    if (d.tahun) setSlipTahun(d.tahun)
  }

  async function fetchLapRiwayat() {
    setLapRiwayatLoading(true)
    try {
      const r = await fetch('/api/generate-riwayat?type=laporan')
      const data = await r.json()
      setLapRiwayat(Array.isArray(data) ? data : [])
    } catch {}
    setLapRiwayatLoading(false)
  }

  async function saveLapToDb() {
    if (!lapInvestorId) return
    const inv = investors.find(x => x.id === lapInvestorId)
    try {
      await fetch('/api/generate-riwayat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'laporan',
          label: `${inv?.nama || 'Investor'} - ${BULAN_FULL[lapBulan]} ${lapTahun}`,
          data: { investorId: lapInvestorId, bulan: lapBulan, tahun: lapTahun, omzet: lapOmzet, bagiHasil: lapBagiHasil },
        }),
      })
      fetchLapRiwayat()
    } catch {}
  }

  async function deleteLapRiwayat(id: string) {
    if (!confirm('Hapus riwayat ini?')) return
    await fetch(`/api/generate-riwayat?id=${id}`, { method: 'DELETE' })
    fetchLapRiwayat()
  }

  async function loadLapFromRiwayat(item: any) {
    const d = item.data ? JSON.parse(item.data) : {}
    if (d.investorId) setLapInvestorId(d.investorId)
    if (d.bulan !== undefined) setLapBulan(d.bulan)
    if (d.tahun) setLapTahun(d.tahun)
    if (d.omzet) setLapOmzet(d.omzet)
    if (d.bagiHasil) setLapBagiHasil(d.bagiHasil)
  }

  async function saveInvoiceToDb() {
    try {
      await fetch('/api/invoice-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: invStudioId || null,
          nomor: invNomor,
          tanggal: invTanggal,
          client: invClient,
          items: invItems,
          diskon: invDiskon,
          dp: invDP,
          total: invTotal,
          catatan: invCatatan,
        }),
      })
      fetchInvRiwayat()
    } catch {}
  }

  async function deleteInvRiwayat(id: string) {
    if (!confirm('Hapus riwayat invoice ini?')) return
    await fetch(`/api/invoice-custom?id=${id}`, { method: 'DELETE' })
    fetchInvRiwayat()
  }

  async function loadInvRiwayat(inv: any) {
    const studio = studios.find(s => s.id === inv.studioId)
    if (studio) setInvStudioId(inv.studioId)
    setInvNomor(inv.nomor)
    setInvTanggal(inv.tanggal)
    setInvClient(inv.client || '')
    setInvItems(JSON.parse(inv.items || '[]'))
    setInvDiskon(inv.diskon || 0)
    setInvDP(inv.dp || 0)
    setInvCatatan(inv.catatan || '')
  }
  const invLaporan = investors.find(x => x.id === lapInvestorId)

  // Fetch riwayat invoice saat tab invoice
  useEffect(() => {
    if (tab === 'invoice') fetchInvRiwayat(true)
  }, [tab])

  const periodeSlip = `${BULAN_FULL[slipBulan]} ${slipTahun}`
  const periodeLap = `${BULAN_FULL[lapBulan]} ${lapTahun}`
  const nomorSlip = 'SLIP-' + slipTahun + String(slipBulan+1).padStart(2,'0') + '-' + (karyawan?.posisi?.slice(0,3).toUpperCase() || 'SLI');

  const kuitansiRef = useRef<HTMLDivElement>(null)

  async function downloadPdf(filename: string) {
    if (!printRef.current) return
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const clone = printRef.current.cloneNode(true) as HTMLElement
      await html2pdf().set({
        margin: [10, 12, 10, 12],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(clone).save()
    } catch (err: any) {
      toast({ title: 'Gagal generate PDF: ' + err.message, variant: 'destructive' })
    }
  }

  async function downloadKuitansi() {
    if (!kuitansiRef.current) return
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const clone = kuitansiRef.current.cloneNode(true) as HTMLElement
      await html2pdf().set({
        margin: [10, 12, 10, 12],
        filename: `${invNomor || 'KUITANSI'}${invClient ? ' - ' + invClient : ''}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(clone).save()
    } catch (err: any) {
      toast({ title: 'Gagal generate kuitansi: ' + err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900">Generate Dokumen</h1>
          <p className="text-xs text-gray-400">Buat slip gaji, invoice, dan laporan investor</p>
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

      <div className="px-5 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">

          {/* SLIP GAJI */}
          {tab === 'slip-gaji' && (<>
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Karyawan & Periode</h3>
                  {slipRecord && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Data tersimpan</span>}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Karyawan</label>
                  <select value={slipKaryawanId} onChange={e => setSlipKaryawanId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-gray-400">
                    <option value="">-- Pilih Karyawan --</option>
                    {karyawans.map(k => <option key={k.id} value={k.id}>{k.nama} ?? {k.posisi}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bulan</label>
                    <select value={slipBulan} onChange={e => setSlipBulan(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-gray-400">
                      {BULAN_FULL.map((b,i) => <option key={i} value={i}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tahun</label>
                    <input type="number" value={slipTahun} onChange={e => setSlipTahun(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </div>
                {slipRecords.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Pilih dari Riwayat</label>
                    <div className="flex flex-wrap gap-1.5">
                      {slipRecords.slice(0,8).map(r => (
                        <button key={r.id} onClick={() => { setSlipBulan(r.bulan-1); setSlipTahun(r.tahun) }}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${r.bulan === slipBulan+1 && r.tahun === slipTahun ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                          {BULAN_FULL[r.bulan-1].slice(0,3)} {r.tahun}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Jam Kerja</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Jam/Hari</label>
                    <input type="number" value={slipJamNormal} onChange={e => setSlipJamNormal(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Hari Kerja</label>
                    <input type="number" value={slipHariKerja} onChange={e => setSlipHariKerja(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Jam Lembur</label>
                    <input type="number" step="0.1" value={slipJamLembur} onChange={e => setSlipJamLembur(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </div>
                {punyaInsentif && (
                  <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">Omzet untuk Insentif {karyawan?.insentifPersen}%</label>
                    <button onClick={fetchOmzetAuto} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Auto</button>
                  </div>
                    <input type="number" value={slipOmzet} onChange={e => setSlipOmzet(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Job Tambahan</h3>
                  <button onClick={() => setSlipJobs(j => [...j, {namaJob:'',nominal:0}])} className="text-xs text-gray-700 font-semibold border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50">+ Tambah</button>
                </div>
                {slipJobs.map((j, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={j.namaJob} onChange={e => setSlipJobs(jobs => jobs.map((x,idx) => idx===i ? {...x,namaJob:e.target.value}:x))}
                      placeholder="Nama job" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    <input type="number" value={j.nominal} onChange={e => setSlipJobs(jobs => jobs.map((x,idx) => idx===i ? {...x,nominal:Number(e.target.value)}:x))}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    <button onClick={() => setSlipJobs(j => j.filter((_,idx) => idx!==i))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {slipJobs.length === 0 && <div className="text-xs text-gray-400 text-center py-1">Belum ada job tambahan</div>}
              </div>

              <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                <div><div className="text-xs text-gray-400">Total Gaji</div><div className="text-xl font-bold text-white">{formatRupiah(totalGaji)}</div></div>
                <div className="text-right text-xs text-gray-400 space-y-0.5">
                  <div>Pokok: {formatRupiah(gajiPokok)}</div>
                  {gajiLembur > 0 && <div>Lembur: {formatRupiah(gajiLembur)}</div>}
                  {insentif > 0 && <div>Insentif: {formatRupiah(insentif)}</div>}
                  {jobTotal > 0 && <div>Job: {formatRupiah(jobTotal)}</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={isiOtomatisSlip} disabled={!slipKaryawanId || autoBusy}
                  className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-40">
                  ⚡ {autoBusy ? '...' : 'Isi Otomatis'}
                </button>
                <button onClick={kirimSlipEmailGen} disabled={!slipKaryawanId || autoBusy}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-40">
                  📧 Email
                </button>
                <button onClick={() => kirimWA(buildSlipTextGen())} disabled={!slipKaryawanId}
                  className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-40">
                  💬 WhatsApp
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={saveSlipRecord} disabled={!slipKaryawanId}
                  className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">
                  ?? {slipRecord ? 'Update Data' : 'Simpan Data'}
                </button>
                <button onClick={async () => { await saveSlipToDb(); downloadPdf(`SLIP-${karyawan?.nama || 'gaji'}-${BULAN_FULL[slipBulan]}-${slipTahun}`) }} disabled={!slipKaryawanId}
                  className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>

            {/* PREVIEW SLIP */}
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Preview Slip Gaji</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div ref={printRef}>
                  <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",color:'#1a1a1a',padding:'32px 36px',fontSize:'11px',lineHeight:'1.5'}}>
                    {/* Header */}
                    <div style={{display:'flex',alignItems:'flex-start',gap:'14px',marginBottom:'20px'}}>
                      {studioSlip?.logoUrl && <img src={studioSlip.logoUrl} alt="logo" style={{width:'52px',height:'52px',objectFit:'contain',flexShrink:0}} />}
                      <div style={{borderLeft:'4px solid #1a1a1a',paddingLeft:'14px',flex:1}}>
                        <div style={{fontSize:'18px',fontWeight:'900',letterSpacing:'-0.5px'}}>{studioSlip?.nama || 'Nama Studio'}</div>
                        {studioSlip?.alamat && <div style={{fontSize:'10px',color:'#777',marginTop:'2px'}}>{studioSlip.alamat}</div>}
                        {studioSlip?.noHp && <div style={{fontSize:'10px',color:'#777'}}>{studioSlip.noHp}</div>}
                      </div>
                    </div>

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',borderBottom:'2px solid #1a1a1a',paddingBottom:'12px',marginBottom:'20px'}}>
                      <div>
                        <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'3px',color:'#888',textTransform:'uppercase',marginBottom:'4px'}}>Slip Gaji Karyawan</div>
                        <div style={{fontSize:'20px',fontWeight:'900',letterSpacing:'-0.5px'}}>Periode: {periodeSlip}</div>
                      </div>
                      {karyawan && (
                        <div style={{textAlign:'right',backgroundColor:'#f8f8f8',padding:'10px 14px',borderRadius:'8px',border:'1px solid #eee'}}>
                          <div style={{fontSize:'13px',fontWeight:'800'}}>{karyawan.nama}</div>
                          <div style={{fontSize:'10px',color:'#888',marginTop:'2px'}}>{karyawan.posisi}</div>
                        </div>
                      )}
                    </div>

                    {/* Tabel */}
                    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'16px'}}>
                      <thead>
                        <tr style={{backgroundColor:'#1a1a1a'}}>
                          <th style={{padding:'9px 14px',textAlign:'left',fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#fff',width:'55%'}}>Penerimaan</th>
                          <th style={{padding:'9px 14px',textAlign:'center',fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#ccc',width:'22%'}}>Sub Total</th>
                          <th style={{padding:'9px 14px',textAlign:'center',fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#ccc',width:'23%'}}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{backgroundColor:'#f9f9f9'}}>
                          <td colSpan={3} style={{padding:'10px 14px 4px',fontWeight:'800',fontSize:'12px'}}>1. Gaji Pokok</td>
                        </tr>
                        <tr>
                          <td style={{padding:'4px 14px 4px 24px',color:'#555'}}>Jam Kerja Normal ({slipJamNormal} jam @ {formatRupiah(karyawan?.rateJam||0)}) × {slipHariKerja} hari</td>
                          <td style={{padding:'4px 14px',textAlign:'center'}}>{formatRupiah(gajiPokok)}</td>
                          <td></td>
                        </tr>
                        {gajiTertentu > 0 && (
                          <tr>
                            <td style={{padding:'4px 14px 4px 24px',color:'#555'}}>Jam Kerja Tertentu ({slipRecord?.jamKerjaTertentuJam} jam @ {formatRupiah(slipRecord?.jamKerjaTertentuRate||0)})</td>
                            <td style={{padding:'4px 14px',textAlign:'center'}}>{formatRupiah(gajiTertentu)}</td>
                            <td></td>
                          </tr>
                        )}
                        {gajiLembur > 0 && (
                          <tr>
                            <td style={{padding:'4px 14px 4px 24px',color:'#555'}}>Lembur ({slipJamLembur} jam @ {formatRupiah(karyawan?.rateLembur||0)})</td>
                            <td style={{padding:'4px 14px',textAlign:'center'}}>{formatRupiah(gajiLembur)}</td>
                            <td></td>
                          </tr>
                        )}
                        <tr style={{borderTop:'1px solid #e8e8e8',borderBottom:'2px solid #e0e0e0'}}>
                          <td style={{padding:'6px 14px'}}></td>
                          <td></td>
                          <td style={{padding:'6px 14px',textAlign:'center',fontWeight:'800',fontSize:'12px'}}>{formatRupiah(gajiPokok + gajiLembur + gajiTertentu)}</td>
                        </tr>

                        {punyaInsentif && (<>
                          <tr style={{backgroundColor:'#f9f9f9'}}>
                            <td colSpan={3} style={{padding:'10px 14px 4px',fontWeight:'800',fontSize:'12px'}}>2. Insentif</td>
                          </tr>
                          <tr>
                            <td style={{padding:'4px 14px 4px 24px',color:'#555'}}>Insentif {karyawan?.insentifPersen}% ? {formatRupiah(slipOmzet)}</td>
                            <td style={{padding:'4px 14px',textAlign:'center'}}>{formatRupiah(insentif)}</td>
                            <td></td>
                          </tr>
                          <tr style={{borderTop:'1px solid #e8e8e8',borderBottom:'2px solid #e0e0e0'}}>
                            <td style={{padding:'6px 14px'}}></td>
                            <td></td>
                            <td style={{padding:'6px 14px',textAlign:'center',fontWeight:'800',fontSize:'12px'}}>{formatRupiah(insentif)}</td>
                          </tr>
                        </>)}

                        <tr style={{backgroundColor:'#f9f9f9'}}>
                          <td colSpan={3} style={{padding:'10px 14px 4px',fontWeight:'800',fontSize:'12px'}}>{punyaInsentif ? '3' : '2'}. Job Tambahan</td>
                        </tr>
                        {slipJobs.filter(j => j.namaJob?.trim()).length > 0 ? slipJobs.filter(j => j.namaJob?.trim()).map((j, i) => (
                          <tr key={i}>
                            <td style={{padding:'4px 14px 4px 24px',color:'#555'}}>{j.namaJob}</td>
                            <td style={{padding:'4px 14px',textAlign:'center'}}>{formatRupiah(j.nominal)}</td>
                            <td></td>
                          </tr>
                        )) : <tr><td colSpan={3} style={{padding:'4px 14px 4px 24px',color:'#bbb'}}>??</td></tr>}
                        <tr style={{borderTop:'1px solid #e8e8e8',borderBottom:'2px solid #e0e0e0'}}>
                          <td style={{padding:'6px 14px'}}></td>
                          <td></td>
                          <td style={{padding:'6px 14px',textAlign:'center',fontWeight:'800',fontSize:'12px'}}>{formatRupiah(jobTotal)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Total */}
                    <div style={{backgroundColor:'#1a1a1a',color:'#fff',padding:'14px 18px',borderRadius:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
                      <span style={{fontWeight:'700',fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',opacity:0.85}}>Total Diterima Crew</span>
                      <span style={{fontWeight:'900',fontSize:'20px',letterSpacing:'-0.5px'}}>{formatRupiah(totalGaji)}</span>
                    </div>

                    {/* TTD */}
                    <div style={{display:'flex',justifyContent:'space-between',paddingTop:'8px',borderTop:'1px solid #eee'}}>
                      <div style={{textAlign:'center',width:'120px'}}>
                        <div style={{fontSize:'11px',color:'#888',marginBottom:'52px'}}>Penerima,</div>
                        <div style={{borderTop:'1.5px solid #333',paddingTop:'8px',fontWeight:'700',fontSize:'12px'}}>{karyawan?.nama || '________________'}</div>
                      </div>
                      <div style={{textAlign:'center',width:'120px'}}>
                        <div style={{fontSize:'10px',color:'#888'}}>Semarang, 1 {periodeSlip}</div>
                        <div style={{fontSize:'12px',fontWeight:'800',marginTop:'3px'}}>{studioSlip?.nama || 'Studio'}</div>
                        <div style={{marginTop:'44px',borderTop:'1.5px solid #333',paddingTop:'8px',fontWeight:'700',fontSize:'12px'}}>{setting.ownerNama || 'Owner'}</div>
                        {setting.ownerJabatan && <div style={{fontSize:'10px',color:'#888',marginTop:'2px'}}>{setting.ownerJabatan}</div>}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{marginTop:'20px',paddingTop:'12px',borderTop:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:'9px',color:'#ccc'}}>Dicetak: {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
                      <div style={{textAlign:'center',border:'1px solid #e8e8e8',borderRadius:'6px',padding:'4px 10px',backgroundColor:'#fafafa'}}>
                        <div style={{fontSize:'8px',color:'#bbb',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'2px'}}>No. Slip</div>
                        <div style={{fontSize:'10px',fontWeight:'700',color:'#888',letterSpacing:'1.5px'}}>{nomorSlip}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* RIWAYAT SLIP GAJI */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">Riwayat Slip Gaji</h2>
                <button onClick={fetchSlipRiwayat} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {slipRiwayatLoading ? (
                <div className="text-center py-6 text-gray-400 text-sm">Memuat...</div>
              ) : slipRiwayat.length === 0 ? (
                <div className="text-center py-6 text-gray-300 text-sm">Belum ada riwayat</div>
              ) : (
                <div className="space-y-2">
                  {slipRiwayat.map(item => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{item.label}</div>
                        <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => loadSlipFromRiwayat(item)} title="Load ke form"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => deleteSlipRiwayat(item.id)} title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>)}

          {/* INVOICE CUSTOM */}
          {tab === 'invoice' && (<>
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Info Invoice</h3>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Profil Studio</label>
                  <select value={invStudioId} onChange={e => setInvStudioId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-gray-400">
                    <option value="">-- Pilih Studio --</option>
                    {studios.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">No. Invoice</label>
                    <input value={invNomor} onChange={e => setInvNomor(e.target.value)} placeholder="INV-001"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tanggal</label>
                    <input type="date" value={invTanggal} onChange={e => setInvTanggal(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nama Client</label>
                  <input value={invClient} onChange={e => setInvClient(e.target.value)} placeholder="Nama client atau acara"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Item</h3>
                  <button onClick={() => setInvItems(i => [...i,{deskripsi:'',total:0}])} className="text-xs text-gray-700 font-semibold border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50">+ Tambah</button>
                </div>
                {invItems.map((item,i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item.deskripsi} onChange={e => setInvItems(items => items.map((x,idx) => idx===i?{...x,deskripsi:e.target.value}:x))}
                      placeholder="Deskripsi item" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    <input type="number" value={item.total} onChange={e => setInvItems(items => items.map((x,idx) => idx===i?{...x,total:Number(e.target.value)}:x))}
                      className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    {invItems.length > 1 && <button onClick={() => setInvItems(items => items.filter((_,idx) => idx!==i))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Diskon (Rp)</label>
                    <input type="number" value={invDiskon} onChange={e => setInvDiskon(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">DP (Rp)</label>
                    <input type="number" value={invDP} onChange={e => setInvDP(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Catatan</label>
                  <textarea value={invCatatan} onChange={e => setInvCatatan(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                <div><div className="text-xs text-gray-400">Total Tagihan</div><div className="text-xl font-bold text-white">{formatRupiah(invTotal)}</div></div>
                <div className="text-right text-xs text-gray-400">
                  <div>Subtotal: {formatRupiah(invSubtotal)}</div>
                  {invDiskon > 0 && <div>Diskon: -{formatRupiah(invDiskon)}</div>}
                  {invDP > 0 && <div>DP: -{formatRupiah(invDP)}</div>}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={async () => { await saveInvoiceToDb(); downloadPdf(`${invNomor || 'INV'}${invClient ? ' - ' + invClient : ''}`) }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800">
                  <Download className="w-4 h-4" /> Download Invoice
                </button>
                <button onClick={() => kirimWA(buildInvoiceText())}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold">
                  💬 Kirim via WA
                </button>
                <button onClick={async () => { await saveInvoiceToDb(); downloadKuitansi() }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700">
                  <Download className="w-4 h-4" /> Download Kuitansi
                </button>
              </div>

              {/* Hidden kuitansi untuk PDF - identik invoice + watermark LUNAS */}
              <div style={{position:'absolute',left:'-9999px',top:0}}>
                <div ref={kuitansiRef}>
                  <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:'11px',color:'#1a1a1a',padding:'28px 32px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'relative',zIndex:1}}>
                    {/* Watermark LUNAS - layer paling atas */}
                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%) rotate(-30deg)',fontSize:'96px',fontWeight:'900',color:'rgba(0,0,0,0.10)',letterSpacing:'8px',whiteSpace:'nowrap',pointerEvents:'none',userSelect:'none',zIndex:999}}>LUNAS</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
                          {studioInv?.logoUrl && <img src={studioInv.logoUrl} alt="logo" style={{width:'48px',height:'48px',objectFit:'contain',flexShrink:0}} />}
                          <div>
                            <div style={{fontSize:'18px',fontWeight:'800',letterSpacing:'-0.5px'}}>{studioInv?.nama || 'Nama Studio'}</div>
                            {studioInv?.alamat && <div style={{fontSize:'10px',color:'#777',marginTop:'3px',lineHeight:'1.5',maxWidth:'180px',wordBreak:'break-word'}}>{studioInv.alamat}</div>}
                            {studioInv?.noHp && <div style={{fontSize:'10px',color:'#777'}}>{studioInv.noHp}</div>}
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'22px',fontWeight:'900',letterSpacing:'-1px'}}>INVOICE</div>
                          {invNomor && <div style={{fontSize:'13px',fontWeight:'700',color:'#555',marginTop:'2px'}}>#{invNomor}</div>}
                          <div style={{fontSize:'10px',color:'#888',marginTop:'4px'}}>{invTanggal ? new Date(invTanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-'}</div>
                        </div>
                      </div>

                      <div style={{height:'2.5px',background:'linear-gradient(to right, #1a1a1a, #999)',borderRadius:'2px',marginBottom:'20px'}}></div>

                      {invClient && (
                        <div style={{marginBottom:'16px',padding:'10px 14px',backgroundColor:'#f8f8f8',borderRadius:'8px',borderLeft:'3px solid #1a1a1a'}}>
                          <div style={{fontSize:'10px',color:'#888',marginBottom:'2px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Dibayarkan oleh</div>
                          <div style={{fontWeight:'700',fontSize:'12px'}}>{invClient}</div>
                        </div>
                      )}

                      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'12px'}}>
                        <thead>
                          <tr style={{backgroundColor:'#1a1a1a',color:'#fff'}}>
                            <th style={{padding:'8px 12px',textAlign:'left',fontSize:'10px',fontWeight:'700'}}>Deskripsi</th>
                            <th style={{padding:'8px 12px',textAlign:'right',fontSize:'10px',fontWeight:'700'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invItems.filter(i => i.deskripsi).map((item,i) => (
                            <tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}>
                              <td style={{padding:'9px 12px',color:'#333'}}>{item.deskripsi}</td>
                              <td style={{padding:'9px 12px',textAlign:'right',fontWeight:'600'}}>{formatRupiah(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{marginLeft:'auto',width:'220px',marginBottom:'20px'}}>
                        {invDiskon > 0 && <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>Diskon</span><span style={{color:'#e53e3e',fontWeight:'600'}}>-{formatRupiah(invDiskon)}</span></div>}
                        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>Sub Total</span><span style={{fontWeight:'600'}}>{formatRupiah(invSubtotal - invDiskon)}</span></div>
                        {invDP > 0 && <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>DP</span><span style={{fontWeight:'600'}}>-{formatRupiah(invDP)}</span></div>}
                        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',backgroundColor:'#1a1a1a',color:'#fff',borderRadius:'8px',marginTop:'6px'}}>
                          <span style={{fontWeight:'700',fontSize:'12px'}}>TOTAL</span>
                          <span style={{fontWeight:'800',fontSize:'14px'}}>{formatRupiah(invTotal)}</span>
                        </div>
                      </div>

                      <div style={{display:'flex',gap:'16px',marginBottom:'24px'}}>
                        {invCatatan && (
                          <div style={{flex:1,padding:'10px 12px',backgroundColor:'#f8f8f8',border:'1px solid #eee',borderRadius:'8px'}}>
                            <div style={{fontSize:'10px',fontWeight:'700',marginBottom:'4px',color:'#333'}}>Catatan</div>
                            <div style={{fontSize:'10px',color:'#555',lineHeight:'1.6',whiteSpace:'pre-line'}}>{invCatatan}</div>
                          </div>
                        )}
                        {studioInv?.rekening && (
                          <div style={{flex:1,padding:'10px 12px',backgroundColor:'#f8f8f8',borderRadius:'8px',border:'1px solid #eee'}}>
                            <div style={{fontSize:'10px',fontWeight:'700',marginBottom:'4px',color:'#333'}}>Informasi Pembayaran</div>
                            <div style={{fontSize:'10px',color:'#555',lineHeight:'1.7',whiteSpace:'pre-line'}}>{studioInv.rekening}</div>
                          </div>
                        )}
                      </div>

                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',borderTop:'1px solid #eee',paddingTop:'16px'}}>
                        <div>
                          <div style={{fontSize:'9px',color:'#aaa',marginBottom:'6px'}}>Dicetak: {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
                          {invNomor && (
                            <svg width="120" height="38">
                              {invNomor.split('').map((ch: string, i: number) => {
                                const val = ch.charCodeAt(0)
                                const bars = val.toString(2).padStart(8,'0').split('')
                                return bars.map((b: string, j: number) => b==='1' ? (
                                  <rect key={i*8+j} x={(i*8+j)*1.3} y={0} width={1.1} height={28} fill="#555" />
                                ) : null)
                              })}
                              <text x="60" y="37" textAnchor="middle" fontSize="7" fill="#888" fontFamily="monospace">{invNomor}</text>
                            </svg>
                          )}
                        </div>
                        <div style={{textAlign:'center',width:'120px'}}>
                          <div style={{fontSize:'10px',color:'#888',marginBottom:'40px'}}>{studioInv?.nama || 'Studio'}</div>
                          <div style={{borderTop:'1.5px solid #1a1a1a',paddingTop:'6px',fontWeight:'700',fontSize:'11px'}}>{setting.ownerNama || 'Owner'}</div>
                          {setting.ownerJabatan && <div style={{fontSize:'10px',color:'#888'}}>{setting.ownerJabatan}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PREVIEW INVOICE */}
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Preview Invoice</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div ref={printRef}>
                  <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:'11px',color:'#1a1a1a',padding:'28px 32px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
                        {studioInv?.logoUrl && <img src={studioInv.logoUrl} alt="logo" style={{width:'48px',height:'48px',objectFit:'contain',flexShrink:0}} />}
                        <div>
                          <div style={{fontSize:'18px',fontWeight:'800',letterSpacing:'-0.5px'}}>{studioInv?.nama || 'Nama Studio'}</div>
                          {studioInv?.alamat && <div style={{fontSize:'10px',color:'#777',marginTop:'3px',lineHeight:'1.5',maxWidth:'180px',wordBreak:'break-word'}}>{studioInv.alamat}</div>}
                          {studioInv?.noHp && <div style={{fontSize:'10px',color:'#777'}}>{studioInv.noHp}</div>}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'22px',fontWeight:'900',letterSpacing:'-1px'}}>INVOICE</div>
                        {invNomor && <div style={{fontSize:'13px',fontWeight:'700',color:'#555',marginTop:'2px'}}>#{invNomor}</div>}
                        <div style={{fontSize:'10px',color:'#888',marginTop:'4px'}}>{invTanggal ? new Date(invTanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-'}</div>

                      </div>
                    </div>

                    <div style={{height:'2.5px',background:'linear-gradient(to right, #1a1a1a, #999)',borderRadius:'2px',marginBottom:'20px'}}></div>

                    {invClient && (
                      <div style={{marginBottom:'16px',padding:'10px 14px',backgroundColor:'#f8f8f8',borderRadius:'8px',borderLeft:'3px solid #1a1a1a'}}>
                        <div style={{fontSize:'10px',color:'#888',marginBottom:'2px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Dibayarkan oleh</div>
                        <div style={{fontWeight:'700',fontSize:'12px'}}>{invClient}</div>
                      </div>
                    )}

                    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'12px'}}>
                      <thead>
                        <tr style={{backgroundColor:'#1a1a1a',color:'#fff'}}>
                          <th style={{padding:'8px 12px',textAlign:'left',fontSize:'10px',fontWeight:'700'}}>Deskripsi</th>
                          <th style={{padding:'8px 12px',textAlign:'right',fontSize:'10px',fontWeight:'700'}}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invItems.filter(i => i.deskripsi).map((item,i) => (
                          <tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{padding:'9px 12px',color:'#333'}}>{item.deskripsi}</td>
                            <td style={{padding:'9px 12px',textAlign:'right',fontWeight:'600'}}>{formatRupiah(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{marginLeft:'auto',width:'220px',marginBottom:'20px'}}>
                      {invDiskon > 0 && <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>Diskon</span><span style={{color:'#e53e3e',fontWeight:'600'}}>-{formatRupiah(invDiskon)}</span></div>}
                      <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>Sub Total</span><span style={{fontWeight:'600'}}>{formatRupiah(invSubtotal - invDiskon)}</span></div>
                      {invDP > 0 && <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f0f0f0'}}><span style={{color:'#777'}}>DP</span><span style={{fontWeight:'600'}}>-{formatRupiah(invDP)}</span></div>}
                      <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',backgroundColor:'#1a1a1a',color:'#fff',borderRadius:'8px',marginTop:'6px'}}>
                        <span style={{fontWeight:'700',fontSize:'12px'}}>TOTAL</span>
                        <span style={{fontWeight:'800',fontSize:'14px'}}>{formatRupiah(invTotal)}</span>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:'16px',marginBottom:'24px'}}>
                      {invCatatan && (
                        <div style={{flex:1,padding:'10px 12px',backgroundColor:'#f8f8f8',border:'1px solid #eee',borderRadius:'8px'}}>
                          <div style={{fontSize:'10px',fontWeight:'700',marginBottom:'4px',color:'#333'}}>Catatan</div>
                          <div style={{fontSize:'10px',color:'#555',lineHeight:'1.6',whiteSpace:'pre-line'}}>{invCatatan}</div>
                        </div>
                      )}
                      {studioInv?.rekening && (
                        <div style={{flex:1,padding:'10px 12px',backgroundColor:'#f8f8f8',borderRadius:'8px',border:'1px solid #eee'}}>
                          <div style={{fontSize:'10px',fontWeight:'700',marginBottom:'4px',color:'#333'}}>Informasi Pembayaran</div>
                          <div style={{fontSize:'10px',color:'#555',lineHeight:'1.7',whiteSpace:'pre-line'}}>{studioInv.rekening}</div>
                        </div>
                      )}
                    </div>

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',borderTop:'1px solid #eee',paddingTop:'16px'}}>
                      <div>
                        <div style={{fontSize:'9px',color:'#aaa',marginBottom:'6px'}}>Dicetak: {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
                        {invNomor && (
                          <svg width="120" height="38">
                            {invNomor.split('').map((ch: string, i: number) => {
                              const val = ch.charCodeAt(0)
                              const bars = val.toString(2).padStart(8,'0').split('')
                              return bars.map((b: string, j: number) => b==='1' ? (
                                <rect key={i*8+j} x={(i*8+j)*1.3} y={0} width={1.1} height={28} fill="#555" />
                              ) : null)
                            })}
                            <text x="60" y="37" textAnchor="middle" fontSize="7" fill="#888" fontFamily="monospace">{invNomor}</text>
                          </svg>
                        )}
                      </div>
                      <div style={{textAlign:'center',width:'120px'}}>
                        <div style={{fontSize:'10px',color:'#888',marginBottom:'40px'}}>{studioInv?.nama || 'Studio'}</div>
                        <div style={{borderTop:'1.5px solid #1a1a1a',paddingTop:'6px',fontWeight:'700',fontSize:'11px'}}>{setting.ownerNama || 'Owner'}</div>
                        {setting.ownerJabatan && <div style={{fontSize:'10px',color:'#888'}}>{setting.ownerJabatan}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* RIWAYAT INVOICE */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">Riwayat Invoice</h2>
                <button onClick={fetchInvRiwayat} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {invRiwayatLoading ? (
                <div className="text-center py-6 text-gray-400 text-sm">Memuat...</div>
              ) : invRiwayat.length === 0 ? (
                <div className="text-center py-6 text-gray-300 text-sm">Belum ada riwayat</div>
              ) : (
                <div className="space-y-2">
                  {invRiwayat.map(inv => (
                    <div key={inv.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{inv.nomor}</span>
                          {inv.client && <span className="text-xs text-gray-400 truncate">? {inv.client}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">{inv.tanggal ? new Date(inv.tanggal).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) : '-'}</span>
                          <span className="text-xs font-semibold text-gray-700">{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(inv.total)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => loadInvRiwayat(inv)} title="Load ke form"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => deleteInvRiwayat(inv.id)} title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>)}

          {/* LAPORAN INVESTOR */}
          {tab === 'laporan-investor' && (<>
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Investor & Periode</h3>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Investor</label>
                  <select value={lapInvestorId} onChange={e => setLapInvestorId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-gray-400">
                    <option value="">-- Pilih Investor --</option>
                    {investors.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bulan</label>
                    <select value={lapBulan} onChange={e => setLapBulan(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-gray-400">
                      {BULAN_FULL.map((b,i) => <option key={i} value={i}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tahun</label>
                    <input type="number" value={lapTahun} onChange={e => setLapTahun(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Data Keuangan</h3>
                  <button onClick={fetchLapOmzet} disabled={loadingLap}
                    className="flex items-center gap-1.5 text-xs text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
                    <RefreshCw className={`w-3 h-3 ${loadingLap ? 'animate-spin' : ''}`} /> Tarik dari DB
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Total Omzet Bulan Ini</label>
                  <input type="number" value={lapOmzet} onChange={e => setLapOmzet(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Total Bagi Hasil Bulan Ini</label>
                  <input type="number" value={lapBagiHasil} onChange={e => setLapBagiHasil(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  {invLaporan && <div className="text-xs text-gray-400 mt-1">Skema: Flat {invLaporan.skemaFlat}% ? modal = {formatRupiah(Math.round(invLaporan.modal * invLaporan.skemaFlat / 100))}/bln{invLaporan.skemaPersen > 0 ? ` + ${invLaporan.skemaPersen}% omzet` : ''}</div>}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Catatan Analisis (opsional)</label>
                <textarea value={lapCatatan} onChange={e => setLapCatatan(e.target.value)} rows={4}
                  placeholder="Highlight bulan ini, analisis, proyeksi..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-gray-400" />
              </div>

              <div className="bg-gray-900 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-center">
                <div><div className="text-xs text-gray-400">Bagi Hasil</div><div className="font-bold text-white text-sm">{formatRupiah(lapBagiHasil)}</div></div>
                <div><div className="text-xs text-gray-400">Monthly ROI</div><div className="font-bold text-white text-sm">{invLaporan?.modal ? ((lapBagiHasil/invLaporan.modal)*100).toFixed(2) : '0.00'}%</div></div>
                <div><div className="text-xs text-gray-400">Total ROI</div><div className="font-bold text-white text-sm">{invLaporan?.modal ? (((lapTotalBH+lapBagiHasil)/invLaporan.modal)*100).toFixed(2) : '0.00'}%</div></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={saveLaporan} disabled={savingLap || !lapInvestorId}
                  className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">
                  ?? {savingLap ? 'Menyimpan...' : 'Simpan Riwayat'}
                </button>
                <button onClick={async () => { await saveLapToDb(); downloadPdf(`LAPORAN-${invLaporan?.nama || 'investor'}-${BULAN_FULL[lapBulan]}-${lapTahun}`) }} disabled={!lapInvestorId}
                  className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => kirimWA(buildLaporanText())} disabled={!lapInvestorId}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 col-span-2">
                  💬 Kirim via WA
                </button>
              </div>
            </div>

            {/* PREVIEW LAPORAN */}
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-3">Preview Laporan Investor</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div ref={printRef}>
                  <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:'11px',color:'#1a1a1a',padding:'28px 32px'}}>
                    <div style={{textAlign:'center',marginBottom:'20px',paddingBottom:'16px',borderBottom:'2.5px solid #1a1a1a'}}>
                      <div style={{fontSize:'14px',fontWeight:'900',letterSpacing:'-0.3px',marginBottom:'4px'}}>LAPORAN PERFORMA BISNIS</div>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'#555',letterSpacing:'0.5px'}}>DISTRIBUSI HASIL BULANAN</div>
                      <div style={{display:'flex',justifyContent:'center',gap:'20px',marginTop:'8px',fontSize:'10px',color:'#888'}}>
                        <span>Periode: <strong style={{color:'#1a1a1a'}}>{periodeLap}</strong></span>
                        {invLaporan && <span>Investor: <strong style={{color:'#1a1a1a'}}>{invLaporan.nama}</strong></span>}
                      </div>
                    </div>

                    <div style={{marginBottom:'16px'}}>
                      <div style={{backgroundColor:'#1a1a1a',color:'#fff',padding:'6px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase'}}>I. Executive Summary</div>
                      <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #eee',borderTop:'none'}}>
                        <tbody>
                          {[
                            ['Total Modal Disetor', formatRupiah(invLaporan?.modal || 0)],
                            ['Total Pendapatan Bulan Ini', formatRupiah(lapOmzet)],
                            ['Total Bagi Hasil (Akumulasi)', formatRupiah(lapTotalBH + lapBagiHasil)],
                          ].map(([label, val], i) => (
                            <tr key={i} style={{backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                              <td style={{padding:'8px 12px',color:'#555',width:'60%'}}>{i+1}. {label}</td>
                              <td style={{padding:'8px 12px',textAlign:'right',fontWeight:'700'}}>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{marginBottom:'16px'}}>
                      <div style={{backgroundColor:'#1a1a1a',color:'#fff',padding:'6px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase'}}>II. Rincian Distribusi Hasil</div>
                      <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #eee',borderTop:'none'}}>
                        <thead style={{backgroundColor:'#f0f0f0'}}>
                          <tr>
                            <th style={{padding:'6px 12px',textAlign:'left',fontSize:'10px',color:'#555',fontWeight:'600'}}>Item</th>
                            <th style={{padding:'6px 12px',textAlign:'right',fontSize:'10px',color:'#555',fontWeight:'600'}}>Sub Total</th>
                            <th style={{padding:'6px 12px',textAlign:'right',fontSize:'10px',color:'#555',fontWeight:'600'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invLaporan && invLaporan.skemaFlat > 0 && (
                            <tr><td style={{padding:'7px 12px',color:'#555',paddingLeft:'20px'}}>Imbal Hasil Flat {invLaporan.skemaFlat}% ? {formatRupiah(invLaporan.modal)}</td><td style={{padding:'7px 12px',textAlign:'right'}}>{formatRupiah(Math.round(invLaporan.modal * invLaporan.skemaFlat / 100))}</td><td></td></tr>
                          )}
                          {invLaporan && invLaporan.skemaPersen > 0 && (
                            <tr><td style={{padding:'7px 12px',color:'#555',paddingLeft:'20px'}}>Imbal Hasil {invLaporan.skemaPersen}% ? {formatRupiah(lapOmzet)}</td><td style={{padding:'7px 12px',textAlign:'right'}}>{formatRupiah(Math.round(lapOmzet * invLaporan.skemaPersen / 100))}</td><td></td></tr>
                          )}
                          <tr style={{backgroundColor:'#f9f9f9',fontWeight:'700'}}>
                            <td style={{padding:'8px 12px'}}>Total Bagi Hasil Bulan Ini</td>
                            <td></td>
                            <td style={{padding:'8px 12px',textAlign:'right'}}>{formatRupiah(lapBagiHasil)}</td>
                          </tr>
                          <tr><td style={{padding:'6px 12px',color:'#777',paddingLeft:'20px'}}>Monthly ROI</td><td></td><td style={{padding:'6px 12px',textAlign:'right',color:'#555'}}>{invLaporan?.modal ? ((lapBagiHasil/invLaporan.modal)*100).toFixed(2) : '0.00'}%</td></tr>
                          <tr style={{backgroundColor:'#f9f9f9'}}><td style={{padding:'6px 12px',color:'#777',paddingLeft:'20px'}}>Total ROI (Akumulasi)</td><td></td><td style={{padding:'6px 12px',textAlign:'right',color:'#555'}}>{invLaporan?.modal ? (((lapTotalBH+lapBagiHasil)/invLaporan.modal)*100).toFixed(2) : '0.00'}%</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {lapCatatan && (
                      <div style={{marginBottom:'16px'}}>
                        <div style={{backgroundColor:'#1a1a1a',color:'#fff',padding:'6px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase'}}>III. Analisis Operasional</div>
                        <div style={{border:'1px solid #eee',borderTop:'none',padding:'12px',borderRadius:'0 0 6px 6px',lineHeight:'1.7',color:'#444',whiteSpace:'pre-line'}}>{lapCatatan}</div>
                      </div>
                    )}

                    <div style={{marginBottom:'20px'}}>
                      <div style={{backgroundColor:'#1a1a1a',color:'#fff',padding:'6px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase'}}>{lapCatatan ? 'IV' : 'III'}. Pernyataan Kepatuhan</div>
                      <div style={{border:'1px solid #eee',borderTop:'none',padding:'12px',borderRadius:'0 0 6px 6px',lineHeight:'1.7',color:'#555',fontSize:'10px'}}>{setting.pernyataanKepatuhan || 'Dengan ini kami menyatakan bahwa data yang disajikan dalam laporan ini adalah akurat, sesuai dengan rekaman transaksi yang di-input setiap harinya tanpa mengurangi dan mengubah apapun.'}</div>
                    </div>

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',borderTop:'1px solid #eee',paddingTop:'16px'}}>
                      <div style={{fontSize:'9px',color:'#aaa'}}>Dicetak: {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
                      <div style={{textAlign:'center',width:'180px'}}>
                        <div style={{fontSize:'10px',color:'#888',marginBottom:'40px'}}>Semarang, 1 {periodeLap}</div>
                        <div style={{borderTop:'1.5px solid #1a1a1a',paddingTop:'6px',fontWeight:'700',fontSize:'11px'}}>{setting.ownerNama || 'Owner'}</div>
                        {setting.ownerJabatan && <div style={{fontSize:'10px',color:'#888'}}>{setting.ownerJabatan}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* RIWAYAT LAPORAN INVESTOR */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">Riwayat Laporan Investor</h2>
                <button onClick={fetchLapRiwayat} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {lapRiwayatLoading ? (
                <div className="text-center py-6 text-gray-400 text-sm">Memuat...</div>
              ) : lapRiwayat.length === 0 ? (
                <div className="text-center py-6 text-gray-300 text-sm">Belum ada riwayat</div>
              ) : (
                <div className="space-y-2">
                  {lapRiwayat.map(item => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{item.label}</div>
                        <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => loadLapFromRiwayat(item)} title="Load ke form"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => deleteLapRiwayat(item.id)} title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>)}

        </div>
      </div>
    </div>
  )
}
