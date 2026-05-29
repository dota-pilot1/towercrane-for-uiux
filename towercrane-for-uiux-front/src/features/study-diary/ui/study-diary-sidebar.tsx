import { BookOpen, Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '../../../shared/ui/card'
import type { StudyDiaryCategory } from '../../../entities/study-diary/model/types'
import {
  useCreateStudyDiaryCategory,
  useDeleteStudyDiaryCategory,
  useReorderStudyDiaryCategories,
  useStudyDiaryCategories,
  useUpdateStudyDiaryCategory,
} from '../lib/hooks'

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

type CategoryItemProps = {
  category: StudyDiaryCategory
  isSelected: boolean
  action: ActionState
  onSelect: () => void
  onSave: () => void
  onActionChange: (action: ActionState) => void
  onDelete: () => void
  isPendingDelete: boolean
}

function CategoryItem({
  category,
  isSelected,
  action,
  onSelect,
  onSave,
  onActionChange,
  onDelete,
  isPendingDelete,
}: CategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: category.id })
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 }

  if (isSelected && action.type === 'delete') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
        <span className="flex-1 truncate text-xs ui-text-muted">"{category.name}" 삭제?</span>
        <button onClick={onDelete} disabled={isPendingDelete} className="rounded p-0.5 text-destructive hover:bg-danger-glass">
          <Check className="size-3" />
        </button>
        <button onClick={() => onActionChange({ type: 'idle' })} className="rounded p-0.5 hover:bg-surface-muted">
          <X className="size-3 ui-text-muted" />
        </button>
      </div>
    )
  }

  if (isSelected && action.type === 'edit') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md bg-brand-glass px-2 py-1.5">
        <input
          autoFocus
          value={action.value}
          onChange={(event) => onActionChange({ type: 'edit', value: event.target.value })}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') onSave()
            if (event.key === 'Escape') onActionChange({ type: 'idle' })
          }}
          onBlur={onSave}
          className="min-w-0 flex-1 border-b border-brand-border bg-transparent text-xs outline-none ui-text-primary"
        />
        <button onMouseDown={(event) => { event.preventDefault(); onSave() }} className="rounded p-0.5 hover:bg-surface-muted">
          <Check className="size-3 text-brand-primary" />
        </button>
        <button onMouseDown={(event) => { event.preventDefault(); onActionChange({ type: 'idle' }) }} className="rounded p-0.5 hover:bg-surface-muted">
          <X className="size-3 ui-text-muted" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-md px-2 py-2 transition-colors ${
        isSelected ? 'bg-brand-glass ui-text-primary' : 'ui-text-secondary hover:bg-surface-muted'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mr-1 shrink-0 cursor-grab rounded p-0.5 hover:bg-surface-muted active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="size-3 ui-text-muted" />
      </button>
      <button onClick={onSelect} className="flex-1 truncate text-left text-xs font-medium">
        {category.name}
      </button>
      {isSelected && (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <button onClick={() => onActionChange({ type: 'edit', value: category.name })} className="rounded p-0.5 transition-colors hover:bg-surface-muted">
            <Pencil className="size-3 ui-text-muted" />
          </button>
          <button onClick={() => onActionChange({ type: 'delete' })} className="rounded p-0.5 text-destructive transition-colors hover:bg-danger-glass">
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}

type StudyDiarySidebarProps = {
  workspaceId?: string
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
}

export function StudyDiarySidebar({ workspaceId, selectedCategory, onSelectCategory }: StudyDiarySidebarProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, ActionState>>({})

  const { data: categories = [], isLoading } = useStudyDiaryCategories(workspaceId)
  const createCategory = useCreateStudyDiaryCategory(workspaceId)
  const updateCategory = useUpdateStudyDiaryCategory(workspaceId)
  const deleteCategory = useDeleteStudyDiaryCategory(workspaceId)
  const reorderCategories = useReorderStudyDiaryCategories(workspaceId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getAction = (id: string): ActionState => actionMap[id] ?? { type: 'idle' }
  const setAction = (id: string, action: ActionState) => setActionMap((prev) => ({ ...prev, [id]: action }))

  const handleAdd = async () => {
    if (!addValue.trim()) return
    const category = await createCategory.mutateAsync({ name: addValue.trim() })
    setAddValue('')
    setIsAdding(false)
    onSelectCategory(category.id)
  }

  const handleSave = async (id: string) => {
    const action = getAction(id)
    if (action.type !== 'edit' || !action.value.trim()) return setAction(id, { type: 'idle' })
    await updateCategory.mutateAsync({ id, name: action.value.trim() })
    setAction(id, { type: 'idle' })
  }

  const handleDelete = async (id: string) => {
    await deleteCategory.mutateAsync(id)
    if (selectedCategory === id) onSelectCategory('')
    setAction(id, { type: 'idle' })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeIndex = categories.findIndex((category) => category.id === active.id)
    const overIndex = categories.findIndex((category) => category.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return
    const reordered = [...categories]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)
    reorderCategories.mutate(reordered.map((category) => category.id))
  }

  return (
    <Card className="w-[220px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-brand-primary" />
            <p className="text-xs font-bold ui-text-primary">1차 주제</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="rounded p-1 transition-colors hover:bg-surface-border">
            <Plus className="size-3.5 ui-text-secondary" />
          </button>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : categories.length === 0 && !isAdding ? (
          <div className="py-8 text-center">
            <p className="text-xs ui-text-muted">아직 1차 주제가 없습니다</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  action={getAction(category.id)}
                  onSelect={() => { onSelectCategory(category.id); setActionMap({}) }}
                  onSave={() => handleSave(category.id)}
                  onActionChange={(action) => setAction(category.id, action)}
                  onDelete={() => handleDelete(category.id)}
                  isPendingDelete={deleteCategory.isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {isAdding && (
          <div className="mt-1 flex items-center gap-1 rounded-md border border-surface-border px-2 py-1.5">
            <input
              autoFocus
              value={addValue}
              onChange={(event) => setAddValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter') handleAdd()
                if (event.key === 'Escape') { setIsAdding(false); setAddValue('') }
              }}
              placeholder="카테고리명"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none ui-text-primary"
            />
            <button onMouseDown={(event) => { event.preventDefault(); handleAdd() }} disabled={!addValue.trim()} className="rounded p-0.5 hover:bg-surface-muted disabled:opacity-30">
              <Check className="size-3 text-brand-primary" />
            </button>
            <button onMouseDown={(event) => { event.preventDefault(); setIsAdding(false); setAddValue('') }} className="rounded p-0.5 hover:bg-surface-muted">
              <X className="size-3 ui-text-muted" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
