import * as React from 'react'
import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 focus-visible:ring-brand-500/50',
  secondary:
    'bg-surface-2 text-text-primary hover:bg-surface border border-border focus-visible:ring-border',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2 focus-visible:ring-border',
  outline:
    'bg-transparent border border-border text-text-primary hover:bg-surface-2 focus-visible:ring-border',
  destructive:
    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/50',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-lg',
  md: 'h-10 px-4 text-[13.5px] rounded-xl',
  lg: 'h-11 px-6 text-[14px] rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
