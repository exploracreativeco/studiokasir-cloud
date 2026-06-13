'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { PageHeader, Badge, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  SUPERADMIN: { dashboard: true, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: true, laporan: true, sheets: true, admin: true, settings: true, manajemen: true, generate: true },
  ADMIN: { dashboard: false, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: true, laporan: false, sheets: false, admin: true, settings: false, manajemen: false, generate: false },
  CASHIER: { dashboard: false, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: false, laporan: false, sheets: false, admin: false, settings: false, manajemen: false, generate: false },
}

const MENU_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', kasir: 'Kasir', booking: 'Booking', ots: 'Order OTS',
  transaksi: 'Transaksi', customers: 'Customer', pengeluaran: 'Pengeluaran',
  laporan: 'Laporan', sheets: 'Sheets Sync', admin: 'Admin', settings: 'Pengaturan', manajemen: 'Manajemen', generate: 'Generate',
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('studio')
  const [showPass, setShowPass] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [backing, setBacking] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetBulan, setResetBulan] = useState('')
  const [resetTahun, setResetTahun] = useState(String(new Date().getFullYear()))
  const [resettingBulan, setResettingBulan] = useState(false)
  const [exportMode, setExportMode] = useState<'all' | 'bulan'>('all')
  const [exportBulan, setExportBulan] = useState(String(new Date().getMonth() + 1).padStart(2,'0'))
  const [exportTahun, setExportTahun] = useState(String(new Date().getFullYear()))
  const [users, setUsers] = useState<any[]>([])
  const [roleAccess, setRoleAccess] = useState<Record<string, Record<string, boolean>>>(DEFAULT_ACCESS)
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' })
  const [editUserId, setEditUserId] = useState<string | null>(null)

  // Settings state - pakai state biasa
  const [form, setForm] = useState({
    studioName: '',
    address: '',
    whatsapp: '',
    instagram: '',
    invoiceFooter: '',
    webhookUrl: '',
    spreadsheetId: '',
    syaratKetentuan: '',
    emailHost: '',
    emailPort: '587',
    emailUser: '',
    emailPass: '',
    emailFrom: '',
    emailSubject: '',
    backupEmail: '',
    backupSchedule: 'OFF',
    backupTime: '22:00',
    backupDay: '1',
    lastBackupAt: '',
    backupIncludeExcel: 'true',
    backupLocalFolder: 'true',
  })

  const TABS = [
    { id: 'studio', label: 'Studio' },
    { id: 'email', label: 'Email' },
    { id: 'backup', label: 'Backup' },
    ...(isSuperAdmin ? [
      { id: 'users', label: '👥 Users' },
      { id: 'access', label: 'Hak Akses' },
      { id: 'developer', label: 'Developer' },
    ] : []),
  ]

  async function load() {
    setLoading(true)
    const promises: Promise<any>[] = [fetch('/api/settings')]
    if (isSuperAdmin) promises.push(fetch('/api/users'))
    if (isSuperAdmin) {
      fetch('/api/users?pending=true').then(r => r.json()).then(data => {
        setPendingUsers(Array.isArray(data) ? data.filter((u: any) => !u.isActive) : [])
      }).catch(() => {})
    }
    const results = await Promise.all(promises)
    if (results[0].ok) {
      const s = await results[0].json()
      setForm({
        studioName: s?.studioName || '',
        address: s?.address || '',
        whatsapp: s?.whatsapp || '',
        instagram: s?.instagram || '',
        invoiceFooter: s?.invoiceFooter || '',
        webhookUrl: s?.webhookUrl || '',
        spreadsheetId: s?.spreadsheetId || '',
        syaratKetentuan: s?.syaratKetentuan || '',
        emailHost: s?.emailHost || '',
        emailPort: String(s?.emailPort || '587'),
        emailUser: s?.emailUser || '',
        emailPass: s?.emailPass || '',
        emailFrom: s?.emailFrom || '',
        emailSubject: s?.emailSubject || '',
        backupEmail: s?.backupEmail || s?.emailUser || '',
        backupSchedule: s?.backupSchedule || 'OFF',
        backupTime: s?.backupTime || '22:00',
        backupDay: s?.backupDay || '1',
        lastBackupAt: s?.lastBackupAt || '',
        backupIncludeExcel: s?.backupIncludeExcel || 'true',
        backupLocalFolder: s?.backupLocalFolder || 'true',
      })
      setLogoUrl(s?.logoUrl || '')
    }
    if (isSuperAdmin && results[1]?.ok) setUsers(await results[1].json())
    if (isSuperAdmin) {
      const [adminAccess, cashierAccess] = await Promise.all([
        fetch('/api/users/access?role=ADMIN').then(r => r.json()),
        fetch('/api/users/access?role=CASHIER').then(r => r.json()),
      ])
      setRoleAccess({ SUPERADMIN: DEFAULT_ACCESS.SUPERADMIN, ADMIN: adminAccess, CASHIER: cashierAccess })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [isSuperAdmin])

  async function saveSettings() {
    if (!form.studioName) { toast({ title: 'Nama studio wajib diisi', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const current = await fetch('/api/settings').then(r => r.json())
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...current,
          ...form,
          emailPort: Number(form.emailPort) || 587,
        }),
      })
      if (res.ok) {
        toast({ title: 'Pengaturan tersimpan!' })
      } else {
        const err = await res.json()
        toast({ title: 'Gagal: ' + JSON.stringify(err.error), variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.ok) { setLogoUrl(data.logoUrl); toast({ title: 'Logo berhasil diupload!' }) }
    else toast({ title: 'Gagal upload: ' + data.error, variant: 'destructive' })
    setUploadingLogo(false)
  }

  async function exportExcelNow() {
    setSaving(true)
    try {
      let url = '/api/export-data'
      if (exportMode === 'bulan') {
        const lastDay = new Date(parseInt(exportTahun), parseInt(exportBulan), 0).getDate()
        const from = `${exportTahun}-${exportBulan}-01`
        const to = `${exportTahun}-${exportBulan}-${String(lastDay).padStart(2,'0')}`
        url = `/api/export-data?from=${from}&to=${to}`
      }
      const res = await fetch(url)
      if (!res.ok) { toast({ title: 'Gagal export Excel', variant: 'destructive' }); return }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `StudioHub_Backup_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`
      a.click()
      URL.revokeObjectURL(blobUrl)
      toast({ title: 'Export Excel berhasil!' })
    } finally {
      setSaving(false)
    }
  }

  async function runBackup() {
    setSaving(true)
    const current = await fetch('/api/settings').then(r => r.json())
    await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, backupEmail: form.backupEmail, backupSchedule: form.backupSchedule, backupTime: form.backupTime, backupDay: form.backupDay }),
    })
    toast({ title: 'Pengaturan backup tersimpan!' })
    setSaving(false)
    setBacking(true)
    const res = await fetch('/api/backup', { method: 'POST' })
    const data = await res.json()
    if (data.ok) { toast({ title: `Backup berhasil! Dikirim ke ${data.sentTo} (${data.size})` }); setForm(f => ({ ...f, lastBackupAt: new Date().toISOString() })) }
    else toast({ title: 'Gagal backup: ' + (data.error || 'Unknown error'), variant: 'destructive' })
    setBacking(false)
  }

  async function saveBackup() {
    setSaving(true)
    const current = await fetch('/api/settings').then(r => r.json())
    await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, backupEmail: form.backupEmail, backupSchedule: form.backupSchedule, backupTime: form.backupTime, backupDay: form.backupDay }),
    })
    toast({ title: 'Pengaturan backup tersimpan!' })
    setSaving(false)
  }

  async function approveUser(userId: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    if (res.ok) {
      toast({ title: 'User disetujui!' })
      fetch('/api/users?pending=true').then(r => r.json()).then(data => {
        setPendingUsers(Array.isArray(data) ? data.filter((u: any) => !u.isActive) : [])
      }).catch(() => {})
    }
  }


  async function saveUser() {
    if (!userForm.name || !userForm.email) { toast({ title: 'Nama dan email wajib diisi', variant: 'destructive' }); return }
    if (!editUserId && !userForm.password) { toast({ title: 'Password wajib diisi', variant: 'destructive' }); return }
    const url = editUserId ? `/api/users/${editUserId}` : '/api/users'
    const method = editUserId ? 'PUT' : 'POST'
    const body = editUserId && !userForm.password ? { name: userForm.name, email: userForm.email, role: userForm.role } : userForm
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast({ title: editUserId ? 'User diupdate!' : 'User ditambahkan!' }); setShowUserForm(false); setEditUserId(null); setUserForm({ name: '', email: '', password: '', role: 'CASHIER' }); load() }
    else { const d = await res.json(); toast({ title: d.error || 'Gagal', variant: 'destructive' }) }
  }

  async function deleteUser(id: string) {
    if (!confirm('Hapus user ini?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast({ title: 'User dihapus' }); load()
  }

  async function saveAccess(role: string, access: Record<string, boolean>) {
    await fetch('/api/users/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, access }) })
    toast({ title: `Akses ${role} tersimpan!` })
  }

  async function resetTransaksiPerBulan() {
    if (!resetBulan || !resetTahun) return
    const bulanLabel = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(resetBulan)-1]
    const konfirmasi = prompt(`Ketik "RESET" untuk menghapus semua transaksi bulan ${bulanLabel} ${resetTahun}`)
    if (konfirmasi !== 'RESET') { toast({ title: 'Dibatalkan' }); return }
    setResettingBulan(true)
    const res = await fetch(`/api/developer/reset?section=transactions-bulan&bulan=${resetBulan}&tahun=${resetTahun}`, { method: 'DELETE' })
    if (res.ok) toast({ title: `Transaksi ${bulanLabel} ${resetTahun} berhasil direset!` })
    else toast({ title: 'Gagal reset', variant: 'destructive' })
    setResettingBulan(false)
  }

  async function resetSection(section: string, label: string) {
    const input = prompt(`Ketik "RESET" untuk menghapus semua data ${label}`)
    if (input !== 'RESET') return
    setResetting(section)
    const res = await fetch(`/api/developer/reset?section=${section}`, { method: 'DELETE' })
    if (res.ok) toast({ title: `${label} berhasil direset!` })
    else toast({ title: 'Gagal reset', variant: 'destructive' })
    setResetting(null)
  }

  const inp = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  })

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Pengaturan" subtitle="Konfigurasi studio, email, backup, dan akses" />
      <div className="px-5 pb-5">
        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* STUDIO */}
        {activeTab === 'studio' && (
          <div className="max-w-xl space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Logo Studio</label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain border border-gray-200 rounded-lg bg-gray-50" />
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300"><span className="text-2xl"></span></div>
                  )}
                  <div>
                    <label className="cursor-pointer flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                      {uploadingLogo ? 'Mengupload...' : logoUrl ? ' Ganti Logo' : ' Logo'}
                      <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" disabled={uploadingLogo} />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">PNG/JPG, maks 2MB</p>
                  </div>
                </div>
              </div>
              {[
                { field: 'studioName' as const, label: 'Studio', placeholder: 'Kexplora Studio' },
                { field: 'address' as const, label: 'Alamat', placeholder: 'Jl. Contoh No. 1' },
                { field: 'whatsapp' as const, label: 'WhatsApp', placeholder: '+62812...' },
                { field: 'instagram' as const, label: 'Instagram', placeholder: '@namastudio' },
                { field: 'invoiceFooter' as const, label: 'Footer Invoice', placeholder: 'Terima kasih...' },
                { field: 'webhookUrl' as const, label: 'Google Sheets Webhook URL', placeholder: 'https://script.google.com/...' },
                { field: 'spreadsheetId' as const, label: 'Spreadsheet ID', placeholder: '1BxiMVs0XRA5...' },
                { field: 'syaratKetentuan' as const, label: 'Syarat & Ketentuan (Invoice)', placeholder: 'Pembayaran lunas sebelum sesi...' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                  <input {...inp(f.field)} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
            <button onClick={saveSettings} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        )}

        {/* EMAIL */}
        {activeTab === 'email' && (
          <div className="max-w-xl space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              {[
                { field: 'emailHost' as const, label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
                { field: 'emailPort' as const, label: 'SMTP Port', placeholder: '587' },
                { field: 'emailUser' as const, label: 'Email', placeholder: 'studio@gmail.com' },
                { field: 'emailFrom' as const, label: 'Nama Pengirim', placeholder: 'Kexplora Studio' },
                { field: 'emailSubject' as const, label: 'Email', placeholder: 'Invoice dari Kexplora Studio' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                  <input {...inp(f.field)} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">App Password Gmail</label>
                <div className="relative">
                  <input {...inp('emailPass')} type={showPass ? 'text' : 'password'} placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={saveSettings} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300">
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan Email'}
            </button>
          </div>
        )}

        {/* BACKUP */}
        {activeTab === 'backup' && (
          <div className="max-w-lg space-y-4">

            {/* Export Excel Manual */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Export Excel</h3>
                <p className="text-xs text-gray-400 mb-3">Download data dalam 1 file Excel. Pilih semua data atau per bulan.</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setExportMode('all')}
                    className={`flex-1 text-xs py-2 rounded-lg font-semibold border transition-colors ${exportMode === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    Semua Data
                  </button>
                  <button onClick={() => setExportMode('bulan')}
                    className={`flex-1 text-xs py-2 rounded-lg font-semibold border transition-colors ${exportMode === 'bulan' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    Per Bulan
                  </button>
                </div>
                {exportMode === 'bulan' && (
                  <div className="flex gap-2 mb-3">
                    <select value={exportBulan} onChange={e => setExportBulan(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                      {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((b,i) => (
                        <option key={i} value={String(i+1).padStart(2,'0')}>{b}</option>
                      ))}
                    </select>
                    <input type="number" value={exportTahun} onChange={e => setExportTahun(e.target.value)}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                )}
              </div>
              <button onClick={exportExcelNow} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold py-2.5 rounded-xl">
                {saving ? 'Mengexport...' : exportMode === 'bulan' ? `Export ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(exportBulan)-1]} ${exportTahun}` : 'Export Semua Data'}
              </button>
            </div>

            {/* Backup Database + Jadwal */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-1"> Otomatis</h3>
                <p className="text-xs text-gray-400">Backup database + Excel dikirim via email secara terjadwal.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Tujuan Backup</label>
                <input {...inp('backupEmail')} placeholder="email@gmail.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <p className="text-[10px] text-gray-400 mt-1">Kosongkan = pakai email SMTP.</p>
              </div>

              {/* Opsi isi backup */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-500">Isi Backup</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.backupIncludeExcel === 'true'}
                    onChange={e => setForm(f => ({ ...f, backupIncludeExcel: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700"> Sertakan file Excel data</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.backupLocalFolder === 'true'}
                    onChange={e => setForm(f => ({ ...f, backupLocalFolder: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700"> ke folder lokal <span className="text-xs text-gray-400 font-mono">C:\StudioHub\backups\</span></span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Jadwal Backup Otomatis</label>
                <select {...inp('backupSchedule')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="OFF">Nonaktif</option>
                  <option value="DAILY">Harian</option>
                  <option value="WEEKLY">Mingguan</option>
                  <option value="MONTHLY">Bulanan</option>
                </select>
              </div>
              {form.backupSchedule !== 'OFF' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Jam Backup</label>
                    <input type="time" {...inp('backupTime')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>
                  {form.backupSchedule === 'MONTHLY' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal</label>
                      <input type="number" min="1" max="28" {...inp('backupDay')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={saveBackup} disabled={saving}
                className="flex items-center gap-1.5 border border-gray-200 bg-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex-1 justify-center">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
              <button onClick={runBackup} disabled={backing}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex-1 justify-center">
                {backing ? 'Memproses...' : ' Sekarang'}
              </button>
            </div>
            {form.lastBackupAt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700">
 ✅ Backup terakhir: {new Date(form.lastBackupAt).toLocaleString('id-ID')}
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setShowUserForm(true); setEditUserId(null); setUserForm({ name: '', email: '', password: '', role: 'CASHIER' }) }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah User</button>
            </div>
            {showUserForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 max-w-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama*</label>
                    <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Email*</label>
                    <input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@gmail.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Password{editUserId ? ' (kosongkan jika tidak diubah)' : '*'}</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Password"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                    <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      <option value="CASHIER">Kasir</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERADMIN">Super Admin</option>
                    </select></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowUserForm(false); setEditUserId(null) }} className="flex-1 border border-gray-200 bg-white rounded-lg py-2 text-sm">Batal</button>
                  <button onClick={saveUser} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold">{editUserId ? 'Update' : 'Tambah'}</button>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Nama','Email','Role','Status','Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                      <td className="px-4 py-3"><Badge variant={u.role === 'SUPERADMIN' ? 'red' : u.role === 'ADMIN' ? 'blue' : 'default'}>{u.role}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={u.isActive ? 'green' : 'default'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => { setEditUserId(u.id); setUserForm({ name: u.name, email: u.email, password: '', role: u.role }); setShowUserForm(true) }}
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600">Edit</button>
                        <button onClick={() => deleteUser(u.id)}
                          className="text-xs px-2 py-1 border border-red-100 bg-red-50 rounded-lg text-red-400 hover:bg-red-100">Hapus</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HAK AKSES */}
        {activeTab === 'access' && isSuperAdmin && (
          <div className="space-y-4 max-w-2xl">
            {['ADMIN', 'CASHIER'].map(role => (
              <div key={role} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">{role === 'ADMIN' ? ' Admin' : ''}</h3>
                  <button onClick={() => saveAccess(role, roleAccess[role])}
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    <Save className="w-3.5 h-3.5" /> Simpan Akses
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(MENU_LABELS).map(([menu, label]) => (
                    role === 'CASHIER' && ['admin', 'settings'].includes(menu) ? null :
                    <label key={menu} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input type="checkbox"
                        checked={roleAccess[role]?.[menu] ?? false}
                        onChange={e => setRoleAccess(prev => ({ ...prev, [role]: { ...prev[role], [menu]: e.target.checked } }))}
                        disabled={menu === 'kasir'}
                        className="w-4 h-4 rounded accent-blue-600" />
                      <span className="text-sm text-gray-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DEVELOPER */}
        {activeTab === 'developer' && isSuperAdmin && (
          <div className="max-w-lg space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-sm font-bold text-red-700 mb-1">⚠️ Developer Zone</div>
              <p className="text-xs text-red-600">Reset data per section. Data yang dihapus <strong>tidak bisa dikembalikan</strong>. Ketik "RESET" untuk konfirmasi.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {[
                { section: 'transactions', label: 'Transaksi', desc: 'Semua riwayat transaksi paket', color: 'red' },
                { section: 'booking', label: 'Booking & DP', desc: 'Semua data booking dan DP', color: 'red' },
                { section: 'ots', label: 'Order OTS', desc: 'Semua order OTS', color: 'red' },
                { section: 'expenses', label: 'Pengeluaran', desc: 'Semua data pengeluaran', color: 'red' },
                { section: 'customers', label: 'Customer', desc: 'Customer + semua transaksi terkait', color: 'red' },
                { section: 'packages', label: 'Paket', desc: 'Semua paket foto + biaya ops paket', color: 'orange' },
                { section: 'addons', label: 'Add-On', desc: 'Semua add-on', color: 'orange' },
                { section: 'promos', label: 'Promo', desc: 'Semua kode promo', color: 'orange' },
              ].map(item => (
                <div key={item.section} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  <button onClick={() => resetSection(item.section, item.label)} disabled={resetting === item.section}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${item.color === 'red' ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'}`}>
                    {resetting === item.section ? 'Menghapus...' : 'Reset'}
                  </button>
                </div>
              ))}
            </div>

            {/* Reset Transaksi Per Bulan */}
            <div className="bg-white border border-red-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-red-700 mb-1">Reset Transaksi Per Bulan</div>
              <p className="text-xs text-gray-400 mb-3">Hapus semua transaksi kasir di bulan & tahun tertentu. Tidak bisa dikembalikan.</p>
              <div className="flex gap-2 items-center">
                <select value={resetBulan} onChange={e => setResetBulan(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs flex-1">
                  <option value="">-- Pilih Bulan --</option>
                  {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((b,i) => (
                    <option key={i+1} value={String(i+1).padStart(2,'0')}>{b}</option>
                  ))}
                </select>
                <input type="number" value={resetTahun} onChange={e => setResetTahun(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-20" placeholder="Tahun" />
                <button onClick={resetTransaksiPerBulan} disabled={resettingBulan || !resetBulan}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors">
                  {resettingBulan ? 'Menghapus...' : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}

      </div>
    </div>
  )
}
