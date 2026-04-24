'use client'

import { type ReactNode } from 'react'

type MarqueeProps = {
  children: ReactNode
  /** seconds per loop */
  duration?: number
  /** reverse direction */
  reverse?: boolean
  /** pause on hover */
  pauseOnHover?: boolean
  /** gap between items in rem */
  gap?: number
  className?: string
}

/**
 * Magic-UI-style marquee — CSS-only horizontal scroll.
 * Duplicates content twice so the loop is seamless.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  pauseOnHover = true,
  gap = 1.25,
  className = '',
}: MarqueeProps) {
  return (
    <div
      className={`group relative flex overflow-hidden ${className}`}
      style={{ ['--fs-marquee-duration' as string]: `${duration}s`, ['--fs-marquee-gap' as string]: `${gap}rem` }}
    >
      <style jsx>{`
        @keyframes fs-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% - var(--fs-marquee-gap))); }
        }
        @keyframes fs-marquee-reverse {
          from { transform: translateX(calc(-100% - var(--fs-marquee-gap))); }
          to { transform: translateX(0); }
        }
        .fs-track {
          display: flex;
          flex-shrink: 0;
          gap: var(--fs-marquee-gap);
          padding-right: var(--fs-marquee-gap);
          animation: ${reverse ? 'fs-marquee-reverse' : 'fs-marquee'} var(--fs-marquee-duration) linear infinite;
          min-width: 100%;
        }
        .group:hover .fs-track {
          animation-play-state: ${pauseOnHover ? 'paused' : 'running'};
        }
      `}</style>
      <div className="fs-track">{children}</div>
      <div className="fs-track" aria-hidden="true">{children}</div>
    </div>
  )
}
