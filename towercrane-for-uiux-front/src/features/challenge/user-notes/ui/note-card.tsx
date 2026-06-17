import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, Check, Edit2, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { parseBlock, type BlockType, serializeBlock } from '../lib/block-types'
import { BlockViewer, BlockTypeBadge } from './block-viewer'
import { BlockEditor } from './block-editor'
import { LexicalEditor } from '../../../../shared/ui/lexical/lexical-editor'
import {
  createLexicalJsonFromMarkdown,
  lexicalJsonToMarkdown,
} from '../../../../shared/lib/lexical-markdown'
import type { StudyDiaryOrganizeMode } from '../../../../entities/study-diary/model/types'

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
  onOrganize?: (data: {
    title?: string
    content: string
    mode?: StudyDiaryOrganizeMode
  }) => Promise<{ content: string }>
  isDeleting?: boolean
  deleteError?: string | null
}

type CardState = 'view' | 'edit' | 'delete'
type OrganizedPreview = {
  lexicalJson: string
}

function OrganizePreviewDialog({
  preview,
  onOpenChange,
  onApply,
}: {
  preview: OrganizedPreview | null
  onOpenChange: (open: boolean) => void
  onApply: () => void
}) {
  return (
    <Dialog.Root open={Boolean(preview)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[min(900px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-bold text-text-primary">자동 정리 미리보기</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-text-muted">
                적용하면 현재 편집 중인 노트 내용이 이 정리본으로 바뀝니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-md border border-surface-border bg-surface-raised px-5 py-4">
              {preview ? (
                <LexicalEditor
                  initialState={preview.lexicalJson}
                  onChange={() => {}}
                  readOnly
                  minHeight="auto"
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-surface-border bg-surface-muted/60 px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md border border-surface-border bg-surface-raised px-4 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
              >
                취소
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex h-9 items-center justify-center rounded-md border border-brand-border bg-brand-primary px-4 text-xs font-bold text-text-on-brand transition-colors hover:brightness-110"
            >
              적용
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function NoteCard({
  note,
  isMine,
  onUpdate,
  onDelete,
  onOrganize,
  isDeleting,
  deleteError,
}: NoteCardProps) {
  const [state, setState] = useState<CardState>('view')
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [organizeError, setOrganizeError] = useState<string | null>(null)
  const [editorResetKey, setEditorResetKey] = useState(0)
  const [organizedPreview, setOrganizedPreview] = useState<OrganizedPreview | null>(null)

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
    setOrganizeError(null)
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
    setOrganizeError(null)
  }

  const handleOrganize = async (mode: StudyDiaryOrganizeMode = 'organize') => {
    if (!onOrganize || editBlockType !== 'NOTE') return
    const content = lexicalJsonToMarkdown(editBlockData) || editBlockData.trim()
    if (!content) {
      setOrganizeError('정리할 내용이 없습니다.')
      return
    }

    setIsOrganizing(true)
    setOrganizeError(null)
    try {
      const result = await onOrganize({
        title: editTitle || undefined,
        content,
        mode,
      })
      setOrganizedPreview({
        lexicalJson: createLexicalJsonFromMarkdown(result.content),
      })
    } catch (error) {
      setOrganizeError(error instanceof Error ? error.message : '자동 정리에 실패했습니다.')
    } finally {
      setIsOrganizing(false)
    }
  }

  const handleApplyOrganized = () => {
    if (!organizedPreview) return
    setEditBlockData(organizedPreview.lexicalJson)
    setEditorResetKey((value) => value + 1)
    setOrganizedPreview(null)
  }

  const canOrganize = Boolean(onOrganize) && editBlockType === 'NOTE'

  // ── 편집 모드 ──────────────────────────────────────────────────────────────
  if (state === 'edit') {
    return (
      <article className="ui-panel-soft rounded-md p-4 space-y-3">
        <OrganizePreviewDialog
          preview={organizedPreview}
          onOpenChange={(open) => {
            if (!open) setOrganizedPreview(null)
          }}
          onApply={handleApplyOrganized}
        />
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="제목 (선택)"
          className="ui-input text-sm w-full"
          autoFocus
        />
        {organizeError ? (
          <p className="flex items-center gap-1.5 rounded-md border border-destructive bg-danger-glass px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{organizeError}</span>
          </p>
        ) : null}
        <BlockEditor
          blockType={editBlockType}
          data={editBlockData}
          onBlockTypeChange={handleBlockTypeChange}
          onDataChange={setEditBlockData}
          editorResetKey={editorResetKey}
          actions={
            canOrganize ? (
              <button
                type="button"
                onClick={() => handleOrganize('organize')}
                disabled={isOrganizing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:bg-surface-raised disabled:opacity-50"
                aria-label="현재 노트 자동 정리"
                title="현재 노트 자동 정리"
              >
                {isOrganizing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {isOrganizing ? '정리 중...' : '자동 정리'}
              </button>
            ) : null
          }
        />
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button onClick={() => setState('view')} disabled={isOrganizing} className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted disabled:opacity-50">
            취소
          </button>
          <button onClick={handleSave} disabled={isOrganizing} className="px-3 py-1.5 text-xs rounded bg-brand-primary text-text-on-brand hover:opacity-90 disabled:opacity-50">
            저장
          </button>
        </div>
      </article>
    )
  }

  // ── 뷰 모드 ───────────────────────────────────────────────────────────────
  return (
    <article className="ui-panel-soft rounded-md overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 bg-surface-muted border-b border-surface-border-soft px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-bold ui-text-primary text-sm truncate">
            {note.title || '(제목 없음)'}
          </h4>
          <BlockTypeBadge content={note.content} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] ui-text-muted">
            {note.userName || '나'} · {new Date(note.updatedAt).toLocaleDateString()}
          </span>
          {isMine && (
            <>
              <button className="ui-icon-button size-6" onClick={handleEditOpen} title="수정">
                <Edit2 className="size-3" />
              </button>
              <button
                className="ui-icon-button size-6 hover:text-destructive transition-colors"
                onClick={() => setState('delete')}
                title="삭제"
              >
                <Trash2 className="size-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="px-4 py-2.5">
        <BlockViewer
          content={note.content}
          onChecklistToggle={isMine ? (newContent) => onUpdate({ content: newContent }) : undefined}
        />
      </div>

      {/* 삭제 확인 */}
      {state === 'delete' && (
        <div className="flex flex-col gap-1.5 px-4 pb-3 border-t border-surface-border pt-2">
          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-xs ui-text-muted flex-1">정말 삭제할까요?</p>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs px-2 py-1 rounded border border-destructive bg-danger-glass text-destructive hover:brightness-110 disabled:opacity-50"
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
