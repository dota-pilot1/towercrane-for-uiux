import { Card } from '../../../shared/ui/card'
import { Loader2, Plus, Trash2, Check, X, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useSectionsByCategory, useCreateSection, useUpdateSection, useDeleteSection } from '../lib/hooks'

interface ChallengeTopicsListProps {
  sectionId: string
  selectedTopic: string | null
  onSelectTopic: (id: string) => void
}

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

export function ChallengeTopicsList({ sectionId, selectedTopic, onSelectTopic }: ChallengeTopicsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [action, setAction] = useState<ActionState>({ type: 'idle' })

  const { data: topics = [], isLoading } = useSectionsByCategory(sectionId)
  const createSection = useCreateSection()
  const updateSection = useUpdateSection()
  const deleteSection = useDeleteSection()

  const resetAction = () => setAction({ type: 'idle' })

  const handleSelect = (id: string) => {
    if (selectedTopic !== id) {
      onSelectTopic(id)
      resetAction()
    }
  }

  const handleAdd = async () => {
    if (!addValue.trim()) return
    await createSection.mutateAsync({ categoryId: sectionId, title: addValue })
    setAddValue('')
    setIsAdding(false)
  }

  const handleSave = async (id: string) => {
    if (action.type !== 'edit' || !action.value.trim()) return resetAction()
    await updateSection.mutateAsync({ id, categoryId: sectionId, title: action.value })
    resetAction()
  }

  const handleDelete = async (id: string) => {
    await deleteSection.mutateAsync({ id, categoryId: sectionId })
    if (selectedTopic === id) onSelectTopic('')
    resetAction()
  }

  return (
    <Card className="w-[260px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold ui-text-primary">2차 주제 ({topics.length})</p>
          <button onClick={() => setIsAdding(true)} className="p-1 hover:bg-surface-border rounded transition-colors">
            <Plus className="size-3.5 ui-text-secondary" />
          </button>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs ui-text-muted">주제가 없습니다</p>
          </div>
        ) : (
          topics.map((topic) => {
            const isSelected = selectedTopic === topic.id

            // 삭제 확인 모드
            if (isSelected && action.type === 'delete') {
              return (
                <div key={topic.id} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
                  <span className="flex-1 text-xs ui-text-muted truncate">"{topic.title}" 삭제?</span>
                  <button onClick={() => handleDelete(topic.id)} disabled={deleteSection.isPending} className="p-0.5 rounded hover:bg-surface-border">
                    <Check className="size-3 text-red-400" />
                  </button>
                  <button onClick={resetAction} className="p-0.5 rounded hover:bg-surface-border">
                    <X className="size-3 ui-text-muted" />
                  </button>
                </div>
              )
            }

            // 인라인 편집 모드
            if (isSelected && action.type === 'edit') {
              return (
                <div key={topic.id} className="flex items-center gap-1 rounded-md bg-brand-glass px-2 py-1.5">
                  <input
                    autoFocus
                    value={action.value}
                    onChange={(e) => setAction({ type: 'edit', value: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(topic.id); if (e.key === 'Escape') resetAction() }}
                    onBlur={() => handleSave(topic.id)}
                    className="flex-1 min-w-0 bg-transparent text-xs ui-text-primary outline-none border-b border-brand-border"
                  />
                  <button onMouseDown={(e) => { e.preventDefault(); handleSave(topic.id) }} className="p-0.5 rounded hover:bg-surface-border">
                    <Check className="size-3 text-brand-primary" />
                  </button>
                  <button onMouseDown={(e) => { e.preventDefault(); resetAction() }} className="p-0.5 rounded hover:bg-surface-border">
                    <X className="size-3 ui-text-muted" />
                  </button>
                </div>
              )
            }

            // 기본 / 선택된 상태 (읽기 전용)
            return (
              <div
                key={topic.id}
                className={`flex items-center rounded-md px-3 py-2 transition-colors ${
                  isSelected ? 'bg-brand-glass ui-text-primary' : 'ui-text-secondary hover:bg-surface-muted'
                }`}
              >
                <button onClick={() => handleSelect(topic.id)} className="flex-1 text-left text-xs font-medium truncate">
                  {topic.title || '(제목 없음)'}
                </button>
                {isSelected && (
                  <div className="flex shrink-0 items-center gap-0.5 ml-1">
                    <button onClick={() => setAction({ type: 'edit', value: topic.title || '' })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
                      <Pencil className="size-3 ui-text-muted" />
                    </button>
                    <button onClick={() => setAction({ type: 'delete' })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
                      <Trash2 className="size-3 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}

        {isAdding && (
          <div className="flex items-center gap-1 rounded-md border border-surface-border px-2 py-1.5 mt-1">
            <input
              autoFocus
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setIsAdding(false); setAddValue('') } }}
              placeholder="주제명"
              className="flex-1 min-w-0 bg-transparent text-xs ui-text-primary outline-none"
            />
            <button onMouseDown={(e) => { e.preventDefault(); handleAdd() }} disabled={!addValue.trim()} className="p-0.5 rounded hover:bg-surface-border disabled:opacity-30">
              <Check className="size-3 text-brand-primary" />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); setIsAdding(false); setAddValue('') }} className="p-0.5 rounded hover:bg-surface-border">
              <X className="size-3 ui-text-muted" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
