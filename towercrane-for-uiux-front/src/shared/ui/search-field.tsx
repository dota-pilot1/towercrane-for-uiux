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
        'flex h-9 min-h-9 w-full items-stretch overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-none transition-all hover:border-brand-border/70 focus-within:border-brand-border focus-within:ring-1 focus-within:ring-brand-border/15',
        wrapperClassName,
      )}
    >
      <span className="flex w-10 shrink-0 items-center justify-center border-r border-surface-border-soft bg-surface-muted text-brand-primary">
        <Search strokeWidth={2} className="size-4" />
      </span>
      <input
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-medium leading-5 text-text-primary placeholder:font-medium placeholder:text-text-muted outline-none',
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {onSearch ? (
        <button
          type="button"
          onClick={onSearch}
          className="flex h-full min-w-12 shrink-0 items-center justify-center border-l border-surface-border-soft bg-surface-muted px-3 text-xs font-bold text-text-primary transition-colors hover:bg-brand-glass hover:text-brand-primary"
          tabIndex={-1}
          aria-label="검색"
        >
          <CornerDownLeft className="size-3.5" />
        </button>
      ) : hint ? (
        <span className="flex h-full min-w-12 shrink-0 items-center justify-center border-l border-surface-border-soft bg-surface-muted px-3 text-xs font-bold text-text-primary">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
