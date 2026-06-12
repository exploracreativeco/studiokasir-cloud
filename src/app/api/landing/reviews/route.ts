// ============================================================
// api/landing/reviews — Google Reviews per studio (publik)
//
// Sumber: Google Places API (Place Details).
// Catatan penting: Google hanya mengembalikan ±5 ulasan teratas
// per lokasi + rating agregat + total jumlah ulasan.
//
// Konfigurasi (diisi nanti, tanpa coding):
// 1. Env: GOOGLE_MAPS_API_KEY (Google Cloud project StudioKasir,
//    enable "Places API")
// 2. LandingSection key "testimoni" → konten JSON:
//    { "placeIds": { "Explora Studio": "ChIJxxxx", "Yours": "ChIJyyyy" } }
//
// Belum dikonfigurasi → { configured: false } → landing pakai
// testimoni manual. Cache 6 jam (hemat kuota API).
// ============================================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 21600 // 6 jam

interface GoogleReview {
  sumber: string
  nama: string
  rating: number
  isi: string
  waktu?: string
  fotoProfil?: string
}

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return NextResponse.json({ configured: false, reviews: [] })

  let placeIds: Record<string, string> = {}
  try {
    const section = await prisma.landingSection.findUnique({ where: { key: 'testimoni' } })
    if (section?.konten) {
      const j = JSON.parse(section.konten)
      placeIds = j.placeIds || {}
    }
  } catch { /* ignore */ }

  const entries = Object.entries(placeIds)
  if (entries.length === 0) return NextResponse.json({ configured: false, reviews: [] })

  const reviews: GoogleReview[] = []
  const ratings: Array<{ sumber: string; rating: number; total: number }> = []

  await Promise.all(entries.map(async ([sumber, placeId]) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&fields=rating,user_ratings_total,reviews&language=id&key=${apiKey}`
      const res = await fetch(url, { next: { revalidate: 21600 } })
      const data = await res.json()
      if (data.status !== 'OK') return
      const r = data.result
      if (r.rating) ratings.push({ sumber, rating: r.rating, total: r.user_ratings_total || 0 })
      for (const rv of r.reviews || []) {
        reviews.push({
          sumber,
          nama: rv.author_name,
          rating: rv.rating,
          isi: rv.text,
          waktu: rv.relative_time_description,
          fotoProfil: rv.profile_photo_url,
        })
      }
    } catch { /* satu lokasi gagal → lanjut lokasi lain */ }
  }))

  // Urutkan: rating tertinggi + yang ada isinya dulu
  reviews.sort((a, b) => b.rating - a.rating || b.isi.length - a.isi.length)

  return NextResponse.json({ configured: true, ratings, reviews: reviews.slice(0, 9) })
}
