import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Database,
  FileText,
  NotebookPen,
  Share2,
  Table2,
  UserRound,
} from 'lucide-react'

import type { SqlPracticeNote } from '../../../entities/sql-practice/model/types'
import {
  useShareSqlPracticeNote,
  useSqlPracticeNote,
  useSqlPracticeNotes,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { BlockTypeBadge, BlockViewer } from '../../../features/challenge/user-notes/ui/block-viewer'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { useSessionStore } from '../../../shared/store/session-store'

const EMPTY_NOTES: SqlPracticeNote[] = []

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function getNoteTitle(note: SqlPracticeNote) {
  return note.title?.trim() || note.exampleTitle || note.tableName || '제목 없는 노트'
}

function getPublicSqlNoteUrl(publicToken: string) {
  return `${window.location.origin}/share/sql-notes/${publicToken}`
}

export function SqlNotesPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { noteId?: string }
  const userName = useSessionStore((state) => state.userName)
  const [copied, setCopied] = useState(false)

  const notesQuery = useSqlPracticeNotes()
  const noteQuery = useSqlPracticeNote(params.noteId)
  const shareNote = useShareSqlPracticeNote()

  const notes = notesQuery.data ?? EMPTY_NOTES
  const selectedNote = useMemo(() => {
    if (params.noteId) {
      return noteQuery.data ?? notes.find((note) => note.id === params.noteId) ?? null
    }
    return notes[0] ?? null
  }, [noteQuery.data, notes, params.noteId])

  const isLoading = notesQuery.isLoading || (Boolean(params.noteId) && noteQuery.isLoading)
  const displayName = userName.trim() ? `${userName}의 SQL 노트` : '나의 SQL 노트'

  const handleCopyPublicLink = async () => {
    if (!selectedNote) return
    const publicToken = selectedNote.isPublic && selectedNote.publicToken
      ? selectedNote.publicToken
      : (await shareNote.mutateAsync(selectedNote.id)).publicToken

    if (!publicToken) return

    await navigator.clipboard.writeText(getPublicSqlNoteUrl(publicToken))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[1720px] flex-col gap-4">
      <Card className="flex items-center justify-between gap-4 rounded-md border border-surface-border-soft px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-9 shrink-0">
            <NotebookPen className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-text-primary">{displayName}</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              SQL 연습 중 정리한 개인 노트를 별도 페이지에서 확인합니다.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-3"
          onClick={() => navigate({ to: '/sql' })}
        >
          <ArrowLeft className="size-3.5" />
          SQL 연습장
        </Button>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-4 overflow-hidden">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <p className="shrink-0 text-base font-black leading-none text-text-primary">
                노트 목록
              </p>
              <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass px-2 text-[11px] font-black tabular-nums text-brand-primary">
                {notes.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[34px_minmax(0,1fr)_76px] items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-4 py-3 text-[11px] font-black uppercase text-text-muted">
            <span>NO.</span>
            <span>제목</span>
            <span className="text-right">날짜</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {notesQuery.isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-xs font-semibold text-text-muted">
                불러오는 중
              </div>
            ) : notes.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
                <NotebookPen className="mb-2 size-8 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">SQL 노트가 없습니다</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  SQL 연습장에서 노트를 작성하면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note, index) => {
                  const isSelected = selectedNote?.id === note.id

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate({ to: '/sql/notes/$noteId', params: { noteId: note.id } })}
                      className={`group relative w-full overflow-hidden rounded-md border px-3 py-2.5 text-left shadow-sm transition-colors ${
                        isSelected
                          ? 'border-brand-border bg-brand-glass text-brand-primary shadow-md'
                          : 'border-surface-border-soft bg-surface-raised text-text-primary hover:border-brand-border hover:bg-surface-muted'
                      }`}
                    >
                      {isSelected && <span className="absolute inset-y-2.5 left-0 w-1 rounded-r bg-brand-primary" />}
                      <div className="grid grid-cols-[34px_minmax(0,1fr)_76px] items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-xs font-black tabular-nums text-brand-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{getNoteTitle(note)}</p>
                        </div>
                        <span className="inline-flex h-7 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted px-1.5 text-[11px] font-black tabular-nums text-text-secondary">
                          {formatDate(note.updatedAt).replace(/\s/g, '')}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft">
          {isLoading ? (
            <div className="flex min-h-[420px] flex-1 items-center justify-center text-sm font-semibold text-text-muted">
              노트를 불러오는 중입니다.
            </div>
          ) : selectedNote ? (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-6 py-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-muted">
                    SQL NOTE DETAIL
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <h2 className="truncate text-xl font-black text-text-primary">
                      {getNoteTitle(selectedNote)}
                    </h2>
                    <BlockTypeBadge content={selectedNote.content} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="size-3.5 text-brand-primary" />
                      {userName.trim() || '나'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-brand-primary" />
                      {new Date(selectedNote.updatedAt).toLocaleString('ko-KR')}
                    </span>
                    {selectedNote.seedFile ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Database className="size-3.5 text-brand-primary" />
                        {selectedNote.seedFile}
                      </span>
                    ) : null}
                    {selectedNote.tableName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Table2 className="size-3.5 text-brand-primary" />
                        {selectedNote.tableName}
                      </span>
                    ) : null}
                    {selectedNote.exampleTitle ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5 text-brand-primary" />
                        {selectedNote.exampleTitle}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="ui-icon-button h-8 shrink-0 gap-1.5 px-3 text-xs font-bold"
                  onClick={handleCopyPublicLink}
                  disabled={shareNote.isPending}
                  title="공개 공유 링크 복사"
                >
                  {selectedNote.isPublic ? <Copy className="size-3.5" /> : <Share2 className="size-3.5" />}
                  {copied ? '복사됨' : '공유'}
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-surface-raised px-8 py-7">
                <div className="prose-sql-note max-w-none">
                  <BlockViewer content={selectedNote.content} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center text-center">
              <NotebookPen className="mb-3 size-10 text-text-muted" />
              <p className="text-sm font-bold text-text-primary">노트를 찾을 수 없습니다</p>
              <p className="mt-1 text-xs text-text-muted">
                삭제되었거나 현재 계정에서 접근할 수 없는 SQL 노트입니다.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
