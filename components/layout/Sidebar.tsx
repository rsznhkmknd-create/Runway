'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  FileText,
  ArrowLeftRight,
  Settings,
  Upload,
  FileBarChart,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FinsightLogo from '@/components/ui/FinsightLogo'

const navItems = [
  { href: '/dashboard',              label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/dashboard/burn-rate',    label: 'Burn Rate',   icon: TrendingDown   },
  { href: '/dashboard/facturas',     label: 'Facturas',    icon: FileText       },
  { href: '/dashboard/movimientos',  label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/dashboard/reportes',     label: 'Reportes',    icon: FileBarChart   },
  { href: '/dashboard/forecast',     label: 'Forecast',    icon: TrendingUp     },
  { href: '/dashboard/alertas',      label: 'Alertas',     icon: Bell           },
  { href: '/dashboard/importar',     label: 'Importar',    icon: Upload         },
  { href: '/dashboard/ajustes',      label: 'Ajustes',     icon: Settings       },
]

type Props = {
  companyName?: string | null
}

export default function Sidebar({ companyName }: Props = {}) {
  const pathname = usePathname()
  const trimmedCompany = companyName?.trim()

  // ── Initials for the bottom company tile (FA-style avatar) ──────────────
  const initials = (trimmedCompany ?? 'Finsight')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'FS'

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint">
            <FinsightLogo size={20} color="#FFFFFF" />
          </div>
          <span className="text-lg font-semibold text-text-primary">Finsight</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'bg-mint/10 text-mint'
                  : 'text-text-muted hover:bg-muted hover:text-text-primary'
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-mint"
                />
              )}
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                  active ? 'text-mint' : 'text-text-muted group-hover:text-text-primary'
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom company tile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/20 text-xs font-semibold text-mint shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {trimmedCompany ?? 'Tu empresa'}
            </p>
            <p className="text-xs text-text-muted">Plan activo</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
