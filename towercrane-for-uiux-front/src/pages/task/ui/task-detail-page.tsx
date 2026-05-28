import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  Bot,
  CalendarDays,
  CheckSquare,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FilePenLine,
  FileText,
  Folder,
  KeyRound,
  Link2,
  Loader2,
  MessageSquareText,
  Paperclip,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
} from '../../../entities/task/model/constants'
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../../../entities/task/model/types'
import { useAssignableUsers } from '../../../shared/api/users'
import { useSessionStore } from '../../../shared/store/session-store'
import {
  useCodeReviewDetail,
  useCodeReviewList,
  useLinkCodeReviewToTask,
  useTaskCodeReviewList,
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewDetail,
  CodeReviewRiskLevel,
  CodeReviewSummary,
} from '../../../entities/code-review/model/types'
import { BackLinkButton } from '../../../shared/ui/back-link-button'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { SectionCard } from '../../../shared/ui/section-card'
import { Textarea } from '../../../shared/ui/textarea'
import { TaskAttachmentsPanel } from '../../../features/task/ui/task-attachments-panel'
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTypeBadge,
} from '../../../features/task/ui/task-badges'
import { TaskChecklistPanel } from '../../../features/task/ui/task-checklist-panel'
import { TaskCommentsPanel } from '../../../features/task/ui/task-comments-panel'
import {
  useArchiveTasks,
  useDeleteTask,
  useRestoreTasks,
  useTaskDetail,
  useUpdateTask,
} from '../../../features/task/model/use-task-queries'

type FormState = {
  title: string
  content: string
  plan: string
  folderStructure: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

type FolderTreeNode = {
  name: string
  path: string
  isFile: boolean
  children: FolderTreeNode[]
}

type FolderTreeBuildNode = Omit<FolderTreeNode, 'children'> & {
  childrenMap: Map<string, FolderTreeBuildNode>
}

const TASK_SKILL_EXAMPLES = [
  {
    title: '바로 PMS 등록',
    content:
      'PMS에 업무 등록해줘. 개발 채팅 페이지에서 GPT, Gemini, Claude를 선택해서 말걸 수 있는 기능을 구현하려고 해. 구현 계획, 예상 파일 구조, MMD 흐름도까지 만들어서 등록해줘.',
  },
  {
    title: '계획 폴더 기반 등록',
    content:
      '/pms-task-register docs-for-5차 mvp/개발 채팅에서 gpt, gemini, claude 선택해서 말걸수 있게 하기\n구현 계획 폴더의 계획.md 또는 PLAN.md를 읽고 PMS 업무로 등록해줘.',
  },
]

const TASK_SKILL_EXAMPLE_TEXT = TASK_SKILL_EXAMPLES.map(
  (example) => `${example.title}\n${example.content}`,
).join('\n\n')

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormState(task: Task): FormState {
  return {
    title: task.title,
    content: task.content,
    plan: task.plan ?? '',
    folderStructure: task.folderStructure ?? '',
    taskType: task.taskType,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? '',
    dueDate: toDateInputValue(task.dueDate),
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
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

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-xs font-black text-text-secondary">{children}</span>
  )
}

function cleanFolderStructureLine(line: string) {
  return line
    .trim()
    .replace(/^[\s├└│─]+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim()
}

function buildFolderTree(value: string) {
  const root = new Map<string, FolderTreeBuildNode>()

  value
    .split('\n')
    .map(cleanFolderStructureLine)
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split('/').map((part) => part.trim()).filter(Boolean)
      let level = root
      let currentPath = ''

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        const isLast = index === parts.length - 1
        const existing = level.get(part)
        const node =
          existing ??
          {
            name: part,
            path: currentPath,
            isFile: isLast && part.includes('.'),
            childrenMap: new Map<string, FolderTreeBuildNode>(),
          }

        if (isLast && part.includes('.')) node.isFile = true
        level.set(part, node)

        if (!isLast) {
          level = node.childrenMap
        }
      })
    })

  const hydrate = (nodes: FolderTreeBuildNode[]): FolderTreeNode[] =>
    nodes.map((node) => {
      const children = hydrate(Array.from(node.childrenMap.values()))
      return {
        name: node.name,
        path: node.path,
        isFile: node.isFile && children.length === 0,
        children,
      }
    })

  return hydrate(Array.from(root.values()))
}

function FolderTreeItems({
  nodes,
  depth = 0,
}: {
  nodes: FolderTreeNode[]
  depth?: number
}) {
  return (
    <>
      {nodes.map((node) => (
        <li key={node.path}>
          <div
            className="flex min-h-6 items-center gap-2 rounded-sm px-1 text-xs text-text-primary"
            style={{ paddingLeft: `${depth * 1.25}rem` }}
          >
            {node.isFile ? (
              <FileText className="size-3.5 shrink-0 text-text-muted" />
            ) : (
              <Folder className="size-3.5 shrink-0 text-brand-primary" />
            )}
            <span className="whitespace-nowrap font-mono">{node.name}</span>
          </div>
          {node.children.length > 0 ? (
            <ul className="space-y-0.5">
              <FolderTreeItems nodes={node.children} depth={depth + 1} />
            </ul>
          ) : null}
        </li>
      ))}
    </>
  )
}

function FolderStructurePreview({ value }: { value: string }) {
  const nodes = buildFolderTree(value)
  if (nodes.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted px-4 py-6 text-center text-sm text-text-muted">
        도식으로 표시할 경로가 없습니다.
      </div>
    )
  }

  return (
    <div className="max-h-72 overflow-auto rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <ul className="min-w-max space-y-0.5">
        <FolderTreeItems nodes={nodes} />
      </ul>
    </div>
  )
}

function TaskSkillGuideDialog({
  open,
  onOpenChange,
  onCopyExample,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopyExample: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-text-primary">
                Codex 스킬로 업무 입력
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                Codex에게 PMS 등록 요청을 말하면 Towercrane 업무로 바로 등록합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button size-8"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 px-5 py-5">
            <section className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="size-4 text-brand-primary" />
                <p className="text-sm font-black text-text-primary">
                  스킬 발동 예시
                </p>
              </div>
              <div className="space-y-2">
                {TASK_SKILL_EXAMPLES.map((example) => (
                  <div
                    key={example.title}
                    className="rounded-md border border-surface-border-soft bg-surface-muted p-3"
                  >
                    <p className="mb-1 text-xs font-black text-text-secondary">
                      {example.title}
                    </p>
                    <p className="whitespace-pre-wrap font-mono text-sm leading-6 text-text-primary">
                      {example.content}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onCopyExample}
                >
                  <Copy className="mr-1.5 size-3.5" />
                  예시 전체 복사
                </Button>
              </div>
            </section>

            <section className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
              <div className="mb-3 flex items-center gap-2">
                <KeyRound className="size-4 text-brand-primary" />
                <p className="text-sm font-black text-text-primary">
                  공유 키 문의
                </p>
              </div>
              <p className="text-sm leading-6 text-text-secondary">
                업무 입력 API는 공유 키가 필요합니다. 스킬 설치 방법이나 키가
                필요하면{' '}
                <a
                  href="mailto:terecal@daum.net"
                  className="font-bold text-brand-primary underline-offset-4 hover:underline"
                >
                  terecal@daum.net
                </a>
                으로 문의하세요.
              </p>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function riskLabel(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') return '높음'
  if (riskLevel === 'medium') return '중간'
  return '낮음'
}

function riskClassName(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') return 'border-danger-border bg-danger-glass text-danger-500'
  if (riskLevel === 'medium') return 'border-brand-border bg-brand-glass text-brand-primary'
  return 'border-surface-border-soft bg-surface-raised text-text-secondary'
}

function TaskPlanSummary({ task }: { task: Task }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-text-primary">단계별 계획</h3>
        <p className="mt-2 min-h-24 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm leading-6 text-text-secondary">
          {task.plan || '등록된 단계별 계획이 없습니다.'}
        </p>
      </div>
      <div>
        <h3 className="text-sm font-black text-text-primary">예상 파일 구조</h3>
        {task.folderStructure ? (
          <div className="mt-2">
            <FolderStructurePreview value={task.folderStructure} />
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm text-text-muted">
            등록된 예상 파일 구조가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}

function TaskCodeReviewSelector({ taskId }: { taskId: string }) {
  const [q, setQ] = useState('')
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const linkedReviewsQuery = useTaskCodeReviewList(taskId)
  const reviewListQuery = useCodeReviewList({ q, page: 1, pageSize: 12 })
  const linkReview = useLinkCodeReviewToTask()
  const linkedReviews = linkedReviewsQuery.data?.items ?? []
  const selectedReviewId = activeReviewId ?? linkedReviews[0]?.id ?? null
  const activeDetailQuery = useCodeReviewDetail(selectedReviewId)
  const linkedIds = new Set(linkedReviews.map((review) => review.id))

  async function connectReview(review: CodeReviewSummary) {
    if (linkedIds.has(review.id)) {
      setActiveReviewId(review.id)
      return
    }

    setActiveReviewId(review.id)
    await linkReview.mutateAsync({ reviewId: review.id, taskId })
    toast.success('코드 리뷰를 업무에 연결했습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
        <Search className="size-4 text-text-muted" />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="리뷰 제목, 저장소, 요약 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-text-primary">리뷰 선택</h3>
            <span className="text-xs font-bold text-text-muted">
              연결 {linkedReviews.length}
            </span>
          </div>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-md border border-surface-border-soft bg-surface-raised p-2">
            {reviewListQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                코드 리뷰를 불러오는 중
              </div>
            ) : reviewListQuery.data?.items.length ? (
              reviewListQuery.data.items.map((review) => {
                const linked = linkedIds.has(review.id)
                const active = selectedReviewId === review.id
                return (
                  <button
                    key={review.id}
                    type="button"
                    onClick={() => connectReview(review)}
                    disabled={linkReview.isPending}
                    className={`w-full rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? 'border-brand-border bg-brand-glass'
                        : 'border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-black text-text-primary">
                        {review.title}
                      </p>
                      <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-bold ${linked ? 'border-brand-border bg-brand-glass text-brand-primary' : riskClassName(review.riskLevel)}`}>
                        {linked ? '연결됨' : riskLabel(review.riskLevel)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
                      {review.summary}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-text-muted">
                      {review.repository} · {formatDateTime(review.createdAt)}
                    </p>
                  </button>
                )
              })
            ) : (
              <p className="p-8 text-center text-sm text-text-muted">
                검색된 코드 리뷰가 없습니다.
              </p>
            )}
          </div>
        </div>

        <TaskCodeReviewDetail
          detail={activeDetailQuery.data ?? null}
          isLoading={linkedReviewsQuery.isLoading || activeDetailQuery.isLoading}
        />
      </div>
    </div>
  )
}

function TaskCodeReviewDetail({
  detail,
  isLoading,
}: {
  detail: CodeReviewDetail | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        연결된 리뷰를 불러오는 중
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted p-6 text-center">
        <div>
          <Code2 className="mx-auto size-8 text-brand-primary" />
          <p className="mt-3 text-sm font-black text-text-primary">
            선택된 코드 리뷰가 없습니다.
          </p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            왼쪽 목록에서 코드 리뷰를 선택하면 이 업무와 연결되고 상세가 표시됩니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className="rounded-md border border-surface-border-soft bg-surface-muted">
      <header className="border-b border-surface-border-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-text-primary">
              {detail.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
              <span>{detail.repository}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
              <span className={`rounded-sm border px-2 py-0.5 ${riskClassName(detail.riskLevel)}`}>
                위험도 {riskLabel(detail.riskLevel)}
              </span>
            </div>
          </div>
          <a
            href={`/code-reviews/${detail.id}`}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-primary hover:bg-surface-strong"
          >
            <ExternalLink className="mr-1.5 size-3.5" />
            상세
          </a>
        </div>
      </header>
      <div className="space-y-4 p-4">
        <div>
          <h4 className="text-sm font-black text-text-primary">전체 요약</h4>
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
            {detail.summary}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-black text-text-primary">검토 항목</h4>
          <div className="mt-2 space-y-2">
            {detail.findings.slice(0, 5).map((finding, index) => (
              <div
                key={`${finding.title}-${index}`}
                className="rounded-md border border-surface-border-soft bg-surface-raised p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-black text-text-primary">
                    {finding.title}
                  </p>
                  <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(finding.severity)}`}>
                    {riskLabel(finding.severity)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {finding.body}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  권장: {finding.recommendation}
                </p>
              </div>
            ))}
            {!detail.findings.length ? (
              <p className="rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm text-text-muted">
                검토 항목이 없습니다.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function TaskDetailPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { taskId?: string }
  const taskId = params.taskId ?? null
  const userRole = useSessionStore((state) => state.userRole)
  const isAdmin = userRole === 'admin'
  const taskQuery = useTaskDetail(taskId)
  const assignableUsersQuery = useAssignableUsers()
  const updateTask = useUpdateTask()
  const archiveTasks = useArchiveTasks()
  const restoreTasks = useRestoreTasks()
  const deleteTask = useDeleteTask()
  const task = taskQuery.data
  const users = assignableUsersQuery.data ?? []
  const [draft, setDraft] = useState<{
    taskId: string
    values: FormState
  } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [skillGuideOpen, setSkillGuideOpen] = useState(false)
  const [folderStructureMode, setFolderStructureMode] = useState<
    'text' | 'tree'
  >('text')
  const form = task
    ? draft?.taskId === task.id
      ? draft.values
      : toFormState(task)
    : null

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    navigate({ to: '/task' })
  }

  const updateDraft = (changes: Partial<FormState>) => {
    if (!task || !form) return
    setDraft({
      taskId: task.id,
      values: {
        ...form,
        ...changes,
      },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!task || !form || !form.title.trim()) return

    await updateTask.mutateAsync({
      id: task.id,
      body: {
        title: form.title.trim(),
        content: form.content,
        plan: form.plan,
        folderStructure: form.folderStructure,
        taskType: form.taskType,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
      },
    })
    setDraft(null)
  }

  const handleArchive = async () => {
    if (!task) return
    if (task.archived) {
      await restoreTasks.mutateAsync([task.id])
    } else {
      await archiveTasks.mutateAsync([task.id])
    }
    setDraft(null)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1600)
      toast.success('업무 링크를 복사했습니다.')
    } catch {
      toast.error('업무 링크 복사에 실패했습니다.')
    }
  }

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const handleCopySkillExample = () =>
    copyText(TASK_SKILL_EXAMPLE_TEXT, '스킬 발동 예시를 복사했습니다.')

  const handleDelete = async () => {
    if (!task) return
    const confirmed = window.confirm(
      '이 업무를 삭제할까요? 삭제 후에는 복원할 수 없습니다.',
    )
    if (!confirmed) return
    await deleteTask.mutateAsync(task.id)
    navigate({ to: '/task' })
  }

  if (taskQuery.isLoading || !form) {
    return (
      <div className="flex min-h-[52vh] items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-sm text-text-muted">
        업무 상세를 불러오는 중입니다.
      </div>
    )
  }

  if (!task) {
    return (
      <div className="mx-auto flex min-h-[52vh] max-w-3xl flex-col items-center justify-center gap-3 rounded-md border border-surface-border-soft bg-surface-muted text-center">
        <p className="text-sm font-bold text-text-primary">
          업무를 찾을 수 없습니다.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigate({ to: '/task' })}
        >
          목록으로
        </Button>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 ui-page-bg pb-8">
      <BackLinkButton onClick={goBack} />

      <header className="rounded-md border border-surface-border bg-surface-raised shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              <TaskTypeBadge taskType={task.taskType} />
            </div>
            <h1 className="break-words text-2xl font-black leading-tight text-text-primary">
              {task.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5 text-text-muted" />
                작성자 {task.reporterName ?? '-'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-text-muted" />
                생성 {formatDateTime(task.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={() => setSkillGuideOpen(true)}
              title="Codex 스킬 업무 입력법"
            >
              <Bot className="mr-1.5 size-3.5" />
              스킬 입력법
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={handleCopyLink}
              title="업무 링크 복사"
            >
              {linkCopied ? (
                <Check className="mr-1.5 size-3.5 text-brand-primary" />
              ) : (
                <Link2 className="mr-1.5 size-3.5" />
              )}
              {linkCopied ? '복사됨' : '링크 복사'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={handleArchive}
              disabled={
                archiveTasks.isPending ||
                restoreTasks.isPending ||
                deleteTask.isPending
              }
            >
              {task.archived ? (
                <ArchiveRestore className="mr-1.5 size-3.5" />
              ) : (
                <Archive className="mr-1.5 size-3.5" />
              )}
              {task.archived ? '복원' : '보관'}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 border-destructive bg-danger-glass text-destructive hover:bg-danger-glass"
                onClick={handleDelete}
                disabled={
                  archiveTasks.isPending ||
                  restoreTasks.isPending ||
                  deleteTask.isPending
                }
              >
                <Trash2 className="mr-1.5 size-3.5" />
                삭제
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <TaskSkillGuideDialog
        open={skillGuideOpen}
        onOpenChange={setSkillGuideOpen}
        onCopyExample={handleCopySkillExample}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <SectionCard
            title="기본 정보"
            description="제목, 내용, 담당자와 진행 상태를 관리합니다."
            icon={FilePenLine}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5 md:col-span-2">
                  <FieldLabel>제목</FieldLabel>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                    className="h-11"
                  />
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <FieldLabel>내용</FieldLabel>
                  <Textarea
                    value={form.content}
                    onChange={(event) =>
                      updateDraft({ content: event.target.value })
                    }
                    className="min-h-44 resize-y leading-6"
                  />
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <FieldLabel>단계별 계획</FieldLabel>
                  <Textarea
                    value={form.plan}
                    onChange={(event) =>
                      updateDraft({ plan: event.target.value })
                    }
                    className="min-h-36 resize-y font-mono text-sm leading-6"
                    placeholder="1. 현재 구조 확인&#10;2. 구현 범위 정리&#10;3. 코드 수정"
                  />
                </label>

                <div className="block space-y-1.5 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>예상 파일 구조</FieldLabel>
                    <div className="inline-flex rounded-sm border border-surface-border-soft bg-surface-muted p-0.5">
                      {[
                        ['text', '폴더 구조'],
                        ['tree', '도식'],
                      ].map(([value, label]) => {
                        const active = folderStructureMode === value
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                              active
                                ? 'bg-brand-primary text-text-on-brand'
                                : 'text-text-secondary hover:bg-surface-strong hover:text-text-primary'
                            }`}
                            onClick={() =>
                              setFolderStructureMode(value as 'text' | 'tree')
                            }
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {folderStructureMode === 'text' ? (
                    <Textarea
                      value={form.folderStructure}
                      onChange={(event) =>
                        updateDraft({ folderStructure: event.target.value })
                      }
                      className="min-h-32 resize-y font-mono text-sm leading-6"
                      placeholder="towercrane-for-uiux-front/src/...&#10;towercrane-for-uiux-server/src/..."
                    />
                  ) : (
                    <FolderStructurePreview value={form.folderStructure} />
                  )}
                </div>

                <label className="block space-y-1.5">
                  <FieldLabel>유형</FieldLabel>
                  <Select
                    value={form.taskType}
                    onChange={(event) =>
                      updateDraft({ taskType: event.target.value as TaskType })
                    }
                    className="h-10"
                  >
                    {TASK_TYPE_ORDER.map((type) => (
                      <option key={type} value={type}>
                        {TASK_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5">
                  <FieldLabel>상태</FieldLabel>
                  <Select
                    value={form.status}
                    onChange={(event) =>
                      updateDraft({ status: event.target.value as TaskStatus })
                    }
                    className="h-10"
                  >
                    {TASK_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5">
                  <FieldLabel>우선순위</FieldLabel>
                  <Select
                    value={form.priority}
                    onChange={(event) =>
                      updateDraft({
                        priority: event.target.value as TaskPriority,
                      })
                    }
                    className="h-10"
                  >
                    {TASK_PRIORITY_ORDER.map((priority) => (
                      <option key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5">
                  <FieldLabel>담당자</FieldLabel>
                  <Select
                    value={form.assigneeId}
                    onChange={(event) =>
                      updateDraft({ assigneeId: event.target.value })
                    }
                    className="h-10"
                  >
                    <option value="">미지정</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <FieldLabel>마감일</FieldLabel>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      updateDraft({ dueDate: event.target.value })
                    }
                    className="h-10"
                  />
                </label>
              </div>

              <div className="flex justify-end border-t border-surface-border-soft pt-4">
                <Button type="submit" disabled={updateTask.isPending}>
                  <Save className="mr-1.5 size-4" />
                  저장
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="체크리스트"
            description="진행 항목을 쪼개고 완료 여부를 추적합니다."
            icon={CheckSquare}
          >
            <TaskChecklistPanel taskId={task.id} showHeader={false} />
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <SectionCard
              title="계획"
              description="단계별 계획과 예상 파일 구조를 확인합니다."
              icon={CheckSquare}
            >
              <TaskPlanSummary task={task} />
            </SectionCard>

            <SectionCard
              title="연결된 코드 리뷰"
              description="등록된 코드 리뷰를 선택해 이 업무와 연결합니다."
              icon={Code2}
            >
              <TaskCodeReviewSelector taskId={task.id} />
            </SectionCard>
          </div>

          <SectionCard
            title="댓글"
            description="업무 논의와 결정 내용을 남깁니다."
            icon={MessageSquareText}
          >
            <TaskCommentsPanel taskId={task.id} />
          </SectionCard>
        </main>

        <aside className="space-y-4">
          <SectionCard
            title="첨부"
            description="이미지와 문서를 업무에 연결합니다."
            icon={Paperclip}
          >
            <TaskAttachmentsPanel task={task} />
          </SectionCard>
        </aside>
      </div>
    </section>
  )
}
