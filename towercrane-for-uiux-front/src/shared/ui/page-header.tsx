import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { cn } from '../lib/utils'

type PageHeaderProps = {
  icon: ComponentType<LucideProps>
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon: Icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-4 rounded-md border border-brand-border bg-brand-glass backdrop-blur-[2px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
        actions && 'flex-wrap justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border/40 bg-surface-raised text-brand-primary shadow-sm shadow-brand-primary/5">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-text-primary tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
