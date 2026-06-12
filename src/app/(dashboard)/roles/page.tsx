'use client'

// ============================================================
// /roles — Manajemen Role & Akses (SUPERADMIN)
// - CRUD role (slug, label, landing setelah login)
// - Matrix akses role × menu: tidak dicentang = hidden
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { Shield, Plus, Trash2, Save, Loader2, Check } from 'lucide-react'

interface Role {
  id: string; slug: string; label: string; defaultLanding: string
  isSystem: boolean; isActive: boolean; userCount?: number
}
interface MenuDef { key: string; label: string }
type Matrix = Record<string, Record<string, boolean>>

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [menus, setMenus] = useState<MenuDef[]>([])
  const [matrix, setMatrix] = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Form role baru
  const [showForm, setShowForm] = useState(false)
  const [fSlug, setFSlug] = useState('')
  const [fLabel, setFLabel] = useState('')
  const [fLanding, setFLanding] = useState('/jadwal')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/roles/access')
      const data = await res.json()
      if (res.ok) {
        setRoles(data.roles)
        setMenus(data.menus)
        setMatrix(data.matrix)
      } else setError(data.error || 'Gagal memuat')
    } catch { setError('Gagal memuat data') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createRole() {
    setError('')
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: fSlug.toUpperCase().trim().replace(/\s+/g, '_'), label: fLabel.trim(), defaultLanding: fLanding.startsWith('/') ? fLanding : '/' + fLanding }),
    })
    const data = await res.json()
    if (!res.ok) { const det = data.details ? ' — ' + JSON.stringify(data.details.fieldErrors) : ''; setError((data.error || 'Gagal membuat role') + det); return }
    setShowForm(false); setFSlug(''); setFLabel(''); setFLanding('/jadwal')
    load()
  }

  async function deleteRole(role: Role) {
    if (!confirm(`Hapus role ${role.label}?`)) return
    const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Gagal menghapus'); return }
    load()
  }

  async function updateLanding(role: Role, defaultLanding: string) {
    await fetch(`/api/roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultLanding }),
    })
    setRoles(rs => rs.map(r => (r.id === role.id ? { ...r, defaultLanding } : r)))
  }

  function toggle(role: string, menu: string) {
    if (role === 'SUPERADMIN') return
    setMatrix(m => ({ ...m, [role]: { ...m[role], [menu]: !m[role]?.[menu] } }))
    setSaved(false)
  }

  async function saveMatrix() {
    setSaving(true); setError('')
    const res = await fetch('/api/roles/access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix }),
    })
    if (!res.ok) setError('Gagal menyimpan matrix')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 h-full overflow-y-auto pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Role & Akses</h1>
            <p className="text-sm text-gray-500">Buat role, atur menu yang terlihat, dan halaman setelah login</p>
          </div>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
          <Plus className="w-4 h-4" /> Role Baru
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 grid sm:grid-cols-4 gap-3">
          <input value={fSlug} onChange={e => setFSlug(e.target.value)} placeholder="SLUG (mis. SECURITY)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm uppercase" />
          <input value={fLabel} onChange={e => setFLabel(e.target.value)} placeholder="Label (mis. Keamanan)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          <input value={fLanding} onChange={e => setFLanding(e.target.value)} placeholder="/jadwal" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          <button onClick={createRole} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg px-4">Simpan</button>
        </div>
      )}

      {/* Daftar role + landing */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Landing setelah login</th>
              <th className="px-4 py-3 font-medium text-center">User</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roles.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <span className="font-semibold">{r.label}</span>
                  <span className="ml-2 text-xs text-gray-400 font-mono">{r.slug}</span>
                  {r.isSystem && <span className="ml-2 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded">SYSTEM</span>}
                </td>
                <td className="px-4 py-3">
                  <input
                    defaultValue={r.defaultLanding}
                    onBlur={e => e.target.value !== r.defaultLanding && updateLanding(r, e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1.5 text-sm font-mono w-40"
                  />
                </td>
                <td className="px-4 py-3 text-center text-gray-500">{r.userCount ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  {!r.isSystem && (
                    <button onClick={() => deleteRole(r)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matrix akses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Matrix Akses Menu</h2>
          <button onClick={saveMatrix} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Tersimpan' : 'Simpan Matrix'}
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50">Menu</th>
                {roles.map(r => (
                  <th key={r.id} className="px-3 py-3 font-medium text-center whitespace-nowrap">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {menus.map(m => (
                <tr key={m.key}>
                  <td className="px-4 py-2.5 sticky left-0 bg-white font-medium whitespace-nowrap">{m.label}</td>
                  {roles.map(r => (
                    <td key={r.id} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={matrix[r.slug]?.[m.key] || false}
                        disabled={r.slug === 'SUPERADMIN'}
                        onChange={() => toggle(r.slug, m.key)}
                        className="w-4 h-4 accent-blue-600 disabled:opacity-40"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Menu yang tidak dicentang akan disembunyikan dari sidebar dan diblokir aksesnya. SUPERADMIN selalu punya akses penuh.</p>
      </div>
    </div>
  )
}
