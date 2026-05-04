import { MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { DeleteCategoryButton } from '../../../features/category-management/ui/delete-category-button'
import { EditCategoryDialog } from '../../../features/category-management/ui/edit-category-dialog'
import type { ScenarioCategory } from '../../../shared/config/catalog'

type AdminShellCategoryHeaderProps = {
  selectedCategory: ScenarioCategory
  fallbackCategoryId?: string
  isAuthenticated: boolean
  insetClassName: string
}

export function AdminShellCategoryHeader({
  selectedCategory,
  fallbackCategoryId,
  isAuthenticated,
  insetClassName,
}: AdminShellCategoryHeaderProps) {
  return (
    <div className="ui-panel relative overflow-visible border-brand-border/40 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_13%,var(--card))_0%,var(--card)_48%,color-mix(in_srgb,var(--primary)_5%,var(--card))_100%)] shadow-[0_16px_48px_color-mix(in_srgb,var(--primary)_10%,transparent)]">
      <div className={`flex items-start justify-between gap-3 ${insetClassName} py-5`}>
        <div className="flex min-w-0 items-start gap-4">
          <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary shadow-sm">
            <span className="text-sm font-black uppercase">
              {selectedCategory.title.slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-text-primary text-[1.85rem] font-extrabold tracking-tight">
              {selectedCategory.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
              {selectedCategory.summary}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-brand-primary font-bold">
              {selectedCategory.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-brand-border/50 bg-brand-glass px-2 py-0.5 text-[10px] font-bold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isAuthenticated && (
          <CategoryHeaderActionsMenu
            selectedCategory={selectedCategory}
            fallbackCategoryId={fallbackCategoryId}
          />
        )}
      </div>
    </div>
  )
}

type CategoryHeaderActionsMenuProps = {
  selectedCategory: ScenarioCategory
  fallbackCategoryId?: string
}

function CategoryHeaderActionsMenu({
  selectedCategory,
  fallbackCategoryId,
}: CategoryHeaderActionsMenuProps) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!actionsOpen) return

    const closeActions = (event: MouseEvent) => {
      if (actionsRef.current?.contains(event.target as Node)) return
      setActionsOpen(false)
    }

    window.addEventListener('click', closeActions)
    return () => window.removeEventListener('click', closeActions)
  }, [actionsOpen])

  return (
    <div
      ref={actionsRef}
      className="relative shrink-0 pt-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-sm border border-surface-border bg-surface-muted ui-text-secondary shadow-sm transition-all hover:border-brand-border hover:bg-surface-strong hover:ui-text-primary"
        aria-label={`${selectedCategory.title} 카테고리 작업`}
        aria-expanded={actionsOpen}
        onClick={() => setActionsOpen((open) => !open)}
      >
        <MoreVertical className="size-4" />
      </button>

      {actionsOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 flex items-center gap-1 rounded-md border border-surface-border bg-surface-raised p-1 shadow-2xl">
          <EditCategoryDialog category={selectedCategory} asIcon size="sm-icon" />
          <DeleteCategoryButton
            categoryId={selectedCategory.id}
            fallbackCategoryId={fallbackCategoryId}
            asIcon
            size="sm-icon"
          />
        </div>
      ) : null}
    </div>
  )
}
