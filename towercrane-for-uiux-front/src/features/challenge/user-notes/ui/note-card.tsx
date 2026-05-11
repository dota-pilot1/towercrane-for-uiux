import { Edit2, Trash2, Check, X } from 'lucide-react'
import { useState } from 'react'
import { parseBlock, type BlockType, serializeBlock } from '../lib/block-types'
import { BlockViewer, BlockTypeBadge } from './block-viewer'
import { BlockEditor } from './block-editor'

interface NoteCardProps {
  note: {
    id: string
    title?: string
    content: string
    visibility: 'private' | 'shared' | 'public'
    pinned: boolean
    updatedAt: string
    userName?: string
  }
  isMine: boolean
  onUpdate: (updates: Partial<any>) => void
  onDelete: () => void
  isDeleting?: boolean
  deleteError?: string | null
}

type CardState = 'view' | 'edit' | 'delete'

export function NoteCard({ note, isMine, onUpdate, onDelete, isDeleting, deleteError }: NoteCardProps) {
  const [state, setState] = useState<CardState>('view')

  // 편집 상태
  const parsed = parseBlock(note.content)
  const [editTitle, setEditTitle] = useState(note.title || '')
  const [editBlockType, setEditBlockType] = useState<BlockType>(parsed.blockType)
  const [editBlockData, setEditBlockData] = useState(parsed.data)

  const handleEditOpen = () => {
    const p = parseBlock(note.content)
    setEditTitle(note.title || '')
    setEditBlockType(p.blockType)
    setEditBlockData(p.data)
    setState('edit')
  }

  const handleSave = () => {
    const content = serializeBlock({ blockType: editBlockType, data: editBlockData })
    onUpdate({ title: editTitle || undefined, content })
    setState('view')
  }

  const handleBlockTypeChange = (type: BlockType) => {
    setEditBlockType(type)
    setEditBlockData('')
  }

  // ── 편집 모드 ──────────────────────────────────────────────────────────────
  if (state === 'edit') {
    return (
      <article className="ui-panel-soft rounded-md p-4 space-y-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="제목 (선택)"
          className="ui-input text-sm w-full"
          autoFocus
        />
        <BlockEditor
          blockType={editBlockType}
          data={editBlockData}
          onBlockTypeChange={handleBlockTypeChange}
          onDataChange={setEditBlockData}
        />
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button onClick={() => setState('view')} className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted">
            취소
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90">
            저장
          </button>
        </div>
      </article>
    )
  }

  // ── 뷰 모드 ───────────────────────────────────────────────────────────────
  return (
    <article className="ui-panel-soft rounded-md p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold ui-text-primary text-sm truncate">
              {note.title || '(제목 없음)'}
            </h4>
            <BlockTypeBadge content={note.content} />
          </div>
          <p className="text-xs ui-text-muted">
            {note.userName || '나'} · {new Date(note.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {isMine && (
          <div className="flex items-center gap-1 shrink-0">
            <button className="ui-icon-button" onClick={handleEditOpen} title="수정">
              <Edit2 className="size-3.5" />
            </button>
            <button
              className="ui-icon-button hover:text-red-500 transition-colors"
              onClick={() => setState('delete')}
              title="삭제"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 본문 */}
      <BlockViewer
        content={note.content}
        onChecklistToggle={isMine ? (newContent) => onUpdate({ content: newContent }) : undefined}
      />

      {/* 삭제 확인 */}
      {state === 'delete' && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-border">
          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-xs ui-text-muted flex-1">정말 삭제할까요?</p>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
            <button onClick={() => setState('view')} disabled={isDeleting} className="text-xs px-2 py-1 rounded border border-surface-border ui-text-secondary hover:bg-surface-muted disabled:opacity-50">
              취소
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
