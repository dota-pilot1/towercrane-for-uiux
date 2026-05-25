import type { ComponentType, ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '../lib/utils'

type PageHeaderProps = {
  icon: ComponentType<LucideProps>
  title: string
  description?: string
  actions?: ReactNode
  onBack?: () => void
  className?: string
}

export function PageHeader({ icon: Icon, title, description, actions, onBack, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-4 rounded-md border border-brand-border bg-brand-glass backdrop-blur-[2px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
        actions && 'flex-wrap justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface-border-soft bg-surface-raised text-text-muted hover:border-brand-border/40 hover:bg-brand-glass hover:text-brand-primary transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs mr-1"
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
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
