import * as Dialog from '@radix-ui/react-dialog'
import { useState, type FormEvent } from 'react'
import { AlertTriangle, Database, FileUp, Loader2, X } from 'lucide-react'

import type {
  SqlPersonalPracticeSchemaVersion,
  SqlTeamPracticeSchemaVersion,
} from '../../../entities/sql-practice/model/types'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'

type SqlPersonalSchemaReplaceDialogProps = {
  open: boolean
  workspaceTitle: string
  currentVersion?: SqlPersonalPracticeSchemaVersion | SqlTeamPracticeSchemaVersion
  isPending: boolean
  errorMessage?: string | null
  onSubmit: (input: { file: File; title?: string; description?: string }) => Promise<void>
  onClose: () => void
}

export function SqlPersonalSchemaReplaceDialog({
  open,
  workspaceTitle,
  currentVersion,
  isPending,
  errorMessage,
  onSubmit,
  onClose,
}: SqlPersonalSchemaReplaceDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setLocalError(null)
  }

  const handleClose = () => {
    if (isPending) return
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)

    if (!file) {
      setLocalError('업로드할 SQL 파일을 선택해주세요.')
      return
    }

    if (!file.name.toLowerCase().endsWith('.sql')) {
      setLocalError('.sql 파일만 업로드할 수 있습니다.')
      return
    }

    await onSubmit({
      file,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[221] flex max-h-[min(720px,calc(100vh-2rem))] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-black text-text-primary">
                SQL 파일 교체
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-text-muted">
                새 schema version을 만들고 스터디의 active SQLite DB를 변경합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button size-8 shrink-0"
                disabled={isPending}
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-5">
            <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-brand-primary" />
                <p className="min-w-0 truncate text-sm font-black text-text-primary">
                  {workspaceTitle}
                </p>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold text-text-muted">
                <p>현재 버전: {currentVersion ? `v${currentVersion.version}` : '-'}</p>
                <p>현재 파일: {currentVersion?.sourceFileName ?? currentVersion?.title ?? '-'}</p>
                <p>hash: {currentVersion?.dbFileHash.slice(0, 10) ?? 'loading'}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-black text-text-primary">SQL 파일</span>
                <input
                  type="file"
                  accept=".sql"
                  className="mt-2 block w-full rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 text-sm font-semibold text-text-secondary file:mr-3 file:rounded-sm file:border file:border-surface-border-soft file:bg-surface-muted file:px-3 file:py-1 file:text-xs file:font-black file:text-text-primary"
                  disabled={isPending}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null
                    setFile(nextFile)
                    setLocalError(
                      nextFile && !nextFile.name.toLowerCase().endsWith('.sql')
                        ? '.sql 파일만 업로드할 수 있습니다.'
                        : null,
                    )
                    if (nextFile && !title.trim()) {
                      setTitle(nextFile.name.replace(/\.sql$/i, ''))
                    }
                  }}
                />
              </label>

              {file && (
                <div className="flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary">
                  <FileUp className="size-3.5 text-brand-primary" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span>{Math.ceil(file.size / 1024)}KB</span>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-black text-text-primary">버전 제목</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 개인 커머스 DB v2"
                  disabled={isPending}
                  className="mt-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-text-primary">설명</span>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="이번 SQL 파일 교체 내용을 간단히 적어주세요."
                  rows={3}
                  disabled={isPending}
                  className="mt-2 resize-none"
                />
              </label>
            </div>

            <div className="mt-4 rounded-md border border-brand-border bg-brand-glass px-3 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                <p className="text-xs font-semibold leading-5 text-text-secondary">
                  기존 문제와 공유 링크는 기존 DB 기준으로 유지됩니다. 교체 후 새로 만드는
                  문제부터 업로드한 SQL 기준으로 생성됩니다.
                </p>
              </div>
            </div>

            {(localError || errorMessage) && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-danger-glass px-3 py-2 text-sm font-semibold text-destructive">
                {localError || errorMessage}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={!file || isPending} className="gap-1.5">
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                교체하기
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
