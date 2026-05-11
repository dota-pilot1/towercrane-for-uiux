import { Trophy, Loader2, Plus, Trash2, Check, X, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../../shared/ui/card'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../lib/hooks'

interface ChallengeSidebarProps {
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
}

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

export function ChallengeSidebar({ selectedCategory, onSelectCategory }: ChallengeSidebarProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [action, setAction] = useState<ActionState>({ type: 'idle' })

  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const resetAction = () => setAction({ type: 'idle' })

  const handleSelect = (id: string) => {
    if (selectedCategory !== id) {
      onSelectCategory(id)
      resetAction()
    }
  }

  const handleAdd = async () => {
    if (!addValue.trim()) return
    await createCategory.mutateAsync({ name: addValue })
    setAddValue('')
    setIsAdding(false)
  }

  const handleSave = async (id: string) => {
    if (action.type !== 'edit' || !action.value.trim()) return resetAction()
    await updateCategory.mutateAsync({ id, name: action.value })
    resetAction()
  }

  const handleDelete = async (id: string) => {
    await deleteCategory.mutateAsync(id)
    if (selectedCategory === id) onSelectCategory('')
    resetAction()
  }

  return (
    <Card className="w-[220px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-brand-primary" />
            <p className="text-xs font-bold ui-text-primary">1차 주제</p>
          </div>
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
        ) : (
          categories.map((category) => {
            const isSelected = selectedCategory === category.id

            // 삭제 확인 모드
            if (isSelected && action.type === 'delete') {
              return (
                <div key={category.id} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
                  <span className="flex-1 text-xs ui-text-muted truncate">"{category.name}" 삭제?</span>
                  <button onClick={() => handleDelete(category.id)} disabled={deleteCategory.isPending} className="p-0.5 rounded hover:bg-surface-border">
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
                <div key={category.id} className="flex items-center gap-1 rounded-md bg-brand-glass px-2 py-1.5">
                  <input
                    autoFocus
                    value={action.value}
                    onChange={(e) => setAction({ type: 'edit', value: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(category.id); if (e.key === 'Escape') resetAction() }}
                    onBlur={() => handleSave(category.id)}
                    className="flex-1 min-w-0 bg-transparent text-xs ui-text-primary outline-none border-b border-brand-border"
                  />
                  <button onMouseDown={(e) => { e.preventDefault(); handleSave(category.id) }} className="p-0.5 rounded hover:bg-surface-border">
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
                key={category.id}
                className={`flex items-center rounded-md px-3 py-2 transition-colors ${
                  isSelected ? 'bg-brand-glass ui-text-primary' : 'ui-text-secondary hover:bg-surface-muted'
                }`}
              >
                <button onClick={() => handleSelect(category.id)} className="flex-1 text-left text-xs font-medium truncate">
                  {category.name}
                </button>
                {isSelected && (
                  <div className="flex shrink-0 items-center gap-0.5 ml-1">
                    <button onClick={() => setAction({ type: 'edit', value: category.name })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
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
              placeholder="카테고리명"
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
