'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingDown,
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

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-app py-6 px-3 shrink-0">
      {/* Logo + nombre de empresa */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-3 mb-10">
        <FinsightLogo size={28} />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-text-primary text-base tracking-tight leading-tight">
            Finsight
          </span>
          {trimmedCompany && (
            <span className="text-[11px] text-text-muted truncate leading-tight mt-0.5">
              {trimmedCompany}
            </span>
          )}
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]',
                active
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60'
              )}
            >
              {/* Mint active-indicator bar — grows in from the left */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full bg-brand-600 transition-all duration-300 ease-out',
                  active ? 'h-5 opacity-100' : 'h-0 opacity-0'
                )}
              />
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors duration-200 ease-out',
                  active ? 'text-brand-600' : 'text-text-muted group-hover:text-text-secondary'
                )}
                strokeWidth={1.75}
              />
              <span className="transition-colors duration-200 ease-out">{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
