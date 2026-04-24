'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type BentoCardProps = {
  children: ReactNode
  className?: string
  /** subtle lift-in animation on mount */
  delay?: number
  /** premium navy glow accent on hover */
  accent?: boolean
}

export function BentoCard({ children, className = '', delay = 0, accent = false }: BentoCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(id)
  }, [delay])

  return (
    <div
      ref={ref}
      className={cn(
        'group relative rounded-2xl border border-border bg-surface overflow-hidden',
        'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        accent && 'hover:border-brand-500/30',
        className
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        filter: visible ? 'blur(0)' : 'blur(6px)',
      }}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(600px circle at var(--x, 50%) var(--y, 0%), rgba(0,196,140,0.06), transparent 40%)',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
