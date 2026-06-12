import type { Metadata } from 'next'
import { Space_Grotesk, Inter, Space_Mono } from 'next/font/google'
import './landing.css'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Explora Creative — Photography & Videography Services',
  description:
    'Explora Creative: Explora Studio, Yours Self Studio, dan Explora Booth. Layanan fotografi & videografi di Semarang.',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} lp-root`}>
      {children}
    </div>
  )
}
