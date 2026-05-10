import { ChevronDown, Trophy, Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { useCategories, useSectionsByCategory, useCreateCategory } from '../lib/hooks'

interface ChallengeSidebarProps {
  selectedCategory: string | null
  onSelectCategory: (sectionId: string) => void
}

export function ChallengeSidebar({ selectedCategory, onSelectCategory }: ChallengeSidebarProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const createCategory = useCreateCategory()

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return
    await createCategory.mutateAsync({ name: categoryName })
    setCategoryName('')
    setIsAddingCategory(false)
  }

  return (
    <Card className="w-[220px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-brand-primary" />
            <p className="text-xs font-bold ui-text-primary">1차 주제</p>
          </div>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="p-1 hover:bg-surface-border rounded transition-colors"
            title="카테고리 추가"
          >
            <Plus className="size-3.5 ui-text-secondary hover:ui-text-primary" />
          </button>
        </div>
      </div>

      <div className="space-y-1 p-2">
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : (
          categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex w-full items-center rounded-md px-3 py-2 text-left text-xs transition-colors ${
                selectedCategory === category.id
                  ? 'bg-brand-glass ui-text-primary'
                  : 'ui-text-secondary hover:bg-surface-muted'
              }`}
            >
              <span className="truncate font-medium">{category.name}</span>
            </button>
          ))
        )}
      </div>

      {isAddingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 p-4 rounded-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold ui-text-primary">1차 주제 추가</h3>
              <button
                onClick={() => {
                  setIsAddingCategory(false)
                  setCategoryName('')
                }}
                className="p-1 hover:bg-surface-muted rounded transition-colors"
              >
                <X className="size-4 ui-text-secondary" />
              </button>
            </div>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="카테고리명 입력"
              className="ui-input w-full mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAddingCategory(false)
                  setCategoryName('')
                }}
                className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddCategory}
                disabled={createCategory.isPending || !categoryName.trim()}
                className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {createCategory.isPending ? '추가 중...' : '추가'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}

function SectionList({
  categoryId,
  selectedCategory,
  onSelectCategory,
}: {
  categoryId: string
  selectedCategory: string | null
  onSelectCategory: (sectionId: string) => void
}) {
  const { data: sections = [], isLoading } = useSectionsByCategory(categoryId)

  return (
    <div className="space-y-1 pl-6">
      {isLoading ? (
        <div className="px-2 py-1.5 text-xs ui-text-muted">로딩 중...</div>
      ) : sections.length === 0 ? (
        <div className="px-2 py-1.5 text-xs ui-text-muted">섹션이 없습니다</div>
      ) : (
        sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelectCategory(section.id)}
            className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
              selectedCategory === section.id
                ? 'bg-brand-glass ui-text-primary'
                : 'ui-text-secondary hover:bg-surface-muted'
            }`}
          >
            {section.title}
          </button>
        ))
      )}
    </div>
  )
}
