import { UserButton } from '@clerk/nextjs'
import FinsightLogo from '@/components/ui/FinsightLogo'
import BellBadge from '@/components/alerts/BellBadge'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm lg:px-6 shrink-0">
      {/* Left — mobile logo (sidebar handles desktop branding) */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint">
            <FinsightLogo size={18} color="#FFFFFF" />
          </div>
          <span className="font-semibold text-text-primary text-sm tracking-tight">Finsight</span>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <BellBadge />
        <div className="w-px h-5 bg-border mx-2" aria-hidden="true" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-9 h-9 ring-2 ring-transparent transition-all hover:ring-mint/30',
            },
          }}
        />
      </div>
    </header>
  )
}
