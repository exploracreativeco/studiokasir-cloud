import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import { prisma } from '@/lib/prisma'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.setting.findFirst()
    const studioName = settings?.studioName || 'StudioKasir'
    return {
      title: studioName,
      description: `Sistem kasir modern — ${studioName}`,
      icons: settings?.logoUrl ? { icon: settings.logoUrl } : undefined,
    }
  } catch {
    return {
      title: 'StudioKasir',
      description: 'Sistem kasir modern untuk photography studio',
    }
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <script dangerouslySetInnerHTML={{ __html: `
          fetch('/api/settings')
            .then(r => r.json())
            .then(s => {
              if (s && s.logoUrl) {
                var link = document.querySelector("link[rel~='icon']") || document.createElement('link');
                link.rel = 'icon';
                link.href = s.logoUrl;
                document.head.appendChild(link);
              }
            })
            .catch(() => {});
        `}} />
      </body>
    </html>
  )
}
