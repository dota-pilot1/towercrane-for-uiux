import { Card } from '../../../shared/ui/card'
import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useSectionsByCategory, useCreateSection } from '../lib/hooks'

interface ChallengeTopicsListProps {
  sectionId: string
  selectedTopic: string | null
  onSelectTopic: (id: string) => void
}

export function ChallengeTopicsList({ sectionId, selectedTopic, onSelectTopic }: ChallengeTopicsListProps) {
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const { data: topics = [], isLoading } = useSectionsByCategory(sectionId)
  const createSection = useCreateSection()

  const handleAddSection = async () => {
    if (!sectionTitle.trim()) return
    await createSection.mutateAsync({ categoryId: sectionId, title: sectionTitle })
    setSectionTitle('')
    setIsAddingSection(false)
  }

  return (
    <Card className="w-[260px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold ui-text-primary">2차 주제 ({topics.length})</p>
          <button
            onClick={() => setIsAddingSection(true)}
            className="p-1 hover:bg-surface-border rounded transition-colors"
            title="주제 추가"
          >
            <Plus className="size-3.5 ui-text-secondary hover:ui-text-primary" />
          </button>
        </div>
      </div>

      <div className="space-y-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs ui-text-muted">주제가 없습니다</p>
          </div>
        ) : (
          topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                selectedTopic === topic.id
                  ? 'bg-brand-glass ui-text-primary'
                  : 'ui-text-secondary hover:bg-surface-muted'
              }`}
            >
              <span className="truncate font-medium">{topic.title || '(제목 없음)'}</span>
            </button>
          ))
        )}
      </div>

      {isAddingSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 p-4 rounded-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold ui-text-primary">2차 주제 추가</h3>
              <button
                onClick={() => {
                  setIsAddingSection(false)
                  setSectionTitle('')
                }}
                className="p-1 hover:bg-surface-muted rounded transition-colors"
              >
                <X className="size-4 ui-text-secondary" />
              </button>
            </div>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="주제명 입력"
              className="ui-input w-full mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAddingSection(false)
                  setSectionTitle('')
                }}
                className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddSection}
                disabled={createSection.isPending || !sectionTitle.trim()}
                className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {createSection.isPending ? '추가 중...' : '추가'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}
