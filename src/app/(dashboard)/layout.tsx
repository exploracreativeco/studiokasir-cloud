'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Camera, LayoutDashboard, ShoppingCart, Receipt, DollarSign, BarChart2, Table2, Settings, Settings2, LogOut, Bell, ChevronDown, Menu, Users, ClipboardList, ChevronLeft, ChevronRight, BookOpen, Info, Briefcase, FileOutput, Shield, UsersRound, User, CalendarDays, ClipboardCheck, PartyPopper, Link2, Megaphone, Globe, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALL_NAV_ITEMS = [
  // OPERASIONAL
  { href: '/beranda', label: 'Beranda', icon: Home, menu: 'beranda', group: 'Operasional' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, menu: 'dashboard', group: 'Operasional' },
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart, menu: 'kasir', group: 'Operasional' },
  { href: '/booking', label: 'DP', icon: BookOpen, menu: 'booking', group: 'Operasional' },
  { href: '/ots', label: 'Order OTS', icon: ClipboardList, menu: 'ots', group: 'Operasional' },
  { href: '/transaksi', label: 'Transaksi', icon: Receipt, menu: 'transaksi', group: 'Operasional' },
  { href: '/customers', label: 'Customer', icon: Users, menu: 'customers', group: 'Operasional' },
  { href: '/event', label: 'Event Booth', icon: PartyPopper, menu: 'event', group: 'Operasional' },
  // TIM
  { href: '/karyawan', label: 'Team', icon: UsersRound, menu: 'karyawan', group: 'Tim' },
  { href: '/jadwal', label: 'Jadwal Shift', icon: CalendarDays, menu: 'jadwal', group: 'Tim' },
  { href: '/absensi', label: 'Absensi', icon: ClipboardCheck, menu: 'absensi', group: 'Tim' },
  { href: '/oprec', label: 'Open Recruitment', icon: Megaphone, menu: 'oprec', group: 'Tim' },
  // KEUANGAN
  { href: '/laporan', label: 'Laporan', icon: BarChart2, menu: 'laporan', group: 'Keuangan' },
  { href: '/manajemen', label: 'Gaji & Investor', icon: Briefcase, menu: 'manajemen', group: 'Keuangan', feature: process.env.NEXT_PUBLIC_FEATURE_MANAJEMEN },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: DollarSign, menu: 'pengeluaran', group: 'Keuangan' },
  { href: '/generate', label: 'Generate', icon: FileOutput, menu: 'generate', group: 'Keuangan', feature: process.env.NEXT_PUBLIC_FEATURE_GENERATE },
  { href: '/investor-link', label: 'Link Investor', icon: Link2, menu: 'investorlink', group: 'Keuangan' },
  // SISTEM
  { href: '/admin', label: 'Master Data', icon: Settings2, menu: 'admin', group: 'Sistem' },
  { href: '/sheets', label: 'Sheets Sync', icon: Table2, menu: 'sheets', group: 'Sistem', feature: process.env.NEXT_PUBLIC_FEATURE_SHEETS },
  { href: '/pengaturan-landing', label: 'Landing Page', icon: Globe, menu: 'landingsettings', group: 'Sistem' },
  { href: '/roles', label: 'Role & Akses', icon: Shield, menu: 'roles', group: 'Sistem' },
  { href: '/settings', label: 'Pengaturan', icon: Settings, menu: 'settings', group: 'Sistem' },
]

const GROUP_ORDER = ['Operasional', 'Tim', 'Keuangan', 'Sistem']

// Menu yang tampil di subdomain KASIR (yours./explora.) — sesuai fiksasi PJ studio
const KASIR_MODE_MENUS = ['dashboard', 'kasir', 'booking', 'ots', 'transaksi', 'customers', 'pengeluaran', 'admin']

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  SUPERADMIN: { dashboard: true, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: true, laporan: true, sheets: true, admin: true, settings: true, manajemen: true, generate: true },
  ADMIN: { dashboard: false, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: true, laporan: false, sheets: false, admin: true, settings: false, manajemen: false, generate: false },
  CASHIER: { dashboard: false, kasir: true, booking: true, ots: true, transaksi: true, customers: true, pengeluaran: false, laporan: false, sheets: false, admin: false, settings: false, manajemen: false, generate: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 4000)
        const res = await fetch('https://raw.githubusercontent.com/explorastudio/studiokasir/main/version.json?t=' + Date.now(), { signal: controller.signal, cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.version && data.version !== '1.2.0') setHasUpdate(true)
        }
      } catch {}
    }
    checkVersion()
  }, [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [access, setAccess] = useState<Record<string, boolean>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [studioName, setStudioName] = useState('StudioHub')
  const [appMode, setAppMode] = useState<string>('manajemen')
  const [branchSlug, setBranchSlug] = useState<string | null>(null)
  const [canSwitch, setCanSwitch] = useState(false)
  const [branchOptions, setBranchOptions] = useState<Array<{ id: string; slug: string; nama: string }>>([])

  async function switchStudio(slug: string) {
    await fetch('/api/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchSlug: slug }) })
    window.location.reload()
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s?.studioName) setStudioName(s.studioName)
    }).catch(() => {})
    // Mode & branch dari subdomain (via middleware)
    fetch('/api/context').then(r => r.json()).then(c => {
      if (c?.mode) setAppMode(c.mode)
      setBranchSlug(c?.branchSlug || null)
      setCanSwitch(!!c?.canSwitch)
      setBranchOptions(Array.isArray(c?.branches) ? c.branches : [])
    }).catch(() => {})
    // Telemetry ping — kirim nama studio ke developer (silent, tidak mempengaruhi UI)
    fetch('/api/telemetry', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (session?.user?.role) {
      fetch(`/api/users/access?role=${session.user.role}`)
        .then(r => r.json())
        .then(data => { setAccess(data); setPageLoading(false) })
        .catch(() => { setAccess(DEFAULT_ACCESS[session.user.role] || {}); setPageLoading(false) })
    } else if (session !== undefined) {
      setPageLoading(false)
    }
  }, [session?.user?.role])

  const role = session?.user?.role || 'CASHIER'
  const roleAccess = Object.keys(access).length > 0 ? access : (DEFAULT_ACCESS[role] || {})
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if ((item as any).feature === 'false') return false
    // Mode kasir (subdomain yours./explora.) → batasi ke menu kasir saja
    if (appMode === 'kasir' && !KASIR_MODE_MENUS.includes(item.menu)) return false
    // Kalau role SUPERADMIN → semua tampil (dalam batas mode)
    if (role === 'SUPERADMIN') return true
    // Kalau menu tidak ada di roleAccess → sembunyikan (undefined dianggap false)
    return roleAccess[item.menu] === true
  })

  const roleLabel: Record<string, string> = { SUPERADMIN: 'Super Admin', ADMIN: 'Admin', CASHIER: 'Kasir' }
  const roleColor: Record<string, string> = { SUPERADMIN: 'bg-purple-100 text-purple-700', ADMIN: 'bg-blue-100 text-blue-700', CASHIER: 'bg-gray-100 text-gray-600' }
  // Role custom: tampil Title Case + warna netral
  const prettyRole = roleLabel[role] || role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())

  if (pageLoading) return (
    <div className="flex h-screen items-center justify-center bg-[#f5f4f1]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-studiohub-white.png" alt="StudioHub" className="w-8 h-8" />
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-gray-800">{studioName}</div>
          <div className="text-xs text-gray-400 mt-1">Memuat aplikasi...</div>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f4f1]">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-all duration-200',
        'lg:relative lg:translate-x-0',
        collapsed ? 'w-14' : 'w-56',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn('h-14 flex items-center border-b border-gray-100 flex-shrink-0 relative', collapsed ? 'justify-center px-0' : 'gap-2.5 px-5')}>
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/logo-studiohub-white.png" alt="StudioHub" className="w-5 h-5" />
          </div>
          {!collapsed && <span className="font-bold text-[15px] truncate">{studioName}</span>}
          {/* Collapse toggle button */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors z-10">
            {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-0.5">
            {(appMode === 'kasir'
              ? [{ group: null as string | null, items: navItems }]
              : GROUP_ORDER.map(g => ({ group: g as string | null, items: navItems.filter(i => (i as any).group === g) })).filter(s => s.items.length > 0)
            ).map(section => (
              <div key={section.group || 'flat'}>
                {section.group && !collapsed && (
                  <p className="px-2 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.group}</p>
                )}
                {section.group && collapsed && <div className="my-3 border-t border-gray-100" />}
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-all',
                        collapsed ? 'justify-center' : '',
                        active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* Akun + Tentang + Logout */}
        <div className="border-t border-gray-100 p-2 space-y-0.5">
          <Link href="/akun" title={collapsed ? 'Akun Saya' : undefined}
            className={cn('flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 w-full transition-all', collapsed ? 'justify-center' : '')}>
            <User className="w-4 h-4" />
            {!collapsed && 'Akun Saya'}
          </Link>
          <Link href="/about" title={collapsed ? 'Tentang' : undefined}
            className={cn('relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 w-full transition-all', collapsed ? 'justify-center' : '')}>
            {hasUpdate && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full z-10 border border-white" />}
            <Info className="w-4 h-4" />
            {!collapsed && 'Tentang Aplikasi'}
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} title={collapsed ? 'Keluar' : undefined}
            className={cn('flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-all', collapsed ? 'justify-center' : '')}>
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Keluar'}
          </button>
        </div>

        {/* Copyright */}
        {!collapsed && (
          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <p className="text-[10px] text-gray-400">© 2026 Explora Creative</p>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          {canSwitch && appMode === 'manajemen' ? (
            <select value={branchSlug || ''} onChange={e => switchStudio(e.target.value)}
              title="Switch studio — semua halaman mengikuti"
              className="text-[11px] font-bold uppercase tracking-wider bg-gray-900 text-white px-2 py-1.5 rounded-lg border-0 cursor-pointer">
              <option value="">🏢 SEMUA STUDIO</option>
              {branchOptions.map(b => <option key={b.id} value={b.slug}>{b.nama.toUpperCase()}</option>)}
            </select>
          ) : branchSlug ? (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-white px-2 py-1 rounded">
              {branchSlug}
            </span>
          ) : null}
          <div className="flex-1" />
          {/* Quick action shortcuts */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Link href="/kasir" className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', pathname === '/kasir' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600')}>
              <ShoppingCart className="w-3.5 h-3.5" /> Kasir
            </Link>
            <Link href="/ots" className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', pathname === '/ots' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600')}>
              <ClipboardList className="w-3.5 h-3.5" /> Order OTS
            </Link>
            <Link href="/booking" className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', pathname === '/booking' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600')}>
              <BookOpen className="w-3.5 h-3.5" /> DP
            </Link>
          </div>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{session?.user?.name}</div>
              <div className={cn('text-[10px] px-1.5 rounded font-medium', roleColor[role] || roleColor.CASHIER)}>
                {prettyRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
