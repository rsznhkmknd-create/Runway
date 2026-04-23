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

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-app py-6 px-3 shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-3 mb-10">
        <FinsightLogo size={28} />
        <span className="font-semibold text-text-primary text-base tracking-tight">
          Finsight
        </span>
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
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  active ? 'text-brand-600' : 'text-text-muted'
                )}
                strokeWidth={1.75}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
