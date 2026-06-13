// ============================================================
// lib/branch.ts — Deteksi mode & branch dari hostname/subdomain
//
// exploracreative.id (domain utama) → mode LANDING (publik)
// yours.exploracreative.id          → mode kasir, branch "yours"
// explora.exploracreative.id        → mode kasir, branch "explora"
// app.exploracreative.id            → mode manajemen (lintas branch)
// localhost / *.railway.app         → dari env DEFAULT_MODE/DEFAULT_BRANCH
// ============================================================

export type AppMode = 'landing' | 'kasir' | 'manajemen'

export interface BranchContext {
  mode: AppMode
  branchSlug: string | null // null = landing/manajemen
}

const KASIR_SUBDOMAINS = ['yours', 'explora']

export function resolveBranchContext(hostname: string): BranchContext {
  const host = hostname.split(':')[0].toLowerCase()

  // Dev / Railway default domain → pakai env (default: kasir explora,
  // set DEFAULT_MODE=landing untuk preview landing di Railway)
  if (host === 'localhost' || host.endsWith('.railway.app') || host.endsWith('.up.railway.app')) {
    return {
      mode: (process.env.DEFAULT_MODE as AppMode) || 'kasir',
      branchSlug: process.env.DEFAULT_BRANCH || 'explora',
    }
  }

  const sub = host.split('.')[0]

  if (sub === 'app') return { mode: 'manajemen', branchSlug: null }
  if (KASIR_SUBDOMAINS.includes(sub)) return { mode: 'kasir', branchSlug: sub }

  // Domain utama (exploracreative.id / www) → landing page publik
  return { mode: 'landing', branchSlug: null }
}

// Header internal untuk meneruskan context dari middleware ke routes
export const BRANCH_HEADER = 'x-branch-slug'
export const MODE_HEADER = 'x-app-mode'
