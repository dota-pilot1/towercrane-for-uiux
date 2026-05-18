import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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

import type { SqlPracticeNote } from '../../../entities/sql-practice/model/types'
import {
  useCreateSqlPracticeNote,
  useDeleteSqlPracticeNote,
  useSharedSqlPracticeNoteById,
  useSqlPracticeNotes,
  useUpdateSqlPracticeNote,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { NoteForm } from '../../../features/challenge/user-notes/ui/note-form'
import { parseBlock } from '../../../features/challenge/user-notes/lib/block-types'
import { BlockTypeBadge, BlockViewer } from '../../../features/challenge/user-notes/ui/block-viewer'
import { Button } from '../../../shared/ui/button'
import { useSessionStore } from '../../../shared/store/session-store'

const EMPTY_NOTES: SqlPracticeNote[] = []

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function getNoteTitle(note: { title?: string | null; exampleTitle?: string | null; tableName?: string | null }) {
  return note.title?.trim() || note.exampleTitle || note.tableName || '제목 없는 노트'
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div className="flex h-full min-h-96 flex-col items-center justify-center gap-3 bg-surface-muted px-8 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-brand-border bg-brand-glass">
        <NotebookPen className="size-6 text-brand-primary" />
      </div>
      <p className="text-sm font-bold text-text-primary">노트를 클릭해주세요</p>
      <p className="text-xs text-text-muted">왼쪽 목록에서 선택하면 오른쪽에 내용이 열립니다.</p>
    </div>
  )
}

// ── 상세 패널 ─────────────────────────────────────────────────────────────────

function DetailPanel({
  noteId,
  userId,
  onDeleted,
}: {
  noteId: string
  userId: string
  onDeleted: () => void
}) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const noteQuery = useSharedSqlPracticeNoteById(noteId)
  const updateNote = useUpdateSqlPracticeNote()
  const deleteNote = useDeleteSqlPracticeNote()

  const note = noteQuery.data ?? null
  const isOwner = Boolean(note && userId && note.userId === userId)
  const editingBlock = formOpen && note ? parseBlock(note.content) : null

  useEffect(() => {
    setFormOpen(false)
    setConfirmingDelete(false)
  }, [noteId])

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/sql/notes/${noteId}`)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1400)
  }

  if (noteQuery.isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded-md bg-surface-muted" />
        ))}
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-text-muted">
        노트를 불러올 수 없습니다.
      </div>
    )
  }

  if (formOpen) {
    return (
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
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-brand-border bg-brand-glass px-6 py-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">
            SQL NOTE DETAIL
          </span>
          <BlockTypeBadge content={note.content} />
        </div>

        <h2 className="text-xl font-black leading-snug text-text-primary">
          {getNoteTitle(note)}
        </h2>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5 font-bold text-text-secondary">
              <UserRound className="size-3.5 text-brand-primary" />
              {note.authorName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-brand-primary" />
              {new Date(note.updatedAt).toLocaleString('ko-KR')}
            </span>
            {note.seedFile && (
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3.5 text-brand-primary" />
                {note.seedFile}
              </span>
            )}
            {note.tableName && (
              <span className="inline-flex items-center gap-1.5">
                <Table2 className="size-3.5 text-brand-primary" />
                {note.tableName}
              </span>
            )}
            {note.exampleTitle && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-3.5 text-brand-primary" />
                {note.exampleTitle}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:border-brand-border hover:text-brand-primary"
              onClick={handleCopyLink}
            >
              <Link className="mr-1 inline size-3" />
              {linkCopied ? '복사됨' : '링크 복사'}
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:border-brand-border hover:text-brand-primary"
                  onClick={() => { setConfirmingDelete(false); setFormOpen(true) }}
                >
                  <Edit2 className="mr-1 inline size-3" />
                  수정
                </button>
                <button
                  type="button"
                  disabled={deleteNote.isPending}
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 className="mr-1 inline size-3" />
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-surface-raised px-6 py-6">
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
            onClick={() => { deleteNote.mutate(note.id, { onSuccess: onDeleted }) }}
          >
            {deleteNote.isPending ? '삭제 중' : '삭제'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export function SqlNotesPage() {
  const navigate = useNavigate()
  const userName = useSessionStore((state) => state.userName)
  const userId = useSessionStore((state) => state.userId)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  const notesQuery = useSqlPracticeNotes()
  const createNote = useCreateSqlPracticeNote()

  const notes = notesQuery.data ?? EMPTY_NOTES
  const displayName = userName.trim() ? `${userName}의 SQL 노트` : '나의 SQL 노트'

  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      setSelectedNoteId(notes[0].id)
    }
  }, [notes, selectedNoteId])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
            onClick={() => navigate({ to: '/sql' })}
          >
            <ArrowLeft className="size-3.5" />
            SQL 연습장
          </button>
          <h1 className="text-2xl font-black text-text-primary">{displayName}</h1>
          <p className="mt-1 text-sm text-text-secondary">SQL 연습 중 정리한 개인 노트 목록입니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 text-xs text-text-muted shadow-sm">
            <span className="font-black text-text-primary">{notes.length}</span> notes
          </div>
          <Button
            size="sm"
            onClick={() => { setFormOpen((v) => !v); setSelectedNoteId(null) }}
          >
            <NotebookPen className="mr-1.5 size-3.5" />
            {formOpen ? '닫기' : '노트 추가'}
          </Button>
        </div>
      </div>

      {formOpen && (
        <div className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
          <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
            <p className="text-base font-black text-text-primary">새 노트 작성</p>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border border-surface-border px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:bg-surface-muted"
            >
              취소
            </button>
          </div>
          <div className="p-6">
            <NoteForm
              key="create"
              surface="plain"
              loading={createNote.isPending}
              initialTitle=""
              initialContent=""
              initialBlockType="NOTE"
              onCancel={() => setFormOpen(false)}
              onSubmit={(data) => {
                createNote.mutate(
                  { title: data.title, content: data.content, pinned: data.pinned },
                  {
                    onSuccess: (note) => {
                      setFormOpen(false)
                      setSelectedNoteId(note.id)
                    },
                  },
                )
              }}
            />
          </div>
        </div>
      )}

      {!formOpen && (
        <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]" style={{ minHeight: 640 }}>
          <section className="flex flex-col overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
            <div className="flex items-center border-b border-surface-border-soft bg-surface-muted px-4 py-3">
              <span className="w-10 shrink-0 text-center text-[11px] font-black uppercase tracking-widest text-text-muted">
                NO.
              </span>
              <span className="flex-1 pl-3 text-[11px] font-black uppercase tracking-widest text-text-muted">
                제목
              </span>
              <span className="w-16 shrink-0 text-right text-[11px] font-black uppercase tracking-widest text-text-muted">
                날짜
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notesQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                  <NotebookPen className="size-8 text-text-muted" />
                  <p className="text-sm text-text-muted">노트가 없습니다.</p>
                </div>
              ) : (
                <ul className="space-y-1.5 p-3">
                  {notes.map((note, idx) => {
                    const active = note.id === selectedNoteId
                    return (
                      <li key={note.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNoteId(note.id)}
                          className={[
                            'group relative flex w-full items-center overflow-hidden rounded-lg border px-4 py-3.5 text-left shadow-sm transition-all duration-150',
                            'before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-primary before:transition-opacity',
                            active
                              ? 'border-brand-border bg-brand-glass before:opacity-100 shadow-md'
                              : 'border-surface-border-soft bg-surface-raised before:opacity-0 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md hover:before:opacity-60',
                          ].join(' ')}
                        >
                          <span className="w-10 shrink-0 text-center">
                            <span
                              className={[
                                'inline-flex size-6 items-center justify-center rounded-md text-xs font-black tabular-nums transition-colors',
                                active
                                  ? 'bg-brand-primary text-surface-raised shadow-sm'
                                  : 'text-text-muted group-hover:bg-brand-glass group-hover:text-brand-primary',
                              ].join(' ')}
                            >
                              {idx + 1}
                            </span>
                          </span>

                          <div className="min-w-0 flex-1 pl-3">
                            <p
                              className={[
                                'truncate text-sm leading-snug',
                                active
                                  ? 'font-black text-brand-primary'
                                  : 'font-bold text-text-primary transition-colors group-hover:text-brand-primary',
                              ].join(' ')}
                            >
                              {getNoteTitle(note)}
                            </p>
                          </div>

                          <span className="w-16 shrink-0 text-right">
                            <span
                              className={[
                                'inline-flex rounded-md px-2 py-1 text-[11px] tabular-nums transition-colors',
                                active
                                  ? 'bg-brand-primary font-black text-surface-raised shadow-sm'
                                  : 'text-text-muted group-hover:bg-brand-glass group-hover:text-brand-primary',
                              ].join(' ')}
                            >
                              {formatDate(note.updatedAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
            {selectedNoteId ? (
              <DetailPanel
                key={selectedNoteId}
                noteId={selectedNoteId}
                userId={userId}
                onDeleted={() => {
                  const remaining = notes.filter((n) => n.id !== selectedNoteId)
                  setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null)
                  notesQuery.refetch()
                }}
              />
            ) : (
              <EmptyDetail />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
