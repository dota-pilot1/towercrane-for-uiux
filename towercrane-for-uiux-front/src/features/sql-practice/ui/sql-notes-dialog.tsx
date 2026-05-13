import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenCheck, CalendarDays, Database, Edit2, NotebookPen, Table2, Trash2, UserRound, X } from 'lucide-react'
import { useState } from 'react'

import type { SqlPracticeNote } from '../../../entities/sql-practice/model/types'
import type { SqlPracticeExample } from '../../../entities/sql-practice/model/example-types'
import {
  useCreateSqlPracticeNote,
  useDeleteSqlPracticeNote,
  useSqlPracticeNotes,
  useUpdateSqlPracticeNote,
} from '../model/use-sql-practice-queries'
import { NoteForm } from '../../challenge/user-notes/ui/note-form'
import { BlockTypeBadge, BlockViewer } from '../../challenge/user-notes/ui/block-viewer'
import { parseBlock } from '../../challenge/user-notes/lib/block-types'

type SqlNotesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  seedFile?: string
  selectedExample: SqlPracticeExample | null
  selectedTable: string | null
}

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

export function SqlNotesDialog({
  open,
  onOpenChange,
  userName,
  seedFile,
  selectedExample,
  selectedTable,
}: SqlNotesDialogProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const notesQuery = useSqlPracticeNotes(undefined, open)
  const createNote = useCreateSqlPracticeNote()
  const updateNote = useUpdateSqlPracticeNote()
  const deleteNote = useDeleteSqlPracticeNote()

  const notes = notesQuery.data ?? []
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0] ?? null
  const editingNote = notes.find((note) => note.id === editingNoteId) ?? null
  const editingBlock = editingNote ? parseBlock(editingNote.content) : null
  const isBusy = createNote.isPending || updateNote.isPending || deleteNote.isPending
  const displayName = userName.trim() ? `${userName}의 SQL 노트` : '나의 SQL 노트'

  const contextBadges = [
    seedFile ? { icon: Database, label: seedFile } : null,
    selectedExample
      ? { icon: BookOpenCheck, label: `Q.${String(selectedExample.order).padStart(2, '0')} ${selectedExample.title}` }
      : null,
    selectedTable ? { icon: Table2, label: selectedTable } : null,
  ].filter(Boolean) as { icon: typeof Database; label: string }[]

  const openCreateForm = () => {
    setEditingNoteId(null)
    setConfirmingDeleteId(null)
    setFormOpen(true)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed inset-4 z-[211] flex flex-col overflow-hidden rounded-md border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="ui-icon-button-brand size-9 shrink-0">
                  <NotebookPen className="size-4" />
                </div>
                <Dialog.Title className="truncate text-lg font-black text-text-primary">
                  {displayName}
                </Dialog.Title>
              </div>

              {contextBadges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contextBadges.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex max-w-[420px] items-center gap-1.5 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-secondary"
                    >
                      <Icon className="size-3 shrink-0 text-brand-primary" />
                      <span className="truncate">{label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[390px_minmax(0,1fr)] gap-4 bg-surface-muted/50 p-4">
            <aside className="ui-panel flex min-h-0 flex-col overflow-hidden rounded-md">
              <div className="flex items-center justify-between border-b border-surface-border-soft px-4 py-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-brand-primary">SQL NOTES</p>
                  <p className="mt-1 text-base font-black text-text-primary">노트 목록</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-surface-border-soft bg-surface-raised px-2.5 py-1 text-xs font-black text-text-secondary">
                    {notes.length} notes
                  </span>
                  <button
                    type="button"
                    className="ui-icon-button-brand size-8"
                    title="노트 추가"
                    onClick={openCreateForm}
                  >
                    <NotebookPen className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[52px_minmax(0,1fr)_72px] border-b border-surface-border-soft bg-surface-muted px-4 py-3 text-[11px] font-black uppercase text-text-muted">
                <span>NO.</span>
                <span>제목</span>
                <span className="text-right">날짜</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {notesQuery.isLoading ? (
                  <div className="flex min-h-[180px] items-center justify-center text-xs text-text-muted">
                    불러오는 중
                  </div>
                ) : notes.length === 0 ? (
                  <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center">
                    <NotebookPen className="mb-2 size-7 text-text-muted" />
                    <p className="text-xs font-bold text-text-primary">노트가 없습니다</p>
                    <p className="mt-1 text-[11px] leading-5 text-text-muted">
                      오른쪽에서 첫 노트를 작성하세요.
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
                          onClick={() => {
                            setFormOpen(false)
                            setEditingNoteId(null)
                            setSelectedNoteId(note.id)
                            setConfirmingDeleteId(null)
                          }}
                          className={`group relative w-full overflow-hidden rounded-md border px-3.5 py-3 text-left shadow-sm transition-colors ${
                            isSelected
                              ? 'border-brand-border bg-brand-glass text-brand-primary shadow-md'
                              : 'border-surface-border-soft bg-surface-raised text-text-primary hover:border-brand-border hover:bg-surface-muted'
                          }`}
                        >
                          {isSelected && <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-brand-primary" />}
                          <div className="grid grid-cols-[44px_minmax(0,1fr)_64px] items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-sm font-black text-brand-primary">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{getNoteTitle(note)}</p>
                            </div>
                            <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-center text-[11px] font-black text-text-secondary">
                              {formatDate(note.updatedAt).replace(/\s/g, '')}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>

            <main className="ui-panel flex min-h-0 flex-col overflow-hidden rounded-md">
              {formOpen ? (
                <div className="flex min-h-0 flex-1 flex-col p-5">
                  <NoteForm
                    key={editingNote?.id ?? 'create'}
                    loading={isBusy}
                    initialTitle={editingNote?.title ?? ''}
                    initialContent={editingBlock?.data ?? ''}
                    initialBlockType={editingBlock?.blockType ?? 'NOTE'}
                    onCancel={() => {
                      setFormOpen(false)
                      setEditingNoteId(null)
                    }}
                    onSubmit={(data) => {
                      if (editingNote) {
                        updateNote.mutate(
                          {
                            id: editingNote.id,
                            payload: {
                              title: data.title,
                              content: data.content,
                              pinned: data.pinned,
                            },
                          },
                          {
                            onSuccess: () => {
                              setFormOpen(false)
                              setEditingNoteId(null)
                              setSelectedNoteId(editingNote.id)
                            },
                          },
                        )
                        return
                      }

                      createNote.mutate(
                        {
                          seedFile,
                          exampleId: selectedExample?.id,
                          exampleTitle: selectedExample?.title,
                          tableName: selectedTable ?? undefined,
                          title: data.title,
                          content: data.content,
                          pinned: data.pinned,
                        },
                        {
                          onSuccess: (note) => {
                            setSelectedNoteId(note.id)
                            setFormOpen(false)
                          },
                        },
                      )
                    }}
                  />
                </div>
              ) : selectedNote ? (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-6 py-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-muted">
                        SQL NOTE DETAIL
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <h3 className="truncate text-xl font-black text-text-primary">
                          {getNoteTitle(selectedNote)}
                        </h3>
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
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="ui-icon-button size-8"
                        title="수정"
                        onClick={() => {
                          setEditingNoteId(selectedNote.id)
                          setFormOpen(true)
                          setConfirmingDeleteId(null)
                        }}
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="ui-icon-button-danger size-8"
                        title="삭제"
                        onClick={() => setConfirmingDeleteId(selectedNote.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-surface-raised px-8 py-7">
                    <div className="prose-sql-note max-w-none">
                      <BlockViewer
                        content={selectedNote.content}
                        onChecklistToggle={(content) => updateNote.mutate({ id: selectedNote.id, payload: { content } })}
                      />
                    </div>
                  </div>

                  {confirmingDeleteId === selectedNote.id && (
                    <div className="flex items-center gap-3 border-t border-surface-border-soft bg-surface-muted px-6 py-4">
                      <p className="flex-1 text-xs font-semibold text-text-secondary">
                        이 노트를 삭제할까요? 삭제한 노트는 복구할 수 없습니다.
                      </p>
                      {deleteNote.isError && deletingNoteId === selectedNote.id && (
                        <p className="text-xs font-semibold text-destructive">{deleteNote.error.message}</p>
                      )}
                      <button
                        type="button"
                        className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-raised disabled:opacity-50"
                        disabled={deletingNoteId === selectedNote.id}
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-destructive bg-surface-raised px-3 py-1.5 text-xs font-bold text-destructive hover:bg-surface-muted disabled:opacity-50"
                        disabled={deletingNoteId === selectedNote.id}
                        onClick={() => {
                          setDeletingNoteId(selectedNote.id)
                          deleteNote.mutate(selectedNote.id, {
                            onSettled: () => {
                              setDeletingNoteId(null)
                              setSelectedNoteId(null)
                              setConfirmingDeleteId(null)
                            },
                          })
                        }}
                      >
                        {deletingNoteId === selectedNote.id ? '삭제 중' : '삭제'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <NotebookPen className="mb-3 size-10 text-text-muted" />
                  <p className="text-sm font-bold text-text-primary">아직 SQL 노트가 없습니다</p>
                  <p className="mt-1 text-xs text-text-muted">
                    문제를 풀면서 헷갈린 쿼리, 테이블 관계, 정리한 개념을 남겨두세요.
                  </p>
                  <button
                    type="button"
                    className="ui-icon-button-brand mt-4 h-8 gap-1.5 px-3 text-xs font-bold"
                    onClick={openCreateForm}
                  >
                    <NotebookPen className="size-3.5" />
                    노트 추가
                  </button>
                </div>
              )}
            </main>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
