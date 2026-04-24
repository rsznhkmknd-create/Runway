'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import FinsightLogo from '@/components/ui/FinsightLogo'

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={[
        'transition-all duration-300 ease-out',
        scrolled
          ? 'backdrop-blur-xl bg-[#111827]/75 border-b border-white/[0.07] shadow-[0_1px_0_0_rgba(255,255,255,0.02)]'
          : 'backdrop-blur-0 bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
        >
          <FinsightLogo size={26} />
          <span className="font-semibold text-[15px] tracking-tight text-white">Finsight</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            href="#features"
            className="hidden sm:inline-block text-[13px] font-medium text-white/55 hover:text-white transition-colors duration-200 px-3 py-1.5"
          >
            Features
          </Link>
          <Link
            href="#precios"
            className="hidden sm:inline-block text-[13px] font-medium text-white/55 hover:text-white transition-colors duration-200 px-3 py-1.5"
          >
            Precios
          </Link>
          <Link
            href="/sign-in"
            className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200 px-3 py-1.5"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className="text-[13px] font-semibold bg-white text-[#111827] hover:bg-white/90 px-4 py-2 rounded-lg transition-all duration-200 active:scale-[0.97]"
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}
