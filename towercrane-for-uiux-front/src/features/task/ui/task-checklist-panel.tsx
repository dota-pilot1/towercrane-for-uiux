import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateTaskChecklist,
  useDeleteTaskChecklist,
  useTaskChecklists,
  useToggleTaskChecklist,
  useUpdateTaskChecklist,
} from '../model/use-task-queries'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

export function TaskChecklistPanel({
  taskId,
  showHeader = true,
}: {
  taskId: string | null
  showHeader?: boolean
}) {
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const checklistsQuery = useTaskChecklists(taskId)
  const createChecklist = useCreateTaskChecklist(taskId)
  const updateChecklist = useUpdateTaskChecklist(taskId)
  const toggleChecklist = useToggleTaskChecklist(taskId)
  const deleteChecklist = useDeleteTaskChecklist(taskId)
  const items = checklistsQuery.data ?? []
  const completedCount = items.filter((item) => item.completed).length

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    await createChecklist.mutateAsync(content.trim())
    setContent('')
  }

  const handleSave = async (checklistId: string) => {
    if (!editingContent.trim()) return
    await updateChecklist.mutateAsync({
      checklistId,
      body: { content: editingContent.trim() },
    })
    setEditingId(null)
    setEditingContent('')
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-text-primary">체크리스트</p>
          <span className="text-xs font-bold text-text-muted">
            {completedCount}/{items.length}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className="text-xs font-bold text-text-muted">
            {completedCount}/{items.length}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="할 일 추가"
        />
        <Button type="submit" size="icon" title="추가" aria-label="추가">
          <Plus className="size-4" />
        </Button>
      </form>

      <div className="space-y-2">
        {checklistsQuery.isLoading ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm text-text-muted">
            체크리스트를 불러오는 중입니다.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
            체크리스트가 없습니다.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2"
            >
              <button
                type="button"
                onClick={() => toggleChecklist.mutate(item.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-muted text-brand-primary"
                aria-label="체크 토글"
              >
                {item.completed ? <Check className="size-4" /> : null}
              </button>

              {editingId === item.id ? (
                <Input
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  className="h-9 flex-1"
                />
              ) : (
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    item.completed
                      ? 'text-text-muted line-through'
                      : 'text-text-primary'
                  }`}
                >
                  {item.content}
                </span>
              )}

              {editingId === item.id ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    onClick={() => handleSave(item.id)}
                    title="저장"
                    aria-label="저장"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    onClick={() => setEditingId(null)}
                    title="취소"
                    aria-label="취소"
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  onClick={() => {
                    setEditingId(item.id)
                    setEditingContent(item.content)
                  }}
                  title="수정"
                  aria-label="수정"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm-icon"
                tone="danger"
                onClick={() => deleteChecklist.mutate(item.id)}
                title="삭제"
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
