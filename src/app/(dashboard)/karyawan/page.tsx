'use client'

// ============================================================
// /karyawan — Manajemen Karyawan & User (SUPERADMIN)
// User CRUD + role dinamis + assign branch + approve Google pending
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { UsersRound, Plus, Loader2, Check, X } from 'lucide-react'

interface Branch { id: string; slug: string; nama: string }
interface Role { id: string; slug: string; label: string }
interface UserRow {
  id: string; name: string; email: string; role: string
  isActive: boolean; googleId: string | null; branchId: string | null; warna?: string | null
  branch?: { slug: string; nama: string } | null
  fotograferProfile?: { fotografer: { id: string; name: string } } | null
}

const emptyForm = { name: '', email: '', password: '', role: 'CASHIER', branchId: '', warna: '#3b82f6', isActive: true }

export default function KaryawanPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, r, b] = await Promise.all([
        fetch('/api/karyawan').then(x => x.json()),
        fetch('/api/roles').then(x => x.json()),
        fetch('/api/branches').then(x => x.json()),
      ])
      if (Array.isArray(u)) setUsers(u)
      if (Array.isArray(r)) setRoles(r.filter((x: any) => x.isActive))
      if (Array.isArray(b)) setBranches(b)
    } catch { setError('Gagal memuat data') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending = users.filter(u => !u.isActive)
  const active = users.filter(u => u.isActive)

  function openCreate() { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); setError('') }
  function openEdit(u: UserRow) {
    setEditId(u.id)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branchId: u.branchId || '', warna: u.warna || '#3b82f6', isActive: u.isActive })
    setShowForm(true); setError('')
  }

  async function save() {
    setError('')
    const body: any = { name: form.name.trim(), email: form.email.trim(), role: form.role, branchId: form.branchId || null, warna: form.warna, isActive: form.isActive }
    if (form.password) body.password = form.password
    if (!editId && !form.password) { setError('Password wajib untuk user baru'); return }

    const res = await fetch(editId ? `/api/karyawan/${editId}` : '/api/karyawan', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editId ? body : { ...body, password: form.password }),
    })
    const data = await res.json()
    if (!res.ok) {
      const det = data.details ? ' — ' + Object.entries(data.details).map(([k, v]: any) => `${k}: ${v}`).join(', ') : ''
      setError((data.error || 'Gagal menyimpan') + det)
      return
    }
    setShowForm(false); load()
  }

  async function approve(u: UserRow, role: string, branchId: string) {
    const res = await fetch(`/api/karyawan/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true, role, branchId: branchId || null }),
    })
    if (res.ok) load()
    else setError((await res.json()).error || 'Gagal approve')
  }

  async function remove(u: UserRow) {
    if (!confirm(`Hapus/nonaktifkan ${u.name}?`)) return
    const res = await fetch(`/api/karyawan/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Gagal menghapus'); return }
    if (data.info) alert(data.info)
    load()
  }

  const roleLabel = (slug: string) => roles.find(r => r.slug === slug)?.label || slug
  const branchLabel = (u: UserRow) => u.branch?.nama || (u.branchId ? u.branchId : 'Semua Studio')

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Team & User</h1>
            <p className="text-sm text-gray-500">Akun, role, dan penempatan studio</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
          <Plus className="w-4 h-4" /> Tambah Team
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* PENDING GOOGLE */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-amber-800">⏰ Menunggu Persetujuan / Nonaktif</p>
          {pending.map(u => <PendingRow key={u.id} user={u} roles={roles} branches={branches} onApprove={approve} onReject={() => remove(u)} />)}
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-bold">{editId ? 'Edit Anggota Team' : 'Anggota Team Baru'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@gmail.com" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? 'Password (opsional)' : 'Password'} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
              {roles.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
            </select>
            <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
              <option value="">Semua Studio</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <input type="color" value={form.warna} onChange={e => setForm(f => ({ ...f, warna: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
              <span className="text-xs text-gray-500">Warna jadwal</span>
            </div>
            <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-green-600" />
              <span className="text-xs text-gray-600">{form.isActive ? 'Akun Aktif' : 'Nonaktif'}</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm">Batal</button>
            <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold">{editId ? 'Update' : 'Simpan'}</button>
          </div>
        </div>
      )}

      {/* TABEL */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              {['Nama', 'Email', 'Role', 'Studio', 'Status', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: u.warna || '#d1d5db' }} />
                  {u.name}
                  {u.fotograferProfile && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">📷 Fotografer</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">{roleLabel(u.role)}</span></td>
                <td className="px-4 py-3 text-xs text-gray-600">{branchLabel(u)}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(u)} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 mr-1">Edit</button>
                  <button onClick={() => remove(u)} className="text-xs px-2.5 py-1.5 border border-red-100 bg-red-50 rounded-lg text-red-500 hover:bg-red-100">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PendingRow({ user, roles, branches, onApprove, onReject }: {
  user: UserRow; roles: Role[]; branches: Branch[]
  onApprove: (u: UserRow, role: string, branchId: string) => void
  onReject: () => void
}) {
  const [role, setRole] = useState('TEAM')
  const [branchId, setBranchId] = useState('')
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-amber-200 rounded-lg px-4 py-3">
      <div className="flex-1 min-w-[180px]">
        <p className="text-sm font-semibold">{user.name}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
      <select value={role} onChange={e => setRole(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
        {roles.filter(r => r.slug !== 'SUPERADMIN').map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
      </select>
      <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
        <option value="">Semua Studio</option>
        {branches.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
      </select>
      <button onClick={() => onApprove(user, role, branchId)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" /> Setujui</button>
      <button onClick={onReject} className="flex items-center gap-1 border border-red-200 bg-red-50 text-red-500 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100"><X className="w-3.5 h-3.5" /> Tolak</button>
    </div>
  )
}
