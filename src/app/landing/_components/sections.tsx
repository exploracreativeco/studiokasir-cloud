'use client'

// ============================================================
// Landing v2 — brand lebih menonjol (panel besar bergantian),
// Kenapa Kami, Galeri, Testimoni (Google reviews + fallback manual)
// ============================================================
import { useEffect, useState } from 'react'
import { Camera, ArrowUpRight, Instagram, MapPin, Phone, Star } from 'lucide-react'

export interface BrandItem {
  key: string; nomor: string; nama: string; kategori: string
  deskripsi: string; ctaLabel: string; ctaUrl: string; fotoUrl?: string
}
export interface LandingContent {
  hero: { eyebrow: string; judul: string; tagline: string; deskripsi: string }
  brands: BrandItem[]
  kenapa: { judul: string; poin: Array<{ judul: string; isi: string }> }
  galeri: { judul: string; fotoUrls: string[] }
  testimoni: { judul: string; manual: Array<{ nama: string; rating: number; isi: string; sumber?: string; waktu?: string }> }
  kontak: { judul: string; alamat: string; whatsapp: string; instagram: string }
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal')
    const io = new IntersectionObserver(
      es => es.forEach(e => e.isIntersecting && e.target.classList.add('lp-in')),
      { threshold: 0.1 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** Testimoni: coba Google reviews, fallback manual */
function useReviews(manual: LandingContent['testimoni']['manual']) {
  const [reviews, setReviews] = useState(manual)
  const [fromGoogle, setFromGoogle] = useState(false)
  useEffect(() => {
    fetch('/api/landing/reviews')
      .then(r => r.json())
      .then(d => {
        if (d.configured && d.reviews?.length) {
          setReviews(d.reviews)
          setFromGoogle(true)
        }
      })
      .catch(() => {})
  }, [])
  return { reviews, fromGoogle }
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-3.5 h-3.5" fill={i <= n ? 'var(--lp-ink)' : 'none'} strokeWidth={1.5} />
      ))}
    </span>
  )
}

export function LandingView({ content }: { content: LandingContent }) {
  useReveal()
  const { hero, brands, kenapa, galeri, testimoni, kontak } = content
  const { reviews, fromGoogle } = useReviews(testimoni.manual)
  const waUrl = `https://wa.me/62${kontak.whatsapp.replace(/^0/, '').replace(/\D/g, '')}`

  return (
    <main>
      {/* ===== NAV ===== */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2.5">
          <Camera className="w-5 h-5" strokeWidth={2.2} />
          <span className="lp-display font-bold text-[17px] tracking-tight">EXPLORA CREATIVE</span>
        </div>
        <a href="https://app.exploracreative.id/login" className="lp-mono hover:text-[var(--lp-ink)] transition-colors">
          Login Karyawan
        </a>
      </nav>

      {/* ===== HERO — ringkas ===== */}
      <section className="px-6 md:px-12 pt-8 md:pt-12 pb-14 md:pb-20">
        <div className="lp-frame max-w-6xl mx-auto px-6 md:px-14 py-12 md:py-16">
          <span className="lp-corner" />
          <div className="flex items-center gap-3 mb-6 lp-mono">
            <span className="lp-rec-dot" />
            <span>{hero.eyebrow}</span>
            <span className="hidden md:inline">· f/1.8 · ISO 400 · 35mm</span>
          </div>
          <h1 className="lp-display font-bold leading-[0.95] tracking-tight text-[12vw] md:text-[6.5rem]">
            {hero.judul}
          </h1>
          <p className="lp-display mt-5 text-lg md:text-2xl font-medium text-[var(--lp-silver)]">{hero.tagline}</p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed">{hero.deskripsi}</p>
        </div>
      </section>

      {/* ===== BRANDS — panel besar bergantian (bintang utama halaman) ===== */}
      <section className="lp-rule px-6 md:px-12 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <p className="lp-mono mb-10 lp-reveal">Brand Kami</p>
          <div className="space-y-14 md:space-y-20">
            {brands.map((b, i) => (
              <article
                key={b.key}
                className={`lp-reveal grid md:grid-cols-2 gap-8 md:gap-14 items-center ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                {/* Foto besar */}
                <div className="lp-frame aspect-[4/3] bg-[#ececea] relative">
                  <span className="lp-corner" />
                  {b.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.fotoUrl} alt={b.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-[var(--lp-silver)]" strokeWidth={1.3} />
                    </div>
                  )}
                  <span className="lp-mono absolute top-4 left-4 bg-white/85 backdrop-blur px-2 py-1">{b.nomor}</span>
                </div>
                {/* Teks */}
                <div>
                  <p className="lp-mono mb-3">{b.kategori}</p>
                  <h2 className="lp-display text-4xl md:text-5xl font-bold tracking-tight mb-4">{b.nama}</h2>
                  <p className="text-[15.5px] md:text-base leading-relaxed text-[#3a3a40] mb-7 max-w-md">{b.deskripsi}</p>
                  <a href={b.ctaUrl} target="_blank" rel="noopener noreferrer" className="lp-btn">
                    {b.ctaLabel}
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== KENAPA KAMI ===== */}
      <section className="lp-rule px-6 md:px-12 py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="lp-display text-3xl md:text-4xl font-bold tracking-tight mb-10 lp-reveal">{kenapa.judul}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kenapa.poin.map((p, i) => (
              <div key={i} className="lp-reveal border-t-2 border-[var(--lp-ink)] pt-4">
                <p className="lp-mono mb-2">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="lp-display text-lg font-bold mb-2">{p.judul}</h3>
                <p className="text-sm leading-relaxed text-[#3a3a40]">{p.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALERI ===== */}
      <section className="lp-rule px-6 md:px-12 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <p className="lp-mono mb-8 lp-reveal">{galeri.judul} — Contact Sheet</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(galeri.fotoUrls.length ? galeri.fotoUrls : Array(8).fill(null)).slice(0, 8).map((url, i) => (
              <div key={i} className={`lp-reveal bg-[#ececea] relative overflow-hidden ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Galeri ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-[var(--lp-silver)]" strokeWidth={1.3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONI ===== */}
      <section className="lp-rule px-6 md:px-12 py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10 lp-reveal">
            <h2 className="lp-display text-3xl md:text-4xl font-bold tracking-tight">{testimoni.judul}</h2>
            {fromGoogle && <span className="lp-mono">via Google Maps</span>}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.slice(0, 6).map((r, i) => (
              <figure key={i} className="lp-reveal border border-[var(--lp-line)] p-6">
                <Stars n={r.rating} />
                <blockquote className="mt-4 text-[14.5px] leading-relaxed">&ldquo;{r.isi}&rdquo;</blockquote>
                <figcaption className="mt-4 flex items-center justify-between">
                  <span className="lp-display font-bold text-sm">{r.nama}</span>
                  <span className="lp-mono">{(r as any).sumber || (r as any).waktu || ''}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="lp-rule px-6 md:px-12 py-14 md:py-20">
        <div className="max-w-6xl mx-auto text-center lp-reveal">
          <p className="lp-mono mb-4">Siap difoto?</p>
          <h2 className="lp-display text-3xl md:text-5xl font-bold tracking-tight mb-8">Pilih studiomu, booking hari ini.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {brands.map(b => (
              <a key={b.key} href={b.ctaUrl} target="_blank" rel="noopener noreferrer" className="lp-btn">
                {b.nama}
                <ArrowUpRight className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-rule px-6 md:px-12 py-12 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Camera className="w-5 h-5" strokeWidth={2.2} />
              <span className="lp-display font-bold tracking-tight">EXPLORA CREATIVE</span>
            </div>
            <p className="text-sm text-[var(--lp-silver)] max-w-xs leading-relaxed">
              Photography & videography services — Semarang.
            </p>
          </div>
          <div className="md:col-span-7 md:col-start-7 grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <p className="lp-mono">{kontak.judul}</p>
              <p className="flex gap-2.5"><MapPin className="w-4 h-4 shrink-0 mt-0.5" />{kontak.alamat}</p>
            </div>
            <div className="space-y-3">
              <p className="lp-mono">Hubungi</p>
              <a href={waUrl} className="flex gap-2.5 hover:underline"><Phone className="w-4 h-4" />{kontak.whatsapp}</a>
              <a href={`https://instagram.com/${kontak.instagram}`} target="_blank" rel="noopener noreferrer" className="flex gap-2.5 hover:underline">
                <Instagram className="w-4 h-4" />@{kontak.instagram}
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-5 lp-rule flex flex-wrap items-center justify-between gap-3">
          <p className="lp-mono">© {new Date().getFullYear()} Explora Creative</p>
          <p className="lp-mono flex items-center gap-2"><span className="lp-rec-dot" /> REC — selalu merekam momen baik</p>
        </div>
      </footer>
    </main>
  )
}
