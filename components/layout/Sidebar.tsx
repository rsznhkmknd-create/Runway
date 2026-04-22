'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingDown,
  FileText,
  ArrowLeftRight,
  Settings,
  ChevronRight,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FinsightLogo from '@/components/ui/FinsightLogo'

const navItems = [
  { href: '/dashboard',              label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/dashboard/burn-rate',    label: 'Burn Rate',   icon: TrendingDown },
  { href: '/dashboard/facturas',     label: 'Facturas',    icon: FileText },
  { href: '/dashboard/movimientos',  label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/dashboard/importar',     label: 'Importar',    icon: Upload },
  { href: '/dashboard/ajustes',      label: 'Ajustes',     icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-gray-100 bg-white py-6 px-4 shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 mb-8">
        <FinsightLogo size={32} />
        <span className="font-semibold text-gray-900 text-base">Finsight</span>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  active ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-brand-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="bg-brand-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-brand-700 mb-1">Plan Starter</p>
          <p className="text-xs text-brand-600/80">Conecta tu banco para datos en tiempo real</p>
        </div>
      </div>
    </aside>
  )
}
