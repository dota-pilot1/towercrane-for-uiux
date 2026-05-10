import { ChevronDown, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../shared/ui/card'

interface ChallengeSidebarProps {
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
}

export function ChallengeSidebar({ selectedCategory, onSelectCategory }: ChallengeSidebarProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // TODO: Replace with useQuery hook
  const categories = [
    {
      id: '1',
      name: 'Spring Boot',
      sections: [{ id: '1-1', title: '1회차', summary: 'Spring Boot 시작하기' }],
    },
  ]

  return (
    <Card className="w-[220px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-primary" />
          <p className="text-xs font-bold ui-text-primary">챌린지</p>
        </div>
      </div>

      <div className="space-y-1 p-2">
        {categories.map((category) => (
          <div key={category.id}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
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
              <div className="space-y-1 pl-6">
                {category.sections.map((section) => (
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
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
