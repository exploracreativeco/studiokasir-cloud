'use client'

// ============================================================
// /akun — Akun Saya: profil + ubah/buat password
// Avatar inisial (warna jadwal). Nama panggilan untuk grid jadwal.
// User Google: tombol "Buat Password" (tanpa password lama).
// ============================================================
import { useEffect, useState } from 'react'
import { User, Loader2, Check, KeyRound } from 'lucide-react'

const initials = (nick: string | null, name: string) => {
  const src = (nick || name || '?').trim()
  const parts = src.split(/\s+/)
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase()
}

export default function AkunPage() {
  const [data, setData] = useState<any>(null)
  const [hasPassword, setHasPassword] = useState(true)
  const [form, setForm] = useState({ name: '', nickname: '', whatsapp: '', warna: '#3b82f6' })
  const [pw, setPw] = useState({ old: '', baru: '', ulang: '' })
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/account/profile').then(r => r.json()),
      fetch('/api/account/password').then(r => r.json()),
    ]).then(([p, pwInfo]) => {
      setData(p)
      setForm({ name: p.name || '', nickname: p.nickname || '', whatsapp: p.whatsapp || '', warna: p.warna || '#3b82f6' })
      setHasPassword(!!pwInfo.hasPassword)
    })
  }, [])

  async function saveProfile() {
    setSaving(true); setMsg('')
    const res = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setMsg(res.ok ? '✓ Profil tersimpan' : ((await res.json()).error || 'Gagal menyimpan'))
    if (res.ok) setData((d: any) => ({ ...d, ...form }))
  }

  async function savePassword() {
    setPwMsg('')
    if (pw.baru.length < 6) { setPwMsg('Password baru minimal 6 karakter'); return }
    if (pw.baru !== pw.ulang) { setPwMsg('Konfirmasi password tidak cocok'); return }
    setPwSaving(true)
    const res = await fetch('/api/account/password', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: pw.old, newPassword: pw.baru }),
    })
    const j = await res.json()
    setPwSaving(false)
    if (res.ok) {
      setPwMsg(j.created ? '✓ Password berhasil dibuat — sekarang bisa login via email juga' : '✓ Password berhasil diubah')
      setPw({ old: '', baru: '', ulang: '' }); setHasPassword(true)
    } else setPwMsg(j.error || 'Gagal')
  }

  if (!data) return <div className="flex items-center justify-center min-h-[50vh] text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-all'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Akun Saya</h1>
          <p className="text-sm text-gray-500">Kelola profil & keamanan akun</p>
        </div>
      </div>

      {/* Identitas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: form.warna }}>
            {initials(form.nickname, form.name)}
          </div>
          <div>
            <p className="font-bold text-lg">{data.name}</p>
            <p className="text-xs text-gray-500">{data.email}</p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{data.roleLabel}</span>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">{data.studioNama}</span>
              {data.googleId && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">Google</span>}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nama Lengkap</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" />
          </div>
          <div>
            <label className={labelCls}>Nama Panggilan <span className="text-gray-400">(tampil di jadwal)</span></label>
            <input className={inputCls} value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="mis. Khoer" />
          </div>
          <div>
            <label className={labelCls}>Nomor WhatsApp</label>
            <input className={inputCls} value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className={labelCls}>Warna Jadwal</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <input type="color" value={form.warna} onChange={e => setForm(f => ({ ...f, warna: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
              <span className="text-xs text-gray-500">Untuk avatar & sel jadwal</span>
            </div>
          </div>
        </div>

        {/* Read-only info */}
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelCls}>Email <span className="text-gray-400">(hubungi admin untuk ubah)</span></label>
            <input className={inputCls + ' bg-gray-50 text-gray-400'} value={data.email} disabled />
          </div>
          <div>
            <label className={labelCls}>Jabatan / Studio</label>
            <input className={inputCls + ' bg-gray-50 text-gray-400'} value={`${data.roleLabel} · ${data.studioNama}`} disabled />
          </div>
        </div>

        {msg && <p className={`text-xs mt-3 ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}
        <div className="flex justify-end mt-4">
          <button onClick={saveProfile} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Profil
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="font-bold flex items-center gap-2 mb-1"><KeyRound className="w-4 h-4 text-gray-500" /> {hasPassword ? 'Ubah Password' : 'Buat Password'}</p>
        <p className="text-xs text-gray-400 mb-4">{hasPassword ? 'Masukkan password lama untuk verifikasi.' : 'Akun kamu login via Google. Buat password agar bisa login via email juga.'}</p>
        <div className="space-y-3 max-w-sm">
          {hasPassword && (
            <input type="password" className={inputCls} placeholder="Password lama" value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} autoComplete="current-password" />
          )}
          <input type="password" className={inputCls} placeholder="Password baru (min. 6 karakter)" value={pw.baru} onChange={e => setPw(p => ({ ...p, baru: e.target.value }))} autoComplete="new-password" />
          <input type="password" className={inputCls} placeholder="Ulangi password baru" value={pw.ulang} onChange={e => setPw(p => ({ ...p, ulang: e.target.value }))} autoComplete="new-password" />
          {pw.baru && pw.ulang && pw.baru !== pw.ulang && <p className="text-xs text-red-500">Konfirmasi belum cocok</p>}
          {pwMsg && <p className={`text-xs ${pwMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg}</p>}
          <button onClick={savePassword} disabled={pwSaving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {hasPassword ? 'Ubah Password' : 'Buat Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
