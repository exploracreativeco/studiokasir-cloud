'use client'
import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Clock, LogOut, Phone } from 'lucide-react'

export default function WaitingPage() {
  const { data: session } = useSession()
  const [setting, setSetting] = useState<any>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSetting).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>

        {/* Studio name */}
        {setting?.studioName && (
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            {setting.studioName}
          </div>
        )}

        <h1 className="text-xl font-bold text-gray-900 mb-3">
          Menunggu Persetujuan Admin
        </h1>

        <div className="text-sm text-gray-600 leading-relaxed mb-6 space-y-2">
          <p>
            Halo <strong>{session?.user?.name || 'Kamu'}</strong>, akun kamu dengan email{' '}
            <strong>{session?.user?.email}</strong> telah terdaftar namun belum mendapat akses ke sistem.
          </p>
          <p>
            Mohon tunggu hingga Admin mengaktifkan akun kamu. Proses ini biasanya membutuhkan waktu
            singkat setelah konfirmasi dari pengelola studio.
          </p>
          <p>
            Jika ingin mempercepat proses, silakan hubungi Admin atau pengelola studio melalui kontak di bawah ini.
          </p>
        </div>

        {/* Kontak studio */}
        {setting?.whatsapp && (
          <a
            href={`https://wa.me/${setting.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 mb-3 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Hubungi via WhatsApp
          </a>
        )}

        {setting?.whatsapp && (
          <p className="text-xs text-gray-400 mb-4">{setting.whatsapp}</p>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium rounded-xl py-3 text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>

        <p className="text-xs text-gray-300 mt-4">
          {setting?.studioName || 'StudioHub'} — Sistem Manajemen Studio
        </p>
      </div>
    </div>
  )
}
