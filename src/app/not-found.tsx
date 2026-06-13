'use client'

import { useEffect, useState } from 'react'
import { Camera, RefreshCw, Wifi, Server, AlertCircle } from 'lucide-react'

export default function NotFound() {
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')

  async function checkServer() {
    setChecking(true)
    try {
      const res = await fetch('/api/settings', { method: 'GET' })
      if (res.ok || res.status === 401) {
        setStatus('online')
        window.location.href = '/'
      } else {
        setStatus('offline')
      }
    } catch {
      setStatus('offline')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => checkServer(), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">StudioHub</h1>
        <p className="text-sm text-gray-500 mb-6">by Explora Creative</p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-700">Halaman tidak ditemukan</p>
          <p className="text-xs text-red-500 mt-1">Server mungkin sedang bermasalah</p>
        </div>

        <div className="space-y-3 text-left mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cara Mengatasi:</p>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <span>Tunggu 10-15 detik lalu klik <strong>Coba Lagi</strong></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span>Klik kanan <strong>fix_all.bat</strong> di <code className="bg-gray-100 px-1 rounded">C:\StudioHub</code> lalu Run as Administrator</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <span>Hubungi <strong>Explora Creative</strong> jika masalah berlanjut</span>
          </div>
        </div>

        <button onClick={checkServer} disabled={checking}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Memeriksa server...' : 'Coba Lagi'}
        </button>

        {status === 'offline' && (
          <p className="text-xs text-red-500 mt-3">Server tidak merespons. Jalankan fix_all.bat</p>
        )}

        <p className="text-xs text-gray-400 mt-4">© 2026 Explora Creative</p>
      </div>
    </div>
  )
}
