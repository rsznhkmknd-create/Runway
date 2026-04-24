'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Subtle reveal wrapper for charts and wide dashboard widgets.
 * Fades + slides + de-blurs on mount (or when scrolled into view).
 */
export function ChartReveal({
  children,
  delay = 0,
  duration = 700,
  className = '',
  inView = true,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  inView?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(!inView)

  useEffect(() => {
    if (!inView) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.995)',
        filter: visible ? 'blur(0)' : 'blur(8px)',
        transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, filter ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: 'opacity, transform, filter',
      }}
    >
      {children}
    </div>
  )
}
