import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
        token.isActive = (user as any).isActive !== false

        // Ambil akses dari database saat login
        const role = (user as any).role

        // Landing setelah login — dari tabel Role (dinamis)
        try {
          const roleRow = await prisma.role.findUnique({ where: { slug: role } })
          token.defaultLanding = roleRow?.defaultLanding || '/kasir'
        } catch { token.defaultLanding = '/kasir' }
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
        ;(session.user as any).defaultLanding = token.defaultLanding as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
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
      async profile(profile) {
        // Cek apakah user sudah ada di DB
        let user = await prisma.user.findUnique({ where: { email: profile.email } })
        if (!user) {
          // Buat user baru dengan isActive: false (PENDING)
          user = await prisma.user.create({
            data: {
              name: profile.name || profile.email,
              email: profile.email,
              password: '', // tidak pakai password
              role: 'CASHIER',
              isActive: false,
            },
          })
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        }
      },
    }),
  ],
})
