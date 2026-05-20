import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import type { DevChallengeCategory } from '../../../entities/dev-challenge/model/types'
import {
  useCreateDevChallengeCategory,
  useDeleteDevChallengeCategory,
  useDevChallengeCategories,
  useReorderDevChallengeCategories,
  useUpdateDevChallengeCategory,
} from '../lib/hooks'

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

type DevChallengeCategoryPanelProps = {
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onResetSection: () => void
}

type CategoryItemProps = {
  category: DevChallengeCategory
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
        <button onClick={onDelete} disabled={isPendingDelete} className="rounded p-0.5 hover:bg-surface-border">
          <Check className="size-3 text-destructive" />
        </button>
        <button onClick={() => onActionChange({ type: 'idle' })} className="rounded p-0.5 hover:bg-surface-border">
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
        <button onMouseDown={(event) => { event.preventDefault(); onSave() }} className="rounded p-0.5 hover:bg-surface-border">
          <Check className="size-3 text-brand-primary" />
        </button>
        <button onMouseDown={(event) => { event.preventDefault(); onActionChange({ type: 'idle' }) }} className="rounded p-0.5 hover:bg-surface-border">
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
      <button {...attributes} {...listeners} className="mr-1 shrink-0 cursor-grab rounded p-0.5 hover:bg-surface-border active:cursor-grabbing" tabIndex={-1}>
        <GripVertical className="size-3 ui-text-muted" />
      </button>
      <button onClick={onSelect} className="flex-1 truncate text-left text-xs font-medium">
        {category.name}
      </button>
      {isSelected && (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <button onClick={() => onActionChange({ type: 'edit', value: category.name })} className="rounded p-0.5 transition-colors hover:bg-surface-border">
            <Pencil className="size-3 ui-text-muted" />
          </button>
          <button onClick={() => onActionChange({ type: 'delete' })} className="rounded p-0.5 transition-colors hover:bg-surface-border">
            <Trash2 className="size-3 text-destructive" />
          </button>
        </div>
      )}
    </div>
  )
}

export function DevChallengeCategoryPanel({
  selectedCategoryId,
  onSelectCategory,
  onResetSection,
}: DevChallengeCategoryPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, ActionState>>({})
  const { data: categories = [], isLoading } = useDevChallengeCategories()
  const createCategory = useCreateDevChallengeCategory()
  const updateCategory = useUpdateDevChallengeCategory()
  const deleteCategory = useDeleteDevChallengeCategory()
  const reorderCategories = useReorderDevChallengeCategories()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getAction = (id: string): ActionState => actionMap[id] ?? { type: 'idle' }
  const setAction = (id: string, action: ActionState) => setActionMap((prev) => ({ ...prev, [id]: action }))

  const handleSelect = (id: string) => {
    if (selectedCategoryId !== id) {
      onSelectCategory(id)
      onResetSection()
      setActionMap({})
    }
  }

  const handleAdd = async () => {
    if (!addValue.trim()) return
    const category = await createCategory.mutateAsync({ name: addValue.trim() })
    setAddValue('')
    setIsAdding(false)
    if (category?.id) {
      onSelectCategory(category.id)
      onResetSection()
    }
  }

  const handleSave = async (id: string) => {
    const action = getAction(id)
    if (action.type !== 'edit' || !action.value.trim()) {
      setAction(id, { type: 'idle' })
      return
    }
    await updateCategory.mutateAsync({ id, name: action.value.trim() })
    setAction(id, { type: 'idle' })
  }

  const handleDelete = async (id: string) => {
    await deleteCategory.mutateAsync(id)
    if (selectedCategoryId === id) {
      onSelectCategory(null)
      onResetSection()
    }
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
    <Card className="w-[280px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-brand-primary" />
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
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isSelected={selectedCategoryId === category.id}
                  action={getAction(category.id)}
                  onSelect={() => handleSelect(category.id)}
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
              placeholder="주제명"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none ui-text-primary"
            />
            <button onMouseDown={(event) => { event.preventDefault(); handleAdd() }} disabled={!addValue.trim()} className="rounded p-0.5 hover:bg-surface-border disabled:opacity-30">
              <Check className="size-3 text-brand-primary" />
            </button>
            <button onMouseDown={(event) => { event.preventDefault(); setIsAdding(false); setAddValue('') }} className="rounded p-0.5 hover:bg-surface-border">
              <X className="size-3 ui-text-muted" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

