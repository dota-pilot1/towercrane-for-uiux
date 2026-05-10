import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit2, X } from 'lucide-react'
import { useState } from 'react'
import { BLOCK_TYPE_LABELS } from '../lib/block-types'
import { BlockContentEditor } from './block-content-editor'
import type { Block } from '../lib/block-types'

interface BlockCardProps {
  block: Block
  isEditing: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<Block>) => void
  onDelete: () => void
}

export function BlockCard({ block, isEditing, onEdit, onUpdate, onDelete }: BlockCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="ui-panel-soft rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold ui-text-secondary">{BLOCK_TYPE_LABELS[block.blockType]}</p>
          <button
            onClick={() => onUpdate({ blockTitle: null, content: '' })}
            className="text-brand-primary hover:opacity-70"
          >
            <X className="size-4" />
          </button>
        </div>
        <BlockContentEditor block={block} onUpdate={onUpdate} />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="ui-panel-soft rounded-md p-4">
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-surface-border hover:text-text-secondary transition-colors"
        >
          <GripVertical className="size-4 shrink-0" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs font-bold ui-text-secondary">{BLOCK_TYPE_LABELS[block.blockType]}</p>
              {block.blockTitle && (
                <h4 className="font-medium ui-text-primary text-sm truncate">{block.blockTitle}</h4>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEdit}
                className="ui-icon-button text-brand-primary hover:opacity-70 transition-opacity"
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                onClick={() => setIsDeleting(!isDeleting)}
                className={`ui-icon-button transition-opacity ${
                  isDeleting ? 'text-red-500' : 'text-surface-border hover:text-red-500'
                }`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {block.content && (
            <p className="text-xs ui-text-secondary line-clamp-2">{block.content.substring(0, 100)}</p>
          )}

          {isDeleting && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs ui-text-muted">삭제하시겠습니까?</p>
              <button
                onClick={onDelete}
                className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                삭제
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="text-xs px-2 py-1 rounded border border-surface-border ui-text-secondary hover:bg-surface-muted"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
