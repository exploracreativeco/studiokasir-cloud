import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { resolveBranchContext, BRANCH_HEADER, MODE_HEADER } from '@/lib/branch'

const MENU_PATHS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/kasir': 'kasir',
  '/booking': 'booking',
  '/admin': 'admin',
  '/ots': 'ots',
  '/transaksi': 'transaksi',
  '/customers': 'customers',
  '/pengeluaran': 'pengeluaran',
  '/laporan': 'laporan',
  '/sheets': 'sheets',
  '/settings': 'settings',
  '/manajemen': 'manajemen',
  '/generate': 'generate',
  '/about': 'about',
  '/roles': 'roles',
  '/karyawan': 'karyawan',
  '/investor-link': 'investorlink',
  '/pengaturan-landing': 'landingsettings',
  '/beranda': 'beranda',
  '/jadwal': 'jadwal',
  '/absensi': 'absensi',
  '/event': 'event',
  '/oprec': 'oprec',
}

// Feature flags — dikontrol via .env saat build
const FEATURE_FLAGS: Record<string, string | undefined> = {
  '/sheets': process.env.NEXT_PUBLIC_FEATURE_SHEETS,
  '/generate': process.env.NEXT_PUBLIC_FEATURE_GENERATE,
  '/manajemen': process.env.NEXT_PUBLIC_FEATURE_MANAJEMEN,
}

const LICENSE_SKIP = ['/activate', '/api/license', '/api/auth', '/login', '/_next', '/favicon', '/public', '/waiting', '/landing', '/api/landing', '/investor', '/karir', '/api/karir', '/order', '/api/order-publik']
const PUBLIC_PATHS = ['/login', '/api/auth', '/activate', '/api/license', '/waiting', '/landing', '/api/landing', '/investor', '/karir', '/api/karir', '/order', '/api/order-publik']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Step 0: Resolve branch context dari subdomain →
  // diteruskan ke semua route via request headers
  const { mode, branchSlug } = resolveBranchContext(req.headers.get('host') || '')
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(MODE_HEADER, mode)
  // Switch studio (SUPERADMIN): cookie override — hanya di mode manajemen.
  // Subdomain kasir tetap terkunci ke studionya (hostname menang).
  const override = req.cookies.get('branch-override')?.value
  const effectiveBranch = mode === 'manajemen' && override !== undefined
    ? (override || null) // '' = Semua Studio
    : branchSlug
  if (effectiveBranch) requestHeaders.set(BRANCH_HEADER, effectiveBranch)
  else requestHeaders.delete(BRANCH_HEADER)
  const withBranch = { request: { headers: requestHeaders } }

  // Step 0.5: Mode landing — domain utama menampilkan landing page publik
  if (mode === 'landing' && pathname === '/') {
    return NextResponse.rewrite(new URL('/landing', req.url), withBranch)
  }

  // Step 1: License check — skip di cloud
  const isCloud = process.env.NEXT_PUBLIC_FEATURE_CLOUD === 'true'
  if (!isCloud) {
    const skipLicense = LICENSE_SKIP.some(p => pathname.startsWith(p))
    if (!skipLicense) {
      const licenseCookie = req.cookies.get('sk_license')
      if (licenseCookie?.value !== 'active') {
        return NextResponse.redirect(new URL('/activate', req.url))
      }
    }
  }

  // Step 2: Public paths
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === '/'
  if (isPublicPath) return NextResponse.next(withBranch)

  // Step 2.5: Feature flag check — block route kalau fitur disabled
  for (const [path, flag] of Object.entries(FEATURE_FLAGS)) {
    if (pathname.startsWith(path) && flag === 'false') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Step 2.6: Waiting page — user Google yang belum diapprove
  if (pathname === '/waiting') return NextResponse.next(withBranch)

  // Step 3: JWT token
  // NextAuth v5: cookie di HTTPS bernama __Secure-authjs.session-token,
  // di HTTP bernama authjs.session-token. Coba keduanya.
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'studiokasir-secret-key-2024'
  const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  let token = null
  if (isHttps) {
    token = await getToken({ req, secret, secureCookie: true, salt: '__Secure-authjs.session-token' } as any)
  }
  if (!token) {
    token = await getToken({ req, secret, secureCookie: false, salt: 'authjs.session-token' } as any)
  }
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  // User Google belum diapprove → redirect ke waiting
  if (token.isActive === false) {
    return NextResponse.redirect(new URL('/waiting', req.url))
  }

  // Step 4: Role/access check
  const userRole = token.role as string
  if (userRole === 'SUPERADMIN') return NextResponse.next(withBranch)

  const matchedMenu = Object.entries(MENU_PATHS).find(([p]) => pathname.startsWith(p))
  if (!matchedMenu) return NextResponse.next(withBranch)

  const menuKey = matchedMenu[1]

  // Baca akses dari JWT token (sudah diset saat login dari database)
  const accessFromToken = token.access as Record<string, boolean> | undefined
  const canAccess = accessFromToken ? (accessFromToken[menuKey] ?? false) : false

  if (!canAccess) {
    return NextResponse.redirect(new URL('/kasir', req.url))
  }

  return NextResponse.next(withBranch)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
