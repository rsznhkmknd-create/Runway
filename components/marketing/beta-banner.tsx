'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'finsight:beta-banner-dismissed-v1'

export function BetaBanner() {
  // `null` = hydrating (don't render yet to avoid SSR mismatch)
  // `true` = dismissed
  // `false` = show
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed !== false) return null

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div className="relative bg-[#00C48C] text-[#07160E]">
      {/* subtle gradient highlight for premium feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="relative max-w-6xl mx-auto px-6 h-9 flex items-center justify-center gap-2 text-[12.5px] font-medium">
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span>
          Finsight está en <span className="font-bold">beta</span> — acceso gratuito por tiempo limitado
        </span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 transition-colors duration-150 active:scale-90"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
