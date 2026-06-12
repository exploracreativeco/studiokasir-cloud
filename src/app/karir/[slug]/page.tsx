'use client'

// ============================================================
// /karir/[slug] — form lamaran PUBLIK (ala Google Form)
// ============================================================
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Loader2, Check } from 'lucide-react'

interface Field { key: string; label: string; type: string; required: boolean; options?: string[] }
interface Lowongan { judul: string; posisi: string; deskripsi: string | null; fotoUrl?: string | null; fields: Field[] }

export default function KarirApplyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [lowongan, setLowongan] = useState<Lowongan | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [nama, setNama] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [jawaban, setJawaban] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/karir/${slug}`).then(r => r.ok ? r.json() : Promise.reject()).then(setLowongan).catch(() => setNotFound(true))
  }, [slug])

  async function submit() {
    setError('')
    if (!nama.trim() || !whatsapp.trim()) { setError('Nama dan WhatsApp wajib diisi'); return }
    setSubmitting(true)
    const res = await fetch(`/api/karir/${slug}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: nama.trim(), whatsapp: whatsapp.trim(), email: email.trim(), jawaban }),
    })
    setSubmitting(false)
    if (!res.ok) { setError((await res.json()).error || 'Gagal mengirim'); return }
    setDone(true)
  }

  if (notFound) return <Shell><p className="text-gray-400 text-sm text-center">Lowongan tidak ditemukan atau sudah ditutup.</p></Shell>
  if (!lowongan) return <Shell><div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div></Shell>
  if (done) return (
    <Shell>
      <div className="text-center space-y-3 py-10">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto"><Check className="w-7 h-7 text-green-600" /></div>
        <h2 className="font-bold text-lg">Lamaran Terkirim!</h2>
        <p className="text-sm text-gray-500">Terima kasih, {nama.split(' ')[0]}. Tim kami akan menghubungimu via WhatsApp jika lolos seleksi.</p>
      </div>
    </Shell>
  )

  return (
    <Shell>
      {lowongan.fotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lowongan.fotoUrl} alt={lowongan.judul} className="w-full rounded-xl mb-6 border border-gray-100" />
      )}
      <div className="mb-6">
        <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Open Recruitment</p>
        <h1 className="text-2xl font-bold">{lowongan.judul}</h1>
        <p className="text-sm text-blue-600 font-semibold">{lowongan.posisi}</p>
        {lowongan.deskripsi && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{lowongan.deskripsi}</p>}
      </div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="space-y-4">
        <Input label="Nama Lengkap *" value={nama} onChange={setNama} />
        <Input label="WhatsApp *" value={whatsapp} onChange={setWhatsapp} placeholder="08xxxxxxxxxx" />
        <Input label="Email" value={email} onChange={setEmail} type="email" />
        {lowongan.fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}{f.required && ' *'}</label>
            {f.type === 'paragraf' ? (
              <textarea rows={4} value={jawaban[f.key] || ''} onChange={e => setJawaban(j => ({ ...j, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            ) : f.type === 'checklist' ? (
              <div className="space-y-1.5">
                {(f.options || []).map(o => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(jawaban[f.key] || []).includes(o)}
                      onChange={e => setJawaban(j => ({ ...j, [f.key]: e.target.checked ? [...(j[f.key] || []), o] : (j[f.key] || []).filter((x: string) => x !== o) }))}
                      className="w-4 h-4 accent-blue-600" /> {o}
                  </label>
                ))}
              </div>
            ) : f.type === 'pilihan' ? (
              <select value={jawaban[f.key] || ''} onChange={e => setJawaban(j => ({ ...j, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="">— pilih —</option>
                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type === 'angka' ? 'number' : f.type === 'link' ? 'url' : 'text'}
                value={jawaban[f.key] || ''} onChange={e => setJawaban(j => ({ ...j, [f.key]: e.target.value }))}
                placeholder={f.type === 'link' ? 'https://… (mis. portofolio/IG)' : ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            )}
          </div>
        ))}
        <button onClick={submit} disabled={submitting} className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold rounded-lg py-3 text-sm">
          {submitting ? 'Mengirim…' : 'Kirim Lamaran'}
        </button>
      </div>
    </Shell>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f4f1] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Camera className="w-5 h-5" />
          <span className="font-bold tracking-tight">EXPLORA CREATIVE</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">{children}</div>
      </div>
    </main>
  )
}
