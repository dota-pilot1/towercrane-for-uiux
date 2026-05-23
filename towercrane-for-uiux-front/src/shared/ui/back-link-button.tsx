import type { ButtonHTMLAttributes } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../lib/utils'

type BackLinkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string
}

export function BackLinkButton({
  className,
  label = '목록',
  type = 'button',
  ...props
}: BackLinkButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'group inline-flex h-9 w-fit items-center gap-2 rounded-md border border-surface-border-soft bg-surface-raised px-2.5 pr-3 text-xs font-black text-text-secondary shadow-sm transition-all hover:border-brand-border hover:bg-brand-glass hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border/20',
        className,
      )}
      {...props}
    >
      <span className="flex size-5 items-center justify-center rounded border border-surface-border-soft bg-surface-muted text-text-muted transition-colors group-hover:border-brand-border group-hover:bg-background group-hover:text-brand-primary">
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
      </span>
      {label}
    </button>
  )
}
