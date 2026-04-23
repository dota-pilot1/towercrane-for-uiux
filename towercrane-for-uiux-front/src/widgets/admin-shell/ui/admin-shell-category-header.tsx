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
    <div className="ui-panel">
      <div className={`flex items-start justify-between gap-3 ${insetClassName} py-4`}>
        <div>
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
                className="rounded-full border border-brand-border/50 bg-brand-glass px-2.5 py-1 text-[10px] font-bold"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        {isAuthenticated && (
          <div className="flex gap-1.5 pt-0.5">
            <EditCategoryDialog category={selectedCategory} asIcon />
            <DeleteCategoryButton
              categoryId={selectedCategory.id}
              fallbackCategoryId={fallbackCategoryId}
              asIcon
            />
          </div>
        )}
      </div>
    </div>
  )
}
