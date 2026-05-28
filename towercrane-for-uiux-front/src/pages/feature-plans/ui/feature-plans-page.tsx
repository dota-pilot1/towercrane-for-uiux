import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  CheckSquare,
  FileText,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import {
  useCreateFeaturePlan,
  useDeleteFeaturePlan,
  useFeaturePlanDetail,
  useFeaturePlanList,
  useRegisterFeaturePlanTask,
  useUpdateFeaturePlan,
} from '../../../entities/feature-plan/api/feature-plan-api'
import type { CreateFeaturePlanPayload } from '../../../entities/feature-plan/model/types'
import { Button } from '../../../shared/ui/button'
import { Mermaid } from '../../../shared/ui/mermaid'
import { PageHeader } from '../../../shared/ui/page-header'

type FeaturePlansPageProps = {
  planId?: string | null
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function truncate(value: string, length = 120) {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}

function parseFrontmatter(value: string) {
  if (!value.startsWith('---')) return { metadata: {}, body: value }
  const endIndex = value.indexOf('\n---', 3)
  if (endIndex === -1) return { metadata: {}, body: value }

  const metadata = value
    .slice(3, endIndex)
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (match?.[1]) acc[match[1]] = (match[2] ?? '').replace(/^['"]|['"]$/g, '').trim()
      return acc
    }, {})

  return {
    metadata,
    body: value.slice(endIndex + 4).trim(),
  }
}

function getMarkdownTitle(body: string) {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null
}

function normalizeSectionName(value: string) {
  return value
    .replace(/[#`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function getMarkdownSection(body: string, names: string[]) {
  const wantedNames = new Set(names.map(normalizeSectionName))
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const captured: string[] = []
  let capturing = false
  let inFence = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) inFence = !inFence

    const headingMatch = !inFence ? line.match(/^#{2,3}\s+(.+?)\s*#*\s*$/) : null
    if (headingMatch?.[1]) {
      if (capturing) break
      capturing = wantedNames.has(normalizeSectionName(headingMatch[1]))
      continue
    }

    if (capturing) captured.push(line)
  }

  return captured.join('\n').trim()
}

function stripFence(value: string) {
  const lines = value.trim().replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim().startsWith('```')) lines.shift()
  if (lines.at(-1)?.trim() === '```') lines.pop()
  return lines.join('\n').trim()
}

function sectionLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function buildFeaturePlanPayload(fileName: string, text: string): CreateFeaturePlanPayload {
  const { metadata, body } = parseFrontmatter(text)
  const summary =
    getMarkdownSection(body, ['전체 요약', '요약', 'summary']) ||
    getMarkdownSection(body, ['업무 배경', '배경', 'background']) ||
    truncate(body.replace(/^#\s+.+$/m, '').trim(), 1200)
  const content =
    getMarkdownSection(body, ['업무 배경', '배경', 'background']) ||
    getMarkdownSection(body, ['내용', 'content']) ||
    summary
  const acceptanceCriteria = getMarkdownSection(body, [
    '완료 기준',
    '완료조건',
    'acceptance criteria',
  ])
  const plan = getMarkdownSection(body, ['단계별 계획', '구현 계획', 'plan'])
  const folderStructure = stripFence(
    getMarkdownSection(body, ['예상 파일 구조', '파일 구조', 'folder structure']),
  )
  const checklist = sectionLines(getMarkdownSection(body, ['체크리스트', 'checklist']))
  const mmdContent = stripFence(getMarkdownSection(body, ['MMD', 'Mermaid', '흐름도']))

  return {
    title: truncate(metadata.title || getMarkdownTitle(body) || fileName.replace(/\.md$/i, ''), 177),
    summary: summary || `${fileName} 파일을 기준으로 기능 개발 계획을 등록했습니다.`,
    content,
    acceptanceCriteria,
    plan,
    folderStructure,
    checklist,
    mmdContent,
    sourceFileName: fileName,
  }
}

export function FeaturePlansPage({ planId = null }: FeaturePlansPageProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const listQuery = useFeaturePlanList({ q, page, pageSize: 20 })
  const createMutation = useCreateFeaturePlan()
  const selectedId = planId ?? listQuery.data?.items[0]?.id ?? null

  useEffect(() => {
    setPage(1)
  }, [q])

  async function uploadPlanFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const detail = await createMutation.mutateAsync(buildFeaturePlanPayload(file.name, text))
      toast.success('기능 개발 계획이 등록되었습니다.')
      navigate({ to: '/feature-plans/$planId', params: { planId: detail.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '계획 파일 등록에 실패했습니다.')
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader icon={CheckSquare} title="기능 개발 계획" />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".md,.markdown,.txt"
            onChange={uploadPlanFile}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 size-3.5" />
            )}
            계획 파일 업로드
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[460px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised">
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border-soft px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-text-primary">
              <FileText className="size-4 text-brand-primary" />
              계획 목록
            </div>
          </div>

          <div className="shrink-0 border-b border-surface-border-soft p-3">
            <label className="flex h-9 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="제목, 요약, 계획 검색"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                불러오는 중
              </div>
            ) : listQuery.data?.items.length ? (
              <div className="flex flex-col gap-2">
                {listQuery.data.items.map((item) => {
                  const isActive = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: '/feature-plans/$planId',
                          params: { planId: item.id },
                        })
                      }
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 text-sm font-extrabold text-text-primary">
                          {item.title}
                        </h3>
                        {item.linkedTaskId ? (
                          <span className="shrink-0 rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                            업무 연결
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-text-secondary">
                        {truncate(item.summary)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                        <span>{item.createdByName}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                        <span>체크 {item.checklistCount}개</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-12 text-center">
                <FileText className="mx-auto size-8 text-text-muted" />
                <p className="mt-3 text-sm font-bold text-text-primary">등록된 기능 개발 계획이 없습니다.</p>
                <p className="mt-1 text-xs text-text-secondary">
                  업무 등록 형식 Markdown 파일을 업로드하면 계획이 저장됩니다.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-surface-border-soft px-3 py-2 text-xs text-text-muted">
            <span>총 {listQuery.data?.total ?? 0}건</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {listQuery.data?.totalPages ?? 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-0 min-w-0 rounded-md border border-surface-border bg-surface-raised">
          {createMutation.isPending ? (
            <div className="flex h-full min-h-[28rem] items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="size-4 animate-spin" />
              계획 파일을 등록하는 중
            </div>
          ) : planId ? (
            <FeaturePlanDetailPanel
              planId={planId}
              onBack={() => navigate({ to: '/feature-plans' })}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <FileText className="mx-auto size-10 text-text-muted" />
                <h3 className="mt-4 text-base font-extrabold text-text-primary">
                  기능 개발 계획을 선택하세요
                </h3>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function FeaturePlanDetailPanel({
  planId,
  onBack,
}: {
  planId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const detailQuery = useFeaturePlanDetail(planId)
  const updateMutation = useUpdateFeaturePlan(planId)
  const deleteMutation = useDeleteFeaturePlan()
  const registerTaskMutation = useRegisterFeaturePlanTask(planId)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!detailQuery.data) return
    setTitle(detailQuery.data.title)
    setSummary(detailQuery.data.summary)
    setIsEditing(false)
  }, [detailQuery.data])

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        계획을 불러오는 중
      </div>
    )
  }

  if (!detailQuery.data) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-sm text-text-muted">
        기능 개발 계획을 찾을 수 없습니다.
      </div>
    )
  }

  const detail = detailQuery.data

  async function save() {
    await updateMutation.mutateAsync({ title, summary })
    toast.success('기능 개발 계획이 수정되었습니다.')
    setIsEditing(false)
  }

  async function remove() {
    if (!window.confirm('이 기능 개발 계획을 삭제할까요?')) return
    await deleteMutation.mutateAsync(planId)
    navigate({ to: '/feature-plans' })
  }

  async function registerTask() {
    const result = await registerTaskMutation.mutateAsync()
    toast.success('PMS 업무가 등록되었습니다.')
    navigate({ to: '/task/$taskId', params: { taskId: result.taskId } })
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="border-b border-surface-border-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {isEditing ? (
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="ui-input h-10 w-full max-w-2xl text-base font-extrabold"
              />
            ) : (
              <h2 className="text-xl font-extrabold text-text-primary">{detail.title}</h2>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
              <span>{detail.createdByName}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
              {detail.sourceFileName ? <span>{detail.sourceFileName}</span> : null}
              {detail.linkedTaskId ? <span>연결 업무 {detail.linkedTaskId}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {detail.linkedTaskId ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate({ to: '/task/$taskId', params: { taskId: detail.linkedTaskId as string } })
                }
              >
                연결 업무 열기
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={registerTask}
                disabled={registerTaskMutation.isPending}
              >
                {registerTaskMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <CheckSquare className="mr-1.5 size-3.5" />
                )}
                PMS 업무 등록
              </Button>
            )}
            {detail.canEdit ? (
              isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="mr-1.5 size-3.5" />
                    취소
                  </Button>
                  <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
                    저장
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1.5 size-3.5" />
                  수정
                </Button>
              )
            ) : null}
            {detail.canDelete ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={remove}
                disabled={deleteMutation.isPending}
                className="text-danger-500 hover:text-danger-500"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                삭제
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onBack}>
              닫기
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-extrabold text-text-primary">전체 요약</h3>
            {isEditing ? (
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="ui-input mt-2 min-h-28 w-full resize-y py-3 leading-6"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-6 text-text-secondary">
                {detail.summary}
              </p>
            )}
          </section>

          <TextSection title="업무 배경" value={detail.content} />
          <TextSection title="완료 기준" value={detail.acceptanceCriteria} />
          <TextSection title="단계별 계획" value={detail.plan} />
          <TextSection title="예상 파일 구조" value={detail.folderStructure} code />
          <ChecklistSection items={detail.checklist} />
          <MermaidSection value={detail.mmdContent} />
        </div>
      </div>
    </div>
  )
}

function TextSection({
  title,
  value,
  code = false,
}: {
  title: string
  value: string
  code?: boolean
}) {
  if (!value.trim()) return null
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">{title}</h3>
      {code ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-6 text-text-secondary">
          {value}
        </pre>
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-6 text-text-secondary">
          {value}
        </p>
      )}
    </section>
  )
}

function ChecklistSection({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">체크리스트</h3>
      <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3">
        <ul className="space-y-2 text-sm leading-6 text-text-secondary">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckSquare className="mt-1 size-4 shrink-0 text-brand-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function MermaidSection({ value }: { value: string }) {
  if (!value.trim()) return null
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">MMD</h3>
      <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted p-3">
        <Mermaid chart={value} className="min-h-48" />
      </div>
    </section>
  )
}
