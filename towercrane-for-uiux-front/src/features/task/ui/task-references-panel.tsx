import { useState, type FormEvent } from 'react'
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react'
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

export function TaskReferencesPanel({ taskId }: { taskId: string }) {
  const referencesQuery = useTaskReferences(taskId)
  const createReference = useCreateTaskReference(taskId)
  const deleteReference = useDeleteTaskReference(taskId)
  const [form, setForm] =
    useState<CreateTaskReferenceRequest>(INITIAL_FORM)
  const references = referencesQuery.data ?? []

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
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-surface-border-soft bg-surface-muted p-3"
      >
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">
                타입
              </span>
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
              <span className="text-xs font-bold text-text-secondary">
                제목
              </span>
              <Input
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

          <div className="flex justify-end">
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
        </div>
      </form>

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
