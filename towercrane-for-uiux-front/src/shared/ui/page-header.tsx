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
        'flex min-w-0 items-center gap-3 rounded-md bg-text-primary px-5 py-4',
        actions && 'flex-wrap justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-background">{title}</h2>
          {description && <p className="mt-1 text-xs text-background/60">{description}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
