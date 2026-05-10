import { ChevronDown, Trophy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { useCategories, useSectionsByCategory } from '../lib/hooks'

interface ChallengeSidebarProps {
  selectedCategory: string | null
  onSelectCategory: (sectionId: string) => void
}

export function ChallengeSidebar({ selectedCategory, onSelectCategory }: ChallengeSidebarProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const [sectionsByCategory, setSectionsByCategory] = useState<Record<string, any[]>>({})

  const handleExpandCategory = async (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null)
      return
    }

    if (!sectionsByCategory[categoryId]) {
      const { data } = useSectionsByCategory(categoryId)
      if (data) {
        setSectionsByCategory((prev) => ({ ...prev, [categoryId]: data }))
      }
    }
    setExpandedCategory(categoryId)
  }

  return (
    <Card className="w-[220px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-primary" />
          <p className="text-xs font-bold ui-text-primary">챌린지</p>
        </div>
      </div>

      <div className="space-y-1 p-2">
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id}>
              <button
                onClick={() => handleExpandCategory(category.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ui-text-secondary hover:bg-surface-muted hover:ui-text-primary transition-colors"
              >
                <ChevronDown
                  className={`size-3 shrink-0 transition-transform ${
                    expandedCategory === category.id ? 'rotate-180' : ''
                  }`}
                />
                <span className="truncate font-medium">{category.name}</span>
              </button>

              {expandedCategory === category.id && (
                <SectionList
                  categoryId={category.id}
                  sections={sectionsByCategory[category.id] || []}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                />
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function SectionList({
  categoryId,
  sections,
  selectedCategory,
  onSelectCategory,
}: {
  categoryId: string
  sections: any[]
  selectedCategory: string | null
  onSelectCategory: (sectionId: string) => void
}) {
  const { data: fetchedSections = [], isLoading } = useSectionsByCategory(categoryId)
  const displaySections = sections.length > 0 ? sections : fetchedSections

  return (
    <div className="space-y-1 pl-6">
      {isLoading && sections.length === 0 ? (
        <div className="px-2 py-1.5 text-xs ui-text-muted">로딩 중...</div>
      ) : (
        displaySections.map((section) => (
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
