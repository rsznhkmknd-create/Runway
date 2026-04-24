'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type BlurFadeProps = {
  children: ReactNode
  delay?: number
  duration?: number
  /** px to translate on Y while hidden */
  yOffset?: number
  /** blur px while hidden */
  blur?: number
  className?: string
  /** if true, animates on mount; if false, animates when scrolled into view */
  inView?: boolean
  as?: 'div' | 'span' | 'section'
}

/**
 * Magic-UI-style blur + fade + slide up animation.
 * Pure CSS, no framer-motion dependency.
 */
export function BlurFade({
  children,
  delay = 0,
  duration = 700,
  yOffset = 8,
  blur = 10,
  className = '',
  inView = false,
  as: Tag = 'div',
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(!inView)

  useEffect(() => {
    if (!inView) {
      // animate on mount
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    filter: visible ? 'blur(0px)' : `blur(${blur}px)`,
    transform: visible ? 'translateY(0)' : `translateY(${yOffset}px)`,
    transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, filter ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: 'opacity, filter, transform',
  }

  // @ts-expect-error — intentional polymorphic tag
  return <Tag ref={ref} style={style} className={className}>{children}</Tag>
}
