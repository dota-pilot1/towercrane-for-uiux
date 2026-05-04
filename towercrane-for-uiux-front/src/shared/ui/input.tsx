import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  controlSize?: 'default' | 'auth'
}

export function Input({ className, controlSize = 'default', ...props }: InputProps) {
  return (
    <input
      className={cn(
        controlSize === 'default' &&
          'ui-input w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border',
        controlSize === 'auth' &&
          'h-11 w-full rounded-md border border-surface-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
