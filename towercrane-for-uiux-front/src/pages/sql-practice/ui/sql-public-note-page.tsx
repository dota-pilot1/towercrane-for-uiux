import { useParams } from '@tanstack/react-router'
import {
  CalendarDays,
  Database,
  FileText,
  NotebookPen,
  Table2,
  UserRound,
} from 'lucide-react'

import type { PublicSqlPracticeNote } from '../../../entities/sql-practice/model/types'
import { usePublicSqlPracticeNote } from '../../../features/sql-practice/model/use-sql-practice-queries'
import { BlockTypeBadge, BlockViewer } from '../../../features/challenge/user-notes/ui/block-viewer'
import { Card } from '../../../shared/ui/card'

function getNoteTitle(note: PublicSqlPracticeNote) {
  return note.title?.trim() || note.exampleTitle || note.tableName || '제목 없는 노트'
}

export function SqlPublicNotePage() {
  const params = useParams({ strict: false }) as { token?: string }
  const noteQuery = usePublicSqlPracticeNote(params.token)
  const note = noteQuery.data ?? null

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <Card className="flex items-center gap-3 rounded-md border border-surface-border-soft px-5 py-4">
          <div className="ui-icon-button-brand size-9 shrink-0">
            <NotebookPen className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-text-primary">공개 SQL 노트</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              공유 링크를 통해 공개된 SQL 학습 노트입니다.
            </p>
          </div>
        </Card>

        <Card className="min-h-[calc(100vh-150px)] overflow-hidden rounded-md border border-surface-border-soft">
          {noteQuery.isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-text-muted">
              노트를 불러오는 중입니다.
            </div>
          ) : note ? (
            <div className="flex min-h-[calc(100vh-150px)] flex-col">
              <div className="border-b border-surface-border-soft bg-surface-muted px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-muted">
                  PUBLIC SQL NOTE
                </p>
                <div className="mt-3 flex min-w-0 items-center gap-2">
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

              <div className="min-h-0 flex-1 overflow-y-auto bg-surface-raised px-8 py-7">
                <div className="prose-sql-note max-w-none">
                  <BlockViewer content={note.content} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <NotebookPen className="mb-3 size-10 text-text-muted" />
              <p className="text-sm font-bold text-text-primary">공개 노트를 찾을 수 없습니다</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                링크가 잘못되었거나, 공유가 해제된 SQL 노트입니다.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
