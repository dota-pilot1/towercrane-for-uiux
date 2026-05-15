import type { InputHTMLAttributes, KeyboardEvent } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'

import { cn } from '../lib/utils'

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  hint?: string
  wrapperClassName?: string
  onSearch?: () => void
}

export function SearchField({
  className,
  hint,
  wrapperClassName,
  onSearch,
  onKeyDown,
  ...props
}: SearchFieldProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch?.()
    onKeyDown?.(e)
  }

  return (
    <label
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md border border-surface-border bg-background px-2.5 transition-all focus-within:border-brand-border focus-within:ring-2 focus-within:ring-brand-border/5',
        wrapperClassName,
      )}
    >
      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-[1px] bg-surface-muted text-brand-primary">
        <Search strokeWidth={2} className="size-3" />
      </span>
      <input
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] leading-5 text-text-primary placeholder:text-text-muted outline-none',
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {onSearch ? (
        <button
          type="button"
          onClick={onSearch}
          className="shrink-0 rounded-[1px] border border-surface-border bg-surface-muted p-0.5 text-text-muted transition-colors hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
          tabIndex={-1}
        >
          <CornerDownLeft className="size-3" />
        </button>
      ) : hint ? (
        <span className="shrink-0 rounded-[1px] border border-surface-border bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold leading-none text-text-secondary">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
