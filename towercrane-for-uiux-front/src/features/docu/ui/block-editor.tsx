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
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5 bg-slate-950/40 shrink-0">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          {blocks.length} 블록
          {isEditing ? (
            <>
              {' · '}
              {isDirty ? (
                <span className="text-amber-300">변경됨</span>
              ) : (
                <span className="text-emerald-300">저장됨</span>
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
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || replaceMutation.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replaceMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={onEnterEdit}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25 transition-colors font-semibold"
            >
              <Pencil className="size-3" />
              편집
            </button>
          )}
        </div>
      </div>

      {/* Block stack */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-3">
          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 py-14 text-center text-slate-500">
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
      className="group rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden hover:border-white/15 transition-colors"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/2">
        {readOnly ? null : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 opacity-40 group-hover:opacity-100 transition-opacity"
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
            <span className="flex-1 min-w-0 text-sm font-medium text-slate-100 truncate">
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
            className="flex-1 min-w-0 text-sm font-medium bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
          />
        )}
        {readOnly ? null : (
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            title="블록 삭제"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-[60px]">
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
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Plus className="size-3.5 text-emerald-300/70" />
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
          블록 추가
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
        {(Object.entries(TYPE_META) as [DocBlockType, (typeof TYPE_META)[DocBlockType]][]).map(
          ([type, meta]) => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-lg border border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/5 hover:border-white/20 transition-colors"
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

