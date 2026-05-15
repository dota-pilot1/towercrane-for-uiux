import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
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
import type { StudyDiarySection } from '../../../entities/study-diary/model/types'
import {
  useCreateStudyDiarySection,
  useDeleteStudyDiarySection,
  useReorderStudyDiarySections,
  useStudyDiarySections,
  useUpdateStudyDiarySection,
} from '../lib/hooks'

type ActionState = { type: 'idle' } | { type: 'edit'; value: string } | { type: 'delete' }

type SectionItemProps = {
  section: StudyDiarySection
  isSelected: boolean
  action: ActionState
  onSelect: () => void
  onSave: () => void
  onActionChange: (action: ActionState) => void
  onDelete: () => void
  isPendingDelete: boolean
}

function SectionItem({
  section,
  isSelected,
  action,
  onSelect,
  onSave,
  onActionChange,
  onDelete,
  isPendingDelete,
}: SectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 }

  if (isSelected && action.type === 'delete') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-md bg-brand-glass px-3 py-2">
        <span className="flex-1 truncate text-xs ui-text-muted">"{section.title}" 삭제?</span>
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
        {section.title || '(제목 없음)'}
      </button>
      {isSelected && (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <button onClick={() => onActionChange({ type: 'edit', value: section.title || '' })} className="rounded p-0.5 transition-colors hover:bg-surface-muted">
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

type StudyDiarySectionListProps = {
  categoryId: string
  selectedSection: string | null
  onSelectSection: (id: string) => void
}

export function StudyDiarySectionList({ categoryId, selectedSection, onSelectSection }: StudyDiarySectionListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [actionMap, setActionMap] = useState<Record<string, ActionState>>({})

  const { data: sections = [], isLoading } = useStudyDiarySections(categoryId)
  const createSection = useCreateStudyDiarySection()
  const updateSection = useUpdateStudyDiarySection()
  const deleteSection = useDeleteStudyDiarySection()
  const reorderSections = useReorderStudyDiarySections()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getAction = (id: string): ActionState => actionMap[id] ?? { type: 'idle' }
  const setAction = (id: string, action: ActionState) => setActionMap((prev) => ({ ...prev, [id]: action }))

  const handleAdd = async () => {
    if (!addValue.trim() || !categoryId) return
    const section = await createSection.mutateAsync({ categoryId, title: addValue.trim() })
    setAddValue('')
    setIsAdding(false)
    onSelectSection(section.id)
  }

  const handleSave = async (id: string) => {
    const action = getAction(id)
    if (action.type !== 'edit' || !action.value.trim()) return setAction(id, { type: 'idle' })
    await updateSection.mutateAsync({ id, categoryId, title: action.value.trim() })
    setAction(id, { type: 'idle' })
  }

  const handleDelete = async (id: string) => {
    await deleteSection.mutateAsync({ id, categoryId })
    if (selectedSection === id) onSelectSection('')
    setAction(id, { type: 'idle' })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeIndex = sections.findIndex((section) => section.id === active.id)
    const overIndex = sections.findIndex((section) => section.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return
    const reordered = [...sections]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)
    reorderSections.mutate({ categoryId, sectionIds: reordered.map((section) => section.id) })
  }

  return (
    <Card className="w-[260px] overflow-y-auto rounded-md p-0">
      <div className="sticky top-0 border-b border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold ui-text-primary">2차 주제 ({sections.length})</p>
          <button onClick={() => setIsAdding(true)} disabled={!categoryId} className="rounded p-1 transition-colors hover:bg-surface-border disabled:opacity-30">
            <Plus className="size-3.5 ui-text-secondary" />
          </button>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        {!categoryId ? (
          <div className="py-8 text-center">
            <p className="text-xs ui-text-muted">1차 주제를 선택하세요</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin ui-text-secondary" />
          </div>
        ) : sections.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs ui-text-muted">주제가 없습니다</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  isSelected={selectedSection === section.id}
                  action={getAction(section.id)}
                  onSelect={() => { onSelectSection(section.id); setActionMap({}) }}
                  onSave={() => handleSave(section.id)}
                  onActionChange={(action) => setAction(section.id, action)}
                  onDelete={() => handleDelete(section.id)}
                  isPendingDelete={deleteSection.isPending}
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
