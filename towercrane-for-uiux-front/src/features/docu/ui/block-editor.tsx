import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useReplaceBlocks, type DocBlock, type DocBlockType } from '../../../shared/api/docu'
import { TYPE_META, createDraftBlock, type DraftBlock } from '../types/block'
import { DbTableBlockEditor } from './blocks/dbtable-editor'
import { FigmaBlockEditor } from './blocks/figma-editor'
import { FileBlockEditor } from './blocks/file-editor'
import { GithubBlockEditor } from './blocks/github-editor'
import { MermaidBlockEditor } from './blocks/mermaid-editor'
import { NoteBlockEditor } from './blocks/note-editor'

type Props = {
  documentId: string
  initialBlocks: DocBlock[]
  isEditing: boolean
  onEnterEdit: () => void
  onExitEdit: () => void
}

function toDraft(block: DocBlock): DraftBlock {
  return {
    localId: block.id,
    blockType: block.blockType,
    blockTitle: block.blockTitle,
    content: block.content,
  }
}

function areBlocksEqual(a: DraftBlock[], b: DraftBlock[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].blockType !== b[i].blockType) return false
    if ((a[i].blockTitle ?? '') !== (b[i].blockTitle ?? '')) return false
    if (a[i].content !== b[i].content) return false
  }
  return true
}

export function BlockEditor({
  documentId,
  initialBlocks,
  isEditing,
  onEnterEdit,
  onExitEdit,
}: Props) {
  const initial = useMemo(() => initialBlocks.map(toDraft), [initialBlocks])
  const [blocks, setBlocks] = useState<DraftBlock[]>(initial)

  useEffect(() => {
    setBlocks(initial)
  }, [initial])

  const replaceMutation = useReplaceBlocks(documentId)
  const isDirty = !areBlocksEqual(blocks, initial)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.localId === active.id)
      const newIndex = prev.findIndex((b) => b.localId === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const updateBlock = (localId: string, patch: Partial<DraftBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.localId === localId ? { ...b, ...patch } : b)))
  }

  const addBlock = (type: DocBlockType) => {
    setBlocks((prev) => [...prev, createDraftBlock(type, '')])
  }

  const removeBlock = (localId: string) => {
    setBlocks((prev) => prev.filter((b) => b.localId !== localId))
  }

  const handleSave = () => {
    replaceMutation.mutate(
      blocks.map((b) => ({
        blockType: b.blockType,
        blockTitle: b.blockTitle,
        content: b.content,
      })),
      {
        onSuccess: () => onExitEdit(),
      },
    )
  }

  const handleCancel = () => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 취소할까요?')) {
      return
    }
    setBlocks(initial)
    onExitEdit()
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-surface-border-soft bg-surface-raised px-6 py-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_40%,transparent)] shrink-0">
        <div className="text-[11px] uppercase tracking-widest text-text-muted">
          {blocks.length} 블록
          {isEditing ? (
            <>
              {' · '}
              {isDirty ? (
                <span className="text-brand-primary">변경됨</span>
              ) : (
                <span className="text-brand-primary">저장됨</span>
              )}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={replaceMutation.isPending}
                className="rounded-md border border-surface-border-soft px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || replaceMutation.isPending}
                className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-text-on-brand transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {replaceMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={onEnterEdit}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-1.5 text-xs font-semibold text-brand-primary transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_8%,transparent)]"
            >
              <Pencil className="size-3" />
              편집
            </button>
          )}
        </div>
      </div>

      {/* Block stack */}
      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_2%,var(--background))_0%,var(--background)_180px)]">
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-3">
          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-surface-border-soft bg-surface-raised py-14 text-center text-text-muted shadow-sm">
              {isEditing
                ? '아래에서 블록 타입을 선택해 추가하세요.'
                : '등록된 블록이 없습니다. 상단의 편집 버튼을 눌러 추가하세요.'}
            </div>
          ) : isEditing ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.localId)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <InlineBlockCard
                    key={block.localId}
                    block={block}
                    readOnly={false}
                    onChangeTitle={(title) =>
                      updateBlock(block.localId, { blockTitle: title || null })
                    }
                    onChangeContent={(content) =>
                      updateBlock(block.localId, { content })
                    }
                    onDelete={() => removeBlock(block.localId)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            blocks.map((block) => (
              <InlineBlockCard
                key={block.localId}
                block={block}
                readOnly
                onChangeTitle={() => {}}
                onChangeContent={() => {}}
                onDelete={() => {}}
              />
            ))
          )}

          {isEditing ? <AddBlockBar onAdd={addBlock} /> : null}
        </div>
      </div>
    </div>
  )
}

function InlineBlockCard({
  block,
  readOnly,
  onChangeTitle,
  onChangeContent,
  onDelete,
}: {
  block: DraftBlock
  readOnly: boolean
  onChangeTitle: (v: string) => void
  onChangeContent: (v: string) => void
  onDelete: () => void
}) {
  const sortable = useSortable({ id: block.localId, disabled: readOnly })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable
  const meta = TYPE_META[block.blockType]
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group overflow-hidden rounded-lg border border-surface-border-soft bg-surface-raised shadow-[0_10px_30px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition-all hover:border-brand-border/40 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--primary)_7%,transparent)]"
    >
      <div className="flex items-center gap-2 border-b border-surface-border-soft bg-[color:color-mix(in_srgb,var(--surface-muted)_48%,var(--card))] px-3 py-2">
        {readOnly ? null : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-text-primary opacity-40 group-hover:opacity-100 transition-opacity"
            aria-label="Drag"
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <span
          className={`shrink-0 px-2 py-0.5 text-[11px] rounded-md font-medium ${meta.color}`}
        >
          {meta.icon} {meta.label}
        </span>
        {readOnly ? (
          block.blockTitle?.trim() ? (
            <span className="flex-1 min-w-0 text-sm font-medium text-text-primary truncate">
              {block.blockTitle}
            </span>
          ) : (
            <span className="flex-1" />
          )
        ) : (
          <input
            type="text"
            value={block.blockTitle ?? ''}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="블록 제목 (선택)"
            className="flex-1 min-w-0 text-sm font-medium bg-transparent text-text-primary outline-none placeholder:text-text-muted"
          />
        )}
        {readOnly ? null : (
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-text-muted opacity-0 transition-colors hover:bg-danger-glass hover:text-destructive group-hover:opacity-100"
            title="블록 삭제"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-[60px] bg-surface-raised">
        <BlockBody block={block} readOnly={readOnly} onChangeContent={onChangeContent} />
      </div>
    </div>
  )
}

function BlockBody({
  block,
  readOnly,
  onChangeContent,
}: {
  block: DraftBlock
  readOnly: boolean
  onChangeContent: (val: string) => void
}) {
  switch (block.blockType) {
    case 'NOTE':
      return (
        <NoteBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    case 'MMD':
      return (
        <MermaidBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    case 'FIGMA':
      return (
        <FigmaBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    case 'FILE':
      return (
        <FileBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    case 'DBTABLE':
      return (
        <DbTableBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    case 'GITHUB':
      return (
        <GithubBlockEditor content={block.content} onChange={onChangeContent} readOnly={readOnly} />
      )
    default:
      return null
  }
}

function AddBlockBar({ onAdd }: { onAdd: (type: DocBlockType) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-surface-border-soft bg-surface-raised p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Plus className="size-3.5 text-brand-primary/70" />
        <p className="text-[11px] uppercase tracking-widest text-text-secondary font-semibold">
          블록 추가
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
        {(Object.entries(TYPE_META) as [DocBlockType, (typeof TYPE_META)[DocBlockType]][]).map(
          ([type, meta]) => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="flex items-center justify-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-raised px-2 py-2 text-xs text-text-secondary transition-all hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
            >
              <span>{meta.icon}</span>
              <span className="truncate">{meta.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
