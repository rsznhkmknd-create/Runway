import { UserButton } from '@clerk/nextjs'
import FinsightLogo from '@/components/ui/FinsightLogo'
import BellBadge from '@/components/alerts/BellBadge'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-6 lg:px-8 h-16 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <FinsightLogo size={28} />
          <span className="font-semibold text-gray-900">Finsight</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <BellBadge />

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
