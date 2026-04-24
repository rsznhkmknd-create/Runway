import Link from 'next/link'
import FinsightLogo from '@/components/ui/FinsightLogo'

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl bg-[#111827]/70 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <FinsightLogo size={26} />
          <span className="font-semibold text-[15px] tracking-tight text-white">Finsight</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            href="#features"
            className="hidden sm:inline-block text-[13px] font-medium text-white/55 hover:text-white transition-colors px-3 py-1.5"
          >
            Features
          </Link>
          <Link
            href="#precios"
            className="hidden sm:inline-block text-[13px] font-medium text-white/55 hover:text-white transition-colors px-3 py-1.5"
          >
            Precios
          </Link>
          <Link
            href="/sign-in"
            className="text-[13px] font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className="text-[13px] font-semibold bg-white text-[#111827] hover:bg-white/90 px-4 py-2 rounded-lg transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}
