import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string
}

export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        className={cn(
          'ui-input h-12 w-full appearance-none rounded-md border px-4 pr-10 text-sm outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 ui-text-muted" />
    </div>
  )
}
