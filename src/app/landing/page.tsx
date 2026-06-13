// ============================================================
// Landing page v2 — exploracreative.co
// Semua konten editable via LandingSection:
// - Sub brand DINAMIS: semua key "brand_*" tampil otomatis (urutan)
//   → tambah brand baru = tambah row, tanpa coding
// - kenapa (USP), galeri, testimoni: editable juga
// ============================================================
import { prisma } from '@/lib/prisma'
import { LandingView, type LandingContent, type BrandItem } from './_components/sections'

export const revalidate = 300

const DEFAULT_BRANDS: BrandItem[] = [
  {
    key: 'brand_explora', nomor: 'FRAME 01', nama: 'Explora Studio',
    kategori: 'Studio Foto · Dengan Fotografer',
    deskripsi: 'Sesi foto terarah bersama fotografer profesional — keluarga, wisuda, grup, hingga produk. Kamu tinggal datang, kami yang mengarahkan.',
    ctaLabel: 'Booking Explora Studio', ctaUrl: 'https://explorastudio.id',
  },
  {
    key: 'brand_yours', nomor: 'FRAME 02', nama: 'Yours Self Studio',
    kategori: 'Self Photo Studio',
    deskripsi: 'Ruang privat dengan remote di tanganmu. Bebas berekspresi tanpa diawasi — hasil tetap kelas studio.',
    ctaLabel: 'Booking Yours Self Studio', ctaUrl: 'https://yoursselfstudio.id',
  },
  {
    key: 'brand_booth', nomor: 'FRAME 03', nama: 'Explora Booth',
    kategori: 'Photobooth & Videospin · Event',
    deskripsi: 'Photobooth dan 360° videospin untuk pernikahan, gathering, dan acara spesial. Tim kami datang, tamu pulang membawa kenangan.',
    ctaLabel: 'Tanya Explora Booth', ctaUrl: 'https://wa.me/6285176869677',
  },
]

const DEFAULTS: LandingContent = {
  hero: {
    eyebrow: 'Semarang, Indonesia',
    judul: 'Explora Creative',
    tagline: 'Photography & Videography Services',
    deskripsi: 'Satu rumah kreatif, tiga cara mengabadikan momenmu.',
  },
  brands: DEFAULT_BRANDS,
  kenapa: {
    judul: 'Kenapa harus ke kami?',
    poin: [
      { judul: 'Tim Profesional', isi: 'Fotografer & crew berpengalaman yang tahu cara membuat hasil terbaik — dan membuatmu nyaman di depan kamera.' },
      { judul: 'Hasil Cepat', isi: 'File foto siap dalam hitungan menit setelah sesi, bukan hitungan hari.' },
      { judul: 'Harga Transparan', isi: 'Semua paket dan harga jelas di awal. Tidak ada biaya tersembunyi.' },
      { judul: 'Tiga Pilihan Gaya', isi: 'Diarahkan fotografer, bebas sendiri, atau booth di acaramu — semua ada di satu tempat.' },
    ],
  },
  galeri: { judul: 'Galeri', fotoUrls: [] },
  testimoni: {
    judul: 'Kata Mereka',
    manual: [
      { nama: 'Pelanggan Explora', rating: 5, isi: 'Hasilnya bagus banget, fotografernya ramah dan sabar ngarahin gaya!' },
      { nama: 'Pelanggan Yours', rating: 5, isi: 'Tempatnya nyaman, privat, hasilnya aesthetic. Pasti balik lagi.' },
      { nama: 'Klien Booth', rating: 5, isi: 'Photobooth-nya jadi favorit tamu undangan. Crew-nya sigap dan profesional.' },
    ],
  },
  kontak: {
    judul: 'Kontak',
    alamat: 'Jalan Mulawarman Selatan Raya, Kramas, Tembalang, Semarang',
    whatsapp: '085176869677',
    instagram: 'exploracreative',
  },
}

async function getContent(): Promise<LandingContent> {
  try {
    const sections = await prisma.landingSection.findMany({
      where: { isActive: true },
      orderBy: { urutan: 'asc' },
    })
    const byKey = new Map(sections.map(s => [s.key, s]))
    const parse = (key: string) => {
      const row = byKey.get(key)
      if (!row?.konten) return null
      try {
        const j = JSON.parse(row.konten)
        return j.placeholder ? null : j
      } catch { return null }
    }

    // Brand DINAMIS: semua section key "brand_*" (urut sesuai kolom urutan)
    const brandSections = sections.filter(s => s.key.startsWith('brand_'))
    let brands: BrandItem[] = DEFAULT_BRANDS
    if (brandSections.length > 0) {
      const parsedBrands = brandSections.map((s, i) => {
        const def = DEFAULT_BRANDS.find(d => d.key === s.key)
        const j = parse(s.key) || {}
        return {
          key: s.key,
          nomor: j.nomor || def?.nomor || `FRAME ${String(i + 1).padStart(2, '0')}`,
          nama: j.nama || def?.nama || s.judul || s.key,
          kategori: j.kategori || def?.kategori || '',
          deskripsi: j.deskripsi || def?.deskripsi || '',
          ctaLabel: j.ctaLabel || def?.ctaLabel || 'Selengkapnya',
          ctaUrl: j.ctaUrl || def?.ctaUrl || '#',
          fotoUrl: j.fotoUrl || undefined,
        }
      })
      if (parsedBrands.length) brands = parsedBrands
    }

    return {
      hero: { ...DEFAULTS.hero, ...(parse('hero') || {}) },
      brands,
      kenapa: { ...DEFAULTS.kenapa, ...(parse('kenapa') || {}) },
      galeri: { ...DEFAULTS.galeri, ...(parse('galeri') || {}) },
      testimoni: { ...DEFAULTS.testimoni, ...(parse('testimoni') || {}) },
      kontak: { ...DEFAULTS.kontak, ...(parse('kontak') || {}) },
    }
  } catch {
    return DEFAULTS
  }
}

export default async function LandingPage() {
  const content = await getContent()
  return <LandingView content={content} />
}
