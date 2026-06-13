import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { rateLimit } from '@/lib/rate-limit'
import { logActivity } from '@/lib/activity-log'
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
        try {
          let dbUser = await prisma.user.findUnique({ where: { email: user.email } })
          if (!dbUser) {
            // User baru → buat sebagai PENDING (isActive: false).
            // googleId TIDAK diisi di sini untuk hindari bentrok unique;
            // ditautkan saat approve / login berikutnya bila perlu.
            await prisma.user.create({
              data: {
                name: user.name || user.email,
                email: user.email,
                password: '',
                role: 'CASHIER',
                isActive: false,
              },
            })
          }
          // user nonaktif tetap lolos signIn → middleware arahkan ke /waiting
          return true
        } catch (e) {
          console.error('[signIn google] gagal:', e)
          return false
        }
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
        // Deteksi punya password (untuk paksa buat password user Google).
        // Credentials login pasti punya password; Google ambil dari dbUser.
        if ((user as any).role !== undefined) {
          token.hasPassword = true // login via credentials = pasti punya password
        } else {
          token.hasPassword = !!(dbUser?.password && dbUser.password.length > 0)
        }

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
        ;(session.user as any).hasPassword = token.hasPassword as boolean
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
        await logActivity({ userId: user.id, userName: user.name, action: 'LOGIN', entity: 'Auth', detail: 'Login via email' })
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      issuer: 'https://accounts.google.com',
      // Di balik proxy (Railway), pengecekan issuer/PKCE kadang gagal.
      // 'state' check tetap aktif (aman), PKCE dibiarkan default Google.
      checks: ['pkce', 'state'],
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
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
