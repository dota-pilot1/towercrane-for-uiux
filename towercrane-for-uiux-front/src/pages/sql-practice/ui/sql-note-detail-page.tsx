import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Database,
  Edit2,
  FileText,
  Link,
  NotebookPen,
  Table2,
  Trash2,
  UserRound,
} from 'lucide-react'

import {
  useDeleteSqlPracticeNote,
  useSharedSqlPracticeNoteById,
  useUpdateSqlPracticeNote,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { NoteForm } from '../../../features/challenge/user-notes/ui/note-form'
import { parseBlock } from '../../../features/challenge/user-notes/lib/block-types'
import { BlockTypeBadge, BlockViewer } from '../../../features/challenge/user-notes/ui/block-viewer'
import { Card } from '../../../shared/ui/card'
import { useSessionStore } from '../../../shared/store/session-store'

function getNoteTitle(note: { title?: string | null; exampleTitle?: string | null; tableName?: string | null }) {
  return note.title?.trim() || note.exampleTitle || note.tableName || '제목 없는 노트'
}

export function SqlNoteDetailPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { noteId?: string }
  const userId = useSessionStore((s) => s.userId)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)

  const [linkCopied, setLinkCopied] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const noteQuery = useSharedSqlPracticeNoteById(params.noteId)
  const updateNote = useUpdateSqlPracticeNote()
  const deleteNote = useDeleteSqlPracticeNote()

  const note = noteQuery.data ?? null
  const isOwner = Boolean(note && userId && note.userId === userId)
  const editingBlock = formOpen && note ? parseBlock(note.content) : null

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1400)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[1180px] flex-col gap-4">
      <Card className="flex items-center justify-between gap-4 rounded-md border border-surface-border-soft px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-9 shrink-0">
            <NotebookPen className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-text-primary">SQL 노트</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              SQL 학습 노트를 확인합니다.
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            className="ui-icon-button h-9 shrink-0 gap-1.5 px-3 text-xs font-bold"
            onClick={() => navigate({ to: '/sql/notes' })}
          >
            <ArrowLeft className="size-3.5" />
            내 노트 목록
          </button>
        )}
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-surface-border-soft">
        {noteQuery.isLoading ? (
          <div className="flex min-h-[420px] flex-1 items-center justify-center text-sm font-semibold text-text-muted">
            노트를 불러오는 중입니다.
          </div>
        ) : formOpen && note ? (
          <div className="flex min-h-0 flex-1 flex-col bg-surface-muted/50 px-6 py-5">
            <NoteForm
              key={note.id}
              surface="plain"
              loading={updateNote.isPending}
              initialTitle={note.title ?? ''}
              initialContent={editingBlock?.data ?? ''}
              initialBlockType={editingBlock?.blockType ?? 'NOTE'}
              onCancel={() => setFormOpen(false)}
              onSubmit={(data) => {
                updateNote.mutate(
                  { id: note.id, payload: { title: data.title, content: data.content, pinned: data.pinned } },
                  { onSuccess: () => { setFormOpen(false); noteQuery.refetch() } },
                )
              }}
            />
          </div>
        ) : note ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-muted">
                  SQL NOTE DETAIL
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <h2 className="truncate text-xl font-black text-text-primary">
                    {getNoteTitle(note)}
                  </h2>
                  <BlockTypeBadge content={note.content} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="size-3.5 text-brand-primary" />
                    {note.authorName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-brand-primary" />
                    {new Date(note.updatedAt).toLocaleString('ko-KR')}
                  </span>
                  {note.seedFile ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Database className="size-3.5 text-brand-primary" />
                      {note.seedFile}
                    </span>
                  ) : null}
                  {note.tableName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Table2 className="size-3.5 text-brand-primary" />
                      {note.tableName}
                    </span>
                  ) : null}
                  {note.exampleTitle ? (
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5 text-brand-primary" />
                      {note.exampleTitle}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="ui-icon-button h-8 gap-1.5 px-3 text-xs font-bold"
                  title="링크 복사"
                  onClick={handleCopyLink}
                >
                  <Link className="size-3.5" />
                  {linkCopied ? '복사됨' : '링크 복사'}
                </button>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      className="ui-icon-button size-8"
                      title="수정"
                      onClick={() => { setConfirmingDelete(false); setFormOpen(true) }}
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="ui-icon-button-danger size-8"
                      title="삭제"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-surface-raised px-8 py-7">
              <div className="prose-sql-note max-w-none">
                <BlockViewer
                  content={note.content}
                  onChecklistToggle={
                    isOwner
                      ? (content) => updateNote.mutate({ id: note.id, payload: { content } })
                      : undefined
                  }
                />
              </div>
            </div>

            {confirmingDelete && (
              <div className="flex items-center gap-3 border-t border-surface-border-soft bg-surface-muted px-6 py-4">
                <p className="flex-1 text-xs font-semibold text-text-secondary">
                  이 노트를 삭제할까요? 삭제한 노트는 복구할 수 없습니다.
                </p>
                <button
                  type="button"
                  className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-raised disabled:opacity-50"
                  disabled={deleteNote.isPending}
                  onClick={() => setConfirmingDelete(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="rounded-md border border-destructive bg-surface-raised px-3 py-1.5 text-xs font-bold text-destructive hover:bg-surface-muted disabled:opacity-50"
                  disabled={deleteNote.isPending}
                  onClick={() => {
                    deleteNote.mutate(note.id, {
                      onSuccess: () => navigate({ to: '/sql/notes' }),
                    })
                  }}
                >
                  {deleteNote.isPending ? '삭제 중' : '삭제'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center text-center">
            <NotebookPen className="mb-3 size-10 text-text-muted" />
            <p className="text-sm font-bold text-text-primary">노트를 찾을 수 없습니다</p>
            <p className="mt-1 text-xs text-text-muted">
              삭제되었거나 잘못된 링크입니다.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
