import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '../lib/utils'

type CompactSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string
}

export function CompactSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: CompactSelectProps) {
  return (
    <div className={cn('relative shrink-0', wrapperClassName)}>
      <select
        className={cn(
          'ui-input h-9 w-full appearance-none rounded-md border border-surface-border bg-background pl-2.5 pr-8 text-[11px] font-medium leading-5 text-text-primary outline-none transition-all focus:border-brand-border disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
    </div>
  )
}
