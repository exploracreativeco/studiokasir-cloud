'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Download, RefreshCw, Info } from 'lucide-react'

const CURRENT_VERSION = '1.2.0'
const DEVELOPER_LOGO = 'data:image/png;base64,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'
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/explorastudio/studiokasir/main/version.json'

export default function AboutPage() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)


  const hasUpdate = updateInfo && updateInfo.version && updateInfo.version !== CURRENT_VERSION

  async function checkUpdate() {
    setChecking(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(VERSION_CHECK_URL + '?t=' + Date.now(), { signal: controller.signal, cache: 'no-store' })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        setUpdateInfo(data)
      }
    } catch {
      setUpdateInfo(null)
    }
    setChecking(false)
    setChecked(true)
  }

  useEffect(() => { checkUpdate() }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tentang Aplikasi</h1>
        <p className="text-sm text-gray-500 mt-1">Informasi versi dan pembaruan StudioKasir</p>
      </div>

      {/* Versi sekarang */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">StudioKasir</div>
            <div className="text-xs text-gray-500">Point of Sale & Booking Management</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500">Versi Terpasang</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">v{CURRENT_VERSION}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500">Versi Terbaru</div>
            <div className="text-lg font-bold mt-0.5">
              {checking ? <span className="text-gray-400">Memeriksa...</span>
                : updateInfo?.version
                  ? <span className={hasUpdate ? 'text-amber-600' : 'text-emerald-600'}>v{updateInfo.version}</span>
                  : <span className="text-gray-400">—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Status update */}
      <div className={`rounded-2xl p-5 border ${hasUpdate ? 'bg-amber-50 border-amber-200' : checked ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start gap-3">
          {hasUpdate ? (
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          ) : checked ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <RefreshCw className={`w-5 h-5 text-gray-400 mt-0.5 shrink-0 ${checking ? 'animate-spin' : ''}`} />
          )}
          <div className="flex-1">
            <div className={`text-sm font-semibold ${hasUpdate ? 'text-amber-800' : checked ? 'text-emerald-800' : 'text-gray-600'}`}>
              {hasUpdate ? `Update tersedia: v${updateInfo.version}` : checked ? 'Aplikasi sudah versi terbaru' : 'Memeriksa pembaruan...'}
            </div>
            {hasUpdate && updateInfo?.notes && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-100 rounded-lg p-3 leading-relaxed whitespace-pre-line">
                {updateInfo.notes}
              </div>
            )}
            {hasUpdate && updateInfo?.downloadUrl && (
              <a href={updateInfo.downloadUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg w-fit transition-colors">
                <Download className="w-3.5 h-3.5" /> Download Update v{updateInfo.version}
              </a>
            )}
          </div>
        </div>
      </div>

      <button onClick={checkUpdate} disabled={checking}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        Periksa Ulang
      </button>

      {/* Info teknis */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Informasi Teknis</div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>Framework</span><span className="font-medium">Next.js 15</span></div>
          <div className="flex justify-between"><span>Database</span><span className="font-medium">SQLite + Prisma v5</span></div>
          <div className="flex justify-between"><span>Auth</span><span className="font-medium">NextAuth v5</span></div>
        </div>
      </div>

      {/* Kontak Developer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dikembangkan Oleh</div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl shrink-0 bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
            <img src={DEVELOPER_LOGO} alt="Explora Creative" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div className="font-bold text-gray-900">Explora Creative</div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Jalan Mulawarman Selatan Raya, Kramas, Tembalang, Semarang
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <a href="https://wa.me/6285176869677" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.057 23.535a.75.75 0 0 0 .916.919l5.733-1.498A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.697-.504-5.25-1.385l-.376-.217-3.9 1.019 1.035-3.793-.232-.382A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                085176869677
              </a>
              <a href="https://instagram.com/exploracreative.co" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-pink-600 hover:text-pink-700 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                @exploracreative.co
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
