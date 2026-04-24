'use client'

import { cn } from '@/lib/utils'

type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
  id?: string
}

export default function ToggleSwitch({ checked, onChange, disabled, label, id }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-surface',
        checked ? 'bg-brand-600' : 'bg-border',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
