import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, Link2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type {
  CreateTaskReferenceRequest,
  TaskReferenceType,
} from '../../../entities/task/model/types'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import {
  useCreateTaskReference,
  useDeleteTaskReference,
  useTaskReferences,
} from '../model/use-task-queries'

const REFERENCE_TYPE_LABELS: Record<TaskReferenceType, string> = {
  FIGMA: 'Figma',
  DOC: '문서',
  GITHUB: 'GitHub',
  URL: 'URL',
}

const REFERENCE_TYPE_OPTIONS: TaskReferenceType[] = [
  'FIGMA',
  'DOC',
  'GITHUB',
  'URL',
]

const INITIAL_FORM: CreateTaskReferenceRequest = {
  referenceType: 'FIGMA',
  title: '',
  url: '',
}

function getHost(value: string) {
  try {
    return new URL(value).host
  } catch {
    return value
  }
}

function inferReferenceType(url: string): TaskReferenceType | null {
  const normalized = url.toLowerCase()
  if (normalized.includes('figma.com')) return 'FIGMA'
  if (normalized.includes('github.com')) return 'GITHUB'
  if (normalized.includes('docs.google.com') || normalized.includes('notion.')) {
    return 'DOC'
  }
  return null
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TaskReferenceCreateButton({ taskId }: { taskId: string | null }) {
  const [open, setOpen] = useState(false)
  const createReference = useCreateTaskReference(taskId ?? '')
  const [form, setForm] = useState<CreateTaskReferenceRequest>(INITIAL_FORM)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = form.title.trim()
    const url = form.url.trim()
    if (!title || !url) return

    await createReference.mutateAsync({
      referenceType: form.referenceType,
      title,
      url,
    })
    setForm(INITIAL_FORM)
    setOpen(false)
    toast.success('참고 링크가 추가되었습니다.')
  }

  const handleUrlChange = (url: string) => {
    const inferredType = inferReferenceType(url)
    setForm((prev) => ({
      ...prev,
      url,
      referenceType: inferredType ?? prev.referenceType,
    }))
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setForm(INITIAL_FORM)
      }}
    >
      <Dialog.Trigger asChild>
        <Button type="button" size="sm" disabled={!taskId}>
          <Plus className="mr-1.5 size-3.5" />
          링크 추가
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] flex w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                참고 링크 추가
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                Figma, 문서, GitHub 링크를 업무에 연결합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 p-5">
            <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">타입</span>
                <Select
                  value={form.referenceType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      referenceType: event.target.value as TaskReferenceType,
                    }))
                  }
                  className="h-10"
                >
                  {REFERENCE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {REFERENCE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">제목</span>
                <Input
                  autoFocus
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="예: 모바일 홈 화면 Figma"
                  className="h-10"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">URL</span>
              <Input
                type="url"
                value={form.url}
                onChange={(event) => handleUrlChange(event.target.value)}
                placeholder="https://www.figma.com/..."
                className="h-10"
              />
            </label>

            <div className="mt-1 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm">
                  취소
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                size="sm"
                disabled={
                  createReference.isPending ||
                  !form.title.trim() ||
                  !form.url.trim()
                }
              >
                <Plus className="mr-1.5 size-4" />
                추가
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function TaskReferencesPanel({ taskId }: { taskId: string }) {
  const referencesQuery = useTaskReferences(taskId)
  const deleteReference = useDeleteTaskReference(taskId)
  const references = referencesQuery.data ?? []

  return (
    <div className="space-y-4">
      {referencesQuery.isLoading ? (
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm text-text-muted">
          참고 링크를 불러오는 중입니다.
        </div>
      ) : references.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
          연결된 참고 링크가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {references.map((reference) => (
            <article
              key={reference.id}
              className="rounded-md border border-surface-border-soft bg-surface-raised p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-brand-primary">
                  <Link2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                      {REFERENCE_TYPE_LABELS[reference.referenceType]}
                    </span>
                    <p className="min-w-0 truncate text-sm font-bold text-text-primary">
                      {reference.title}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-text-secondary">
                    {getHost(reference.url)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {reference.userName ?? '알 수 없음'} ·{' '}
                    {formatDateTime(reference.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ui-icon-button flex size-8 items-center justify-center"
                    aria-label="참고 링크 열기"
                    title="열기"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    tone="danger"
                    onClick={() => deleteReference.mutate(reference.id)}
                    disabled={deleteReference.isPending}
                    aria-label="참고 링크 삭제"
                    title="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
