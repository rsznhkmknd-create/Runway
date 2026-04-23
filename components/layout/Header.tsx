import { UserButton } from '@clerk/nextjs'
import FinsightLogo from '@/components/ui/FinsightLogo'
import BellBadge from '@/components/alerts/BellBadge'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Header() {
  return (
    <header className="bg-app border-b border-border px-6 lg:px-8 h-16 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <FinsightLogo size={26} />
          <span className="font-semibold text-text-primary text-sm tracking-tight">Finsight</span>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <BellBadge />
        <div className="w-px h-5 bg-border mx-2" aria-hidden="true" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
        />
      </div>
    </header>
  )
}
