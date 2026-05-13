import { Trophy, Loader2, Plus, Trash2, Check, X, Pencil, GripVertical } from 'lucide-react'
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
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '../lib/hooks'

interface ChallengeSidebarProps {
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
}

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

interface CategoryItemProps {
  category: { id: string; name: string }
  isSelected: boolean
  action: ActionState
  onSelect: () => void
  onSave: () => void
  onActionChange: (a: ActionState) => void
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

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  if (isSelected && action.type === 'delete') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
        <span className="flex-1 text-xs ui-text-muted truncate">"{category.name}" 삭제?</span>
        <button onClick={onDelete} disabled={isPendingDelete} className="p-0.5 rounded hover:bg-surface-border">
          <Check className="size-3 text-red-400" />
        </button>
        <button onClick={() => onActionChange({ type: 'idle' })} className="p-0.5 rounded hover:bg-surface-border">
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
          onChange={(e) => onActionChange({ type: 'edit', value: e.target.value })}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onActionChange({ type: 'idle' })
          }}
          onBlur={onSave}
          className="flex-1 min-w-0 bg-transparent text-xs ui-text-primary outline-none border-b border-brand-border"
        />
        <button onMouseDown={(e) => { e.preventDefault(); onSave() }} className="p-0.5 rounded hover:bg-surface-border">
          <Check className="size-3 text-brand-primary" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); onActionChange({ type: 'idle' }) }} className="p-0.5 rounded hover:bg-surface-border">
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
        className="mr-1 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-surface-border shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="size-3 ui-text-muted" />
      </button>
      <button onClick={onSelect} className="flex-1 text-left text-xs font-medium truncate">
        {category.name}
      </button>
      {isSelected && (
        <div className="flex shrink-0 items-center gap-0.5 ml-1">
          <button onClick={() => onActionChange({ type: 'edit', value: category.name })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
            <Pencil className="size-3 ui-text-muted" />
          </button>
          <button onClick={() => onActionChange({ type: 'delete' })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
            <Trash2 className="size-3 text-red-400" />
          </button>
        </div>
      )}
    </div>
  )
}

export function ChallengeSidebar({ selectedCategory, onSelectCategory }: ChallengeSidebarProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, ActionState>>({})

  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getAction = (id: string): ActionState => actionMap[id] ?? { type: 'idle' }
  const setAction = (id: string, a: ActionState) => setActionMap((prev) => ({ ...prev, [id]: a }))

  const handleSelect = (id: string) => {
    if (selectedCategory !== id) {
      onSelectCategory(id)
      setActionMap({})
    }
  }

  const handleAdd = async () => {
    if (!addValue.trim()) return
    await createCategory.mutateAsync({ name: addValue })
    setAddValue('')
    setIsAdding(false)
  }

  const handleSave = async (id: string) => {
    const action = getAction(id)
    if (action.type !== 'edit' || !action.value.trim()) return setAction(id, { type: 'idle' })
    await updateCategory.mutateAsync({ id, name: action.value })
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

    const activeIndex = categories.findIndex((c) => c.id === active.id)
    const overIndex = categories.findIndex((c) => c.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return

    const reordered = [...categories]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)

    reorderCategories.mutate(reordered.map((c) => c.id))
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  action={getAction(category.id)}
                  onSelect={() => handleSelect(category.id)}
                  onSave={() => handleSave(category.id)}
                  onActionChange={(a) => setAction(category.id, a)}
                  onDelete={() => handleDelete(category.id)}
                  isPendingDelete={deleteCategory.isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {isAdding && (
          <div className="flex items-center gap-1 rounded-md border border-surface-border px-2 py-1.5 mt-1">
            <input
              autoFocus
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setIsAdding(false); setAddValue('') }
              }}
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
