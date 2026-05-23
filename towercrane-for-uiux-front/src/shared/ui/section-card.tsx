import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

type SectionCardProps = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-surface-border-soft bg-surface-muted px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? (
            <span className="flex size-7 shrink-0 items-center justify-center rounded border border-brand-border bg-brand-glass text-brand-primary">
              <Icon className="size-3.5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-black text-text-primary">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs font-medium leading-5 text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
