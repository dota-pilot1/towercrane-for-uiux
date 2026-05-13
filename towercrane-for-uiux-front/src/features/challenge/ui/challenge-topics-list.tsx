import { Card } from '../../../shared/ui/card'
import { Loader2, Plus, Trash2, Check, X, Pencil, GripVertical } from 'lucide-react'
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
import { useSectionsByCategory, useCreateSection, useUpdateSection, useDeleteSection, useReorderSections } from '../lib/hooks'

interface ChallengeTopicsListProps {
  sectionId: string
  selectedTopic: string | null
  onSelectTopic: (id: string) => void
}

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

interface SectionItemProps {
  topic: { id: string; title: string }
  isSelected: boolean
  action: ActionState
  onSelect: () => void
  onSave: () => void
  onActionChange: (a: ActionState) => void
  onDelete: () => void
  isPendingDelete: boolean
}

function SectionItem({
  topic,
  isSelected,
  action,
  onSelect,
  onSave,
  onActionChange,
  onDelete,
  isPendingDelete,
}: SectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: topic.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  if (isSelected && action.type === 'delete') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
        <span className="flex-1 text-xs ui-text-muted truncate">"{topic.title}" 삭제?</span>
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
        {topic.title || '(제목 없음)'}
      </button>
      {isSelected && (
        <div className="flex shrink-0 items-center gap-0.5 ml-1">
          <button onClick={() => onActionChange({ type: 'edit', value: topic.title || '' })} className="p-0.5 rounded hover:bg-surface-border transition-colors">
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

export function ChallengeTopicsList({ sectionId, selectedTopic, onSelectTopic }: ChallengeTopicsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, ActionState>>({})

  const { data: topics = [], isLoading } = useSectionsByCategory(sectionId)
  const createSection = useCreateSection()
  const updateSection = useUpdateSection()
  const deleteSection = useDeleteSection()
  const reorderSections = useReorderSections()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getAction = (id: string): ActionState => actionMap[id] ?? { type: 'idle' }
  const setAction = (id: string, a: ActionState) => setActionMap((prev) => ({ ...prev, [id]: a }))

  const handleSelect = (id: string) => {
    if (selectedTopic !== id) {
      onSelectTopic(id)
      setActionMap({})
    }
  }

  const handleAdd = async () => {
    if (!addValue.trim()) return
    await createSection.mutateAsync({ categoryId: sectionId, title: addValue })
    setAddValue('')
    setIsAdding(false)
  }

  const handleSave = async (id: string) => {
    const action = getAction(id)
    if (action.type !== 'edit' || !action.value.trim()) return setAction(id, { type: 'idle' })
    await updateSection.mutateAsync({ id, categoryId: sectionId, title: action.value })
    setAction(id, { type: 'idle' })
  }

  const handleDelete = async (id: string) => {
    await deleteSection.mutateAsync({ id, categoryId: sectionId })
    if (selectedTopic === id) onSelectTopic('')
    setAction(id, { type: 'idle' })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIndex = topics.findIndex((t) => t.id === active.id)
    const overIndex = topics.findIndex((t) => t.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return

    const reordered = [...topics]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)

    reorderSections.mutate({ categoryId: sectionId, sectionIds: reordered.map((t) => t.id) })
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {topics.map((topic) => (
                <SectionItem
                  key={topic.id}
                  topic={topic}
                  isSelected={selectedTopic === topic.id}
                  action={getAction(topic.id)}
                  onSelect={() => handleSelect(topic.id)}
                  onSave={() => handleSave(topic.id)}
                  onActionChange={(a) => setAction(topic.id, a)}
                  onDelete={() => handleDelete(topic.id)}
                  isPendingDelete={deleteSection.isPending}
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
