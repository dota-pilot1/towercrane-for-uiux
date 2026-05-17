import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, NotebookPen } from 'lucide-react'

import type { SqlPracticeNote } from '../../../entities/sql-practice/model/types'
import {
  useCreateSqlPracticeNote,
  useSqlPracticeNotes,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { NoteForm } from '../../../features/challenge/user-notes/ui/note-form'
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

export function SqlNotesPage() {
  const navigate = useNavigate()
  const userName = useSessionStore((state) => state.userName)
  const [formOpen, setFormOpen] = useState(false)

  const notesQuery = useSqlPracticeNotes()
  const createNote = useCreateSqlPracticeNote()

  const notes = notesQuery.data ?? EMPTY_NOTES
  const displayName = userName.trim() ? `${userName}의 SQL 노트` : '나의 SQL 노트'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-[640px] flex-col gap-4">
      <Card className="flex items-center justify-between gap-4 rounded-md border border-surface-border-soft px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-9 shrink-0">
            <NotebookPen className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-text-primary">{displayName}</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              SQL 연습 중 정리한 개인 노트 목록입니다.
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

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-surface-border-soft">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-base font-black leading-none text-text-primary">노트 목록</p>
            <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass px-2 text-[11px] font-black tabular-nums text-brand-primary">
              {notes.length}
            </span>
          </div>
          <button
            type="button"
            className="ui-icon-button-brand size-8"
            title="노트 추가"
            onClick={() => setFormOpen(true)}
          >
            <NotebookPen className="size-3.5" />
          </button>
        </div>

        {formOpen && (
          <div className="border-b border-surface-border-soft bg-surface-muted/50 px-5 py-4">
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
                      navigate({ to: '/sql/notes/$noteId', params: { noteId: note.id } })
                    },
                  },
                )
              }}
            />
          </div>
        )}

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
                위 버튼을 눌러 첫 노트를 작성해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note, index) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate({ to: '/sql/notes/$noteId', params: { noteId: note.id } })}
                  className="group relative w-full overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2.5 text-left shadow-sm transition-colors hover:border-brand-border hover:bg-surface-muted"
                >
                  <div className="grid grid-cols-[34px_minmax(0,1fr)_76px] items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-xs font-black tabular-nums text-brand-primary">
                      {index + 1}
                    </div>
                    <p className="truncate text-sm font-black text-text-primary">{getNoteTitle(note)}</p>
                    <span className="inline-flex h-7 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted px-1.5 text-[11px] font-black tabular-nums text-text-secondary">
                      {formatDate(note.updatedAt).replace(/\s/g, '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
