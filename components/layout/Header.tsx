import { UserButton } from '@clerk/nextjs'
import { Bell } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-6 lg:px-8 h-16 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="font-semibold text-gray-900">Runway</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

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
