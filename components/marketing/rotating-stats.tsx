'use client'

import { useEffect, useState } from 'react'

type Stat = {
  /** headline figure, rendered large */
  figure: string
  /** supporting copy, rendered muted */
  label: string
  /** accent the figure in mint — use for the "solution" line */
  accent?: boolean
}

const STATS: Stat[] = [
  { figure: '3,4M', label: 'PYMEs sin visibilidad financiera' },
  { figure: '87%',  label: 'gestiona sus finanzas en Excel' },
  { figure: '€5.000/mes', label: 'cuesta un CFO humano' },
  { figure: '€29/mes', label: 'lo hace Finsight por ti', accent: true },
]

export function RotatingStats() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const tick = setInterval(() => {
      // Fade out, swap, fade in
      setVisible(false)
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % STATS.length)
        setVisible(true)
      }, 320)
      return () => clearTimeout(swap)
    }, 3000)
    return () => clearInterval(tick)
  }, [])

  const current = STATS[index]

  return (
    <div
      className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-4 py-2"
      role="status"
      aria-live="polite"
    >
      {/* progress dots */}
      <div className="flex items-center gap-1">
        {STATS.map((_, i) => (
          <span
            key={i}
            className={[
              'h-1 rounded-full transition-all duration-500 ease-out',
              i === index ? 'w-4 bg-[#00C48C]' : 'w-1 bg-white/20',
            ].join(' ')}
          />
        ))}
      </div>

      <div
        className="text-[13px] leading-none tabular-nums transition-all duration-[320ms] ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
          filter: visible ? 'blur(0)' : 'blur(4px)',
        }}
      >
        <span
          className={[
            'font-semibold tracking-tight',
            current.accent ? 'text-[#00C48C]' : 'text-white',
          ].join(' ')}
        >
          {current.figure}
        </span>
        <span className="text-white/55"> · {current.label}</span>
      </div>
    </div>
  )
}
