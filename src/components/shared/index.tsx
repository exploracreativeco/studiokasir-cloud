import { cn } from '@/lib/utils'

// ── PageHeader ──────────────────────────────────────────
interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5 flex-shrink-0 px-5 pt-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// ── StatCard ────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  valueColor?: string
}
export function StatCard({ label, value, delta, valueColor }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
      <div className={cn('text-xl font-bold', valueColor || 'text-gray-900')}>{value}</div>
      {delta && <div className="text-xs text-gray-400 mt-1">{delta}</div>}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────
const badgeVariants = {
  default: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
  pink: 'bg-pink-50 text-pink-700',
}
type BadgeVariant = keyof typeof badgeVariants

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
      badgeVariants[variant],
      className
    )}>
      {children}
    </span>
  )
}

// ── SyncBadge ───────────────────────────────────────────
export function SyncBadge({ status, sheet }: { status: string; sheet?: string | null }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    SYNCED: { label: '✓ Synced', variant: 'green' },
    SYNCING: { label: '⟳ Syncing', variant: 'blue' },
    QUEUED: { label: '⏳ Queue', variant: 'amber' },
    FAILED: { label: '✗ Failed', variant: 'red' },
    PENDING: { label: '· Pending', variant: 'default' },
  }
  const m = map[status] || map.PENDING
  return (
    <div>
      <Badge variant={m.variant}>{m.label}</Badge>
      {sheet && <div className="text-[10px] text-gray-400 mt-0.5">{sheet}</div>}
    </div>
  )
}

// ── PaymentStatusBadge ──────────────────────────────────
export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'LUNAS' ? 'green' : 'amber'}>
      {status}
    </Badge>
  )
}

// ── CategoryBadge ───────────────────────────────────────
const catColors: Record<string, BadgeVariant> = {
  GRADUATION: 'purple',
  FAMILY: 'pink',
  COUPLE: 'blue',
  GROUP: 'amber',
  PRODUCT: 'default',
  MATERNITY: 'green',
  PHOTOBOOTH: 'blue',
  VIDEO360: 'purple',
}
export function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    GRADUATION: 'Graduation', FAMILY: 'Family', COUPLE: 'Couple',
    GROUP: 'Group', PRODUCT: 'Product', MATERNITY: 'Maternity',
    PHOTOBOOTH: 'Photobooth', VIDEO360: 'Video360',
  }
  return <Badge variant={catColors[category] || 'default'}>{labels[category] || category}</Badge>
}

// ── EmptyState ──────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── LoadingSpinner ──────────────────────────────────────
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
