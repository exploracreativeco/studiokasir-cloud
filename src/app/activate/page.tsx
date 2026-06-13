'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivatePage() {
  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Cek apakah license.key sudah ada, kalau ada set cookie dan redirect
    fetch('/api/license/check')
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          router.push('/login')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [])

  const handleActivate = async () => {
    if (!serial.trim()) {
      setError('Masukkan serial number terlebih dahulu')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: serial.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/login')
      } else {
        setError(data.message || 'Serial number tidak valid')
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Memeriksa lisensi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aktivasi StudioHub</h1>
          <p className="text-gray-500 mt-2 text-sm">Masukkan serial number untuk mengaktifkan aplikasi</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              placeholder="EXPLORA-KN-XXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg tracking-widest"
              maxLength={19}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {loading ? 'Mengaktifkan...' : 'Aktifkan Sekarang'}
          </button>
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">Hubungi developer untuk mendapatkan serial number</p>
          <p className="text-xs text-gray-400 mt-1">© 2026 Explora Creative</p>
        </div>
      </div>
    </div>
  )
}
