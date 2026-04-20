import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'ui-input w-full rounded-[10px] border px-4 py-3 text-sm outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border',
        className,
      )}
      {...props}
    />
  )
}
