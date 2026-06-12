'use client'

// /order — pemilih studio (untuk yang dapat link generik)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, Loader2, MapPin } from 'lucide-react'

export default function OrderPickerPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/order-publik').then(r => r.json()).then(d => {
      if (Array.isArray(d.branches)) setBranches(d.branches)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-[#f5f4f1] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-2 justify-center">
          <Camera className="w-5 h-5" />
          <span className="font-bold tracking-tight">EXPLORA CREATIVE</span>
        </div>
        <p className="text-center text-sm text-gray-500 mb-8">Pilih studio tujuanmu</p>
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {branches.map(b => (
              <Link key={b.id} href={`/order/${b.slug}`}
                className="block bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-900 transition-all">
                <p className="font-bold text-lg">{b.nama}</p>
                {b.alamat && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.alamat}</p>}
                <p className="text-xs text-blue-600 font-semibold mt-2">Order di sini →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
