import * as React from 'react'
import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Variant = 'default' | 'mint' | 'outline' | 'muted' | 'warn' | 'danger'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  default:
    'bg-surface-2 text-text-secondary border border-border',
  mint:
    'bg-brand-600/10 text-brand-600 border border-brand-500/20',
  outline:
    'bg-transparent text-text-secondary border border-border',
  muted:
    'bg-surface-2 text-text-muted border border-transparent',
  warn:
    'bg-amber-500/10 text-amber-600 border border-amber-500/25',
  danger:
    'bg-red-500/10 text-red-600 border border-red-500/25',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em]',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
