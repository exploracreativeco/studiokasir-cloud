import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { rateLimit } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  ADMIN: {
    dashboard: false, kasir: true, booking: true, ots: true,
    transaksi: true, customers: true, pengeluaran: true,
    laporan: false, sheets: false, admin: true, settings: false,
  },
  CASHIER: {
    dashboard: false, kasir: true, booking: true, ots: true,
    transaksi: true, customers: true, pengeluaran: false,
    laporan: false, sheets: false, admin: false, settings: false,
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    // Google sign-in: pastikan user ada di DB (buat sebagai PENDING kalau baru).
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        let dbUser = await prisma.user.findUnique({ where: { email: user.email } })
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || user.email,
              email: user.email,
              password: '',
              role: 'CASHIER',
              isActive: false,
              googleId: (user as any).id || null,
            },
          })
        } else if (!dbUser.googleId && (user as any).id) {
          // Tautkan googleId kalau user sudah ada (login manual sebelumnya)
          await prisma.user.update({ where: { id: dbUser.id }, data: { googleId: (user as any).id } }).catch(() => {})
        }
        // user nonaktif tetap boleh "masuk" alur → diarahkan ke /waiting oleh middleware
      }
      return true
    },
    // Selalu kembali ke domain sendiri (cegah redirect ke URL lama)
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      try { if (new URL(url).origin === baseUrl) return url } catch {}
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user) {
        // Google user dari profile() tak punya role → ambil dari DB by email.
        let dbUser: any = null
        if ((user as any).role === undefined && user.email) {
          dbUser = await prisma.user.findUnique({ where: { email: user.email } })
        }
        token.role = (user as any).role ?? dbUser?.role ?? 'CASHIER'
        token.id = (user as any).id ?? dbUser?.id
        token.isActive = ((user as any).isActive ?? dbUser?.isActive) !== false

        // Ambil akses dari database saat login
        const role = token.role as string
        if (role !== 'SUPERADMIN') {
          const accessRows = await prisma.roleAccess.findMany({ where: { role } })
          if (accessRows.length > 0) {
            const access: Record<string, boolean> = {}
            accessRows.forEach(a => { access[a.menu] = a.canAccess })
            token.access = access
          } else {
            token.access = DEFAULT_ACCESS[role] || {}
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.access = token.access as Record<string, boolean>
        session.user.isActive = token.isActive as boolean
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Brute-force guard: 8 percobaan / 5 menit per email
        const _em = String((credentials as any)?.email || 'unknown').toLowerCase()
        if (!rateLimit(`login:${_em}`, 8, 5 * 60_000)) return null
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user || !user.isActive) return null
        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // profile() murni: JANGAN akses DB di sini (penyebab OAuthProfileParseError).
      // Cukup map data Google → pembuatan user dilakukan di signIn callback.
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name || profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
})
