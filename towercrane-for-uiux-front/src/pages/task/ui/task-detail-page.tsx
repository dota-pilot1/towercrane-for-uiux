import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useNavigate, useParams } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckSquare,
  Check,
  Code2,
  ExternalLink,
  FileJson,
  FilePenLine,
  FileText,
  Folder,
  Link2,
  Loader2,
  MessageSquareText,
  Paperclip,
  Save,
  Search,
  Trash2,
  Upload,
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
  useCreateCodeReview,
  useLinkCodeReviewToTask,
  useTaskCodeReviewList,
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewDetail,
  CodeReviewFinding,
  CodeReviewRiskLevel,
  CodeReviewSummary,
  CreateCodeReviewPayload,
} from '../../../entities/code-review/model/types'
import { BackLinkButton } from '../../../shared/ui/back-link-button'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Mermaid } from '../../../shared/ui/mermaid'
import { Select } from '../../../shared/ui/select'
import { SectionCard } from '../../../shared/ui/section-card'
import { Textarea } from '../../../shared/ui/textarea'
import {
  TaskAttachmentsPanel,
  TaskMmdPanel,
} from '../../../features/task/ui/task-attachments-panel'
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTypeBadge,
} from '../../../features/task/ui/task-badges'
import { TaskChecklistPanel } from '../../../features/task/ui/task-checklist-panel'
import {
  TaskCommentCreateButton,
  TaskCommentsPanel,
} from '../../../features/task/ui/task-comments-panel'
import {
  useArchiveTasks,
  useCreateTaskChecklist,
  useDeleteTask,
  useRestoreTasks,
  useTaskDetail,
  useUpdateTask,
} from '../../../features/task/model/use-task-queries'
import { API_BASE_URL } from '../../../shared/api/http'

type FormState = {
  title: string
  content: string
  acceptanceCriteria: string
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

const PUBLIC_FRONTEND_ORIGIN = 'https://hibot-docu.com'
const PUBLIC_API_BASE_URL = 'https://api.hibot-docu.com/api'

function publicReferenceUrl(path: string) {
  const origin = window.location.origin
  const baseOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? PUBLIC_FRONTEND_ORIGIN
    : origin
  return `${baseOrigin}${path}`
}

function publicApiReferenceUrl(path: string) {
  const baseUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api$/.test(
    API_BASE_URL,
  )
    ? PUBLIC_API_BASE_URL
    : API_BASE_URL.replace(/\/+$/, '')
  return `${baseUrl}${path}`
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormState(task: Task): FormState {
  return {
    title: task.title,
    content: task.content,
    acceptanceCriteria: task.acceptanceCriteria ?? '',
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

function truncateText(value: string, length = 12000) {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}

function simpleHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `upload-${Math.abs(hash).toString(16).padStart(12, '0')}-${Date.now().toString(36)}`
}

function parseMarkdownFrontmatter(value: string) {
  if (!value.startsWith('---')) return { metadata: {}, body: value }
  const endIndex = value.indexOf('\n---', 3)
  if (endIndex === -1) return { metadata: {}, body: value }

  const metadata = value
    .slice(3, endIndex)
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
      if (match?.[1]) {
        acc[match[1]] = (match[2] ?? '').replace(/^['"]|['"]$/g, '').trim()
      }
      return acc
    }, {})

  return {
    metadata,
    body: value.slice(endIndex + 4).trim(),
  }
}

function markdownTitle(body: string) {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null
}

function markdownSection(body: string, names: string[]) {
  const escaped = names
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const match = body.match(
    new RegExp(
      `^#{1,3}\\s*(?:${escaped})\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`,
      'im',
    ),
  )
  return match?.[1]?.trim() ?? ''
}

function stripMarkdownFence(value: string) {
  const lines = value.trim().replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim().startsWith('```')) lines.shift()
  if (lines.at(-1)?.trim() === '```') lines.pop()
  return lines.join('\n').trim()
}

function markdownListItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+\[[ xX]\]\s+/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim(),
    )
    .filter(Boolean)
}

function buildTaskPlanFields(fileName: string, text: string) {
  const { body } = parseMarkdownFrontmatter(text)
  return {
    content:
      markdownSection(body, ['업무 배경', '배경', '내용', 'content']) ||
      markdownSection(body, ['전체 요약', '요약', 'summary']),
    acceptanceCriteria: markdownSection(body, [
      '완료 기준',
      '인수 조건',
      'Acceptance Criteria',
    ]),
    plan: markdownSection(body, ['단계별 계획', '구현 계획', 'plan']),
    checklistItems: markdownListItems(
      markdownSection(body, ['체크리스트', '검증 체크리스트', 'Checklist']),
    ),
    folderStructure: stripMarkdownFence(
      markdownSection(body, ['예상 파일 구조', '파일 구조', 'folder structure']),
    ),
    mmdContent: stripMarkdownFence(
      markdownSection(body, ['MMD', 'Mermaid', '흐름도']),
    ),
    title: markdownTitle(body) ?? fileName.replace(/\.(md|markdown|txt)$/i, ''),
  }
}

function buildTaskCodeReviewPayload(
  taskId: string,
  fileName: string,
  text: string,
): CreateCodeReviewPayload {
  const { metadata, body } = parseMarkdownFrontmatter(text)
  const sourceUrl =
    metadata.sourceUrl ||
    metadata.source_url ||
    `manual-upload://${encodeURIComponent(fileName)}-${Date.now()}`
  const summary =
    markdownSection(body, ['전체 요약', '요약', 'summary']) ||
    truncateText(body || `${fileName} 파일을 기준으로 코드 리뷰를 등록했습니다.`, 11997)
  const riskLevel =
    metadata.riskLevel === 'high' ||
    metadata.risk_level === 'high' ||
    metadata.riskLevel === 'medium' ||
    metadata.risk_level === 'medium'
      ? ((metadata.riskLevel ?? metadata.risk_level) as CodeReviewRiskLevel)
      : 'low'
  const changedFileLines = markdownSection(body, [
    '변경 파일',
    '변경 파일 구조',
    'changed files',
  ])
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
  const title =
    metadata.title ||
    markdownTitle(body) ||
    `파일 업로드 코드 리뷰 - ${fileName}`

  return {
    taskId,
    sourceType: 'diff_url',
    sourceUrl,
    repository: metadata.repository || 'manual-upload',
    title: truncateText(title, 177),
    summary,
    riskLevel,
    findings: [
      {
        category: 'process',
        severity: riskLevel,
        title: '리뷰 요약',
        body: summary,
        filePath: fileName,
        lineNumber: null,
        recommendation: '요약 기준으로 구현 의도와 실제 변경 흐름을 대조하세요.',
      },
      {
        category: 'code',
        severity: 'low',
        title: '리뷰 본문',
        body: truncateText(body, 11997),
        filePath: fileName,
        lineNumber: null,
        recommendation: '본문의 주요 검토 항목을 기준으로 남은 리스크를 확인하세요.',
      },
    ],
    testGaps: markdownSection(body, ['테스트', '검증', 'test', 'tests'])
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean),
    changedFiles: (changedFileLines.length ? changedFileLines : [fileName]).map(
      (path) => ({
        path,
        additions: 0,
        deletions: 0,
        reviewed: true,
        excludedReason: null,
      }),
    ),
    excludedFiles: [],
    diffHash: simpleHash(text),
    diffSnapshot: truncateText(text, 119997),
    model: 'file-upload',
  }
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

function PlanReferencePreviewDialog({
  open,
  onOpenChange,
  apiUrl,
  isLoading,
  statusText,
  error,
  preview,
  onCopy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiUrl: string
  isLoading: boolean
  statusText: string | null
  error: string | null
  preview: string
  onCopy: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] flex h-[min(82vh,760px)] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-text-primary">
                AI 참고 URL 테스트
              </Dialog.Title>
              <Dialog.Description className="mt-1 break-all text-sm text-text-secondary">
                {apiUrl}
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

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-text-primary">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    JSON을 불러오는 중입니다.
                  </span>
                ) : error ? (
                  <span className="text-destructive">요청 실패</span>
                ) : statusText ? (
                  <span>{statusText}</span>
                ) : (
                  <span>대기 중</span>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                onClick={onCopy}
                disabled={!preview}
              >
                <FileJson className="mr-1.5 size-3.5" />
                JSON 복사
              </Button>
            </div>

            {error ? (
              <pre className="min-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-danger-glass px-4 py-3 font-mono text-xs leading-5 text-destructive">
                {error}
              </pre>
            ) : (
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
                {preview || '아직 응답이 없습니다.'}
              </pre>
            )}
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

function findingCategoryLabel(category: CodeReviewFinding['category']) {
  if (category === 'structure') return '변경 파일'
  if (category === 'process') return '주요 프로세스'
  if (category === 'code') return '주요 로직'
  if (category === 'syntax') return '핵심 문법'
  if (category === 'architecture') return '아키텍처'
  if (category === 'clean_code') return '클린코드'
  if (category === 'diagram') return 'mmd'
  if (category === 'risk') return '리스크'
  return '평가'
}

function extractMermaidChart(value: string) {
  const fenced = value.match(/```(?:mmd|mermaid)?\n([\s\S]*?)```/i)
  return (fenced?.[1] ?? value).trim()
}

function isMermaidChart(value: string) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(
    value.trim(),
  )
}

function shouldRenderCodeBlock(category: CodeReviewFinding['category']) {
  return category === 'structure' || category === 'code' || category === 'syntax'
}

function TaskReviewFindingBody({ finding }: { finding: CodeReviewFinding }) {
  if (finding.category === 'diagram') {
    const chart = extractMermaidChart(finding.body)

    if (!isMermaidChart(chart)) {
      return (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
          {finding.body}
        </pre>
      )
    }

    return (
      <div className="mt-3 rounded-md border border-surface-border-soft bg-surface-raised p-3">
        <Mermaid chart={chart} className="min-h-36" />
      </div>
    )
  }

  if (shouldRenderCodeBlock(finding.category)) {
    if (finding.category === 'code' || finding.category === 'syntax') {
      return <TaskReviewMarkdownBody value={finding.body} />
    }

    return (
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
        {finding.body}
      </pre>
    )
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
      {finding.body}
    </p>
  )
}

function TaskReviewMarkdownBody({ value }: { value: string }) {
  return (
    <div className="mt-3 space-y-4 text-sm leading-6 text-text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h4: ({ children }) => (
            <h4 className="pt-2 text-sm font-extrabold text-text-primary">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {children}
            </p>
          ),
          hr: () => <hr className="my-5 border-surface-border-soft" />,
          ol: ({ children }) => (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className?.includes('hljs') || className?.startsWith('language-')) {
              return <code className={className}>{children}</code>
            }

            return (
              <code className="rounded-sm border border-surface-border-soft bg-surface-muted px-1 py-0.5 font-mono text-[0.92em] text-text-primary">
                {children}
              </code>
            )
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}

function TaskCodeReviewSelector({ taskId }: { taskId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const linkedReviewsQuery = useTaskCodeReviewList(taskId)
  const reviewListQuery = useCodeReviewList({ q, page: 1, pageSize: 12 })
  const createReview = useCreateCodeReview()
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

  async function uploadReviewFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const detail = await createReview.mutateAsync(
        buildTaskCodeReviewPayload(taskId, file.name, text),
      )
      setActiveReviewId(detail.id)
      toast.success('코드 리뷰 파일을 등록하고 업무에 연결했습니다.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '코드 리뷰 파일 등록에 실패했습니다.',
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-text-muted">
          연결된 리뷰 {linkedReviews.length}개
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,.json"
            className="hidden"
            onChange={uploadReviewFile}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={createReview.isPending}
          >
            {createReview.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 size-3.5" />
            )}
            리뷰 파일 추가
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Search className="mr-1.5 size-3.5" />
            코드 리뷰 가져오기
          </Button>
        </div>
      </div>

      <TaskCodeReviewDetail
        detail={activeDetailQuery.data ?? null}
        isLoading={linkedReviewsQuery.isLoading || activeDetailQuery.isLoading}
      />

      <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
          <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] flex h-[min(82vh,760px)] w-[min(900px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-black text-text-primary">
                  코드 리뷰 가져오기
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-text-secondary">
                  기존 코드 리뷰를 선택하면 이 업무와 연결됩니다.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
              <div className="flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
                <Search className="size-4 text-text-muted" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="리뷰 제목, 저장소, 요약 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border border-surface-border-soft bg-surface-raised p-2">
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
                        onClick={() => {
                          void connectReview(review)
                          setPickerOpen(false)
                        }}
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
            우상단의 리뷰 파일 추가 또는 코드 리뷰 가져오기로 리뷰를 연결하세요.
          </p>
        </div>
      </div>
    )
  }

  const diagramFindings = detail.findings.filter(
    (finding) => finding.category === 'diagram',
  )
  const reviewFindings = detail.findings.filter(
    (finding) => finding.category !== 'diagram',
  )

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
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-black text-text-primary">전체 요약</h4>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-secondary">
              {detail.summary}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-black text-text-primary">검토 항목</h4>
            <div className="mt-2 space-y-2">
              {reviewFindings.slice(0, 5).map((finding, index) => (
                <TaskReviewFindingCard
                  key={`${finding.title}-${index}`}
                  finding={finding}
                />
              ))}
              {!reviewFindings.length ? (
                <p className="rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm text-text-muted">
                  검토 항목이 없습니다.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div>
            <h4 className="text-sm font-black text-text-primary">MMD</h4>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              리뷰 흐름도와 다이어그램 항목을 별도로 확인합니다.
            </p>
          </div>
          {diagramFindings.length ? (
            diagramFindings.map((finding, index) => (
              <TaskReviewFindingCard
                key={`${finding.title}-${index}`}
                finding={finding}
                compact
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-raised p-6 text-center">
              <Code2 className="mx-auto size-7 text-text-muted" />
              <p className="mt-3 text-sm font-bold text-text-primary">
                등록된 MMD가 없습니다.
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                코드 리뷰에 diagram/mmd 항목이 있으면 이 영역에 표시됩니다.
              </p>
            </div>
          )}
        </aside>
      </div>
    </article>
  )
}

function TaskReviewFindingCard({
  finding,
  compact = false,
}: {
  finding: CodeReviewFinding
  compact?: boolean
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
            {findingCategoryLabel(finding.category)}
          </span>
          <h5 className="min-w-0 text-sm font-extrabold text-text-primary">
            {finding.title}
          </h5>
        </div>
        <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(finding.severity)}`}>
          {riskLabel(finding.severity)}
        </span>
      </div>
      <TaskReviewFindingBody finding={finding} />
      {!compact ? (
        <p className="mt-2 text-sm font-semibold text-text-primary">
          권장: {finding.recommendation}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
        {finding.filePath ? <span>{finding.filePath}</span> : null}
        {finding.lineNumber ? <span>line {finding.lineNumber}</span> : null}
      </div>
    </div>
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
  const createChecklist = useCreateTaskChecklist(taskId)
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
  const [planReferencePreviewOpen, setPlanReferencePreviewOpen] =
    useState(false)
  const [planReferencePreviewLoading, setPlanReferencePreviewLoading] =
    useState(false)
  const [planReferencePreviewStatus, setPlanReferencePreviewStatus] = useState<
    string | null
  >(null)
  const [planReferencePreviewError, setPlanReferencePreviewError] = useState<
    string | null
  >(null)
  const [planReferencePreview, setPlanReferencePreview] = useState('')
  const planFileInputRef = useRef<HTMLInputElement>(null)
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
        acceptanceCriteria: form.acceptanceCriteria,
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

  const handlePlanFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!task || !form || !file) return

    try {
      const text = await file.text()
      const parsed = buildTaskPlanFields(file.name, text)
      await updateTask.mutateAsync({
        id: task.id,
        body: {
          title: form.title.trim(),
          content: form.content,
          acceptanceCriteria:
            parsed.acceptanceCriteria || form.acceptanceCriteria,
          plan: parsed.plan || form.plan,
          folderStructure: parsed.folderStructure || form.folderStructure,
          mmdContent: parsed.mmdContent || task.mmdContent,
          taskType: form.taskType,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate || null,
        },
      })
      for (const item of parsed.checklistItems) {
        await createChecklist.mutateAsync(item)
      }
      setDraft(null)
      toast.success('계획 파일을 업무에 반영했습니다.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '계획 파일 등록에 실패했습니다.',
      )
    }
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
      await navigator.clipboard.writeText(publicReferenceUrl(`/task/${task.id}`))
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1600)
      toast.success('상세 페이지 링크를 복사했습니다.')
    } catch {
      toast.error('상세 페이지 링크 복사에 실패했습니다.')
    }
  }

  const getPlanApiUrl = () =>
    task ? publicApiReferenceUrl(`/public/tasks/${task.id}/plan-reference`) : ''

  const handleCopyPlanApiUrl = () => {
    if (!task) return
    void copyText(
      getPlanApiUrl(),
      'AI 참조용 업무 계획 API URL을 복사했습니다.',
    )
  }

  const handleTestPlanApiUrl = async () => {
    const apiUrl = getPlanApiUrl()
    if (!apiUrl) return

    setPlanReferencePreviewOpen(true)
    setPlanReferencePreviewLoading(true)
    setPlanReferencePreviewStatus(null)
    setPlanReferencePreviewError(null)
    setPlanReferencePreview('')

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
      })
      const text = await response.text()
      let formatted = text

      if (text) {
        try {
          formatted = JSON.stringify(JSON.parse(text), null, 2)
        } catch {
          formatted = text
        }
      }

      setPlanReferencePreviewStatus(
        `HTTP ${response.status} ${response.statusText}`,
      )

      if (!response.ok) {
        setPlanReferencePreviewError(formatted || '응답 본문이 없습니다.')
        return
      }

      setPlanReferencePreview(formatted || '응답 본문이 없습니다.')
    } catch (error) {
      setPlanReferencePreviewError(
        error instanceof Error ? error.message : 'AI 참고 URL 요청에 실패했습니다.',
      )
    } finally {
      setPlanReferencePreviewLoading(false)
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
            <BackLinkButton onClick={goBack} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={handleCopyLink}
              title="상세 페이지 링크 복사"
            >
              {linkCopied ? (
                <Check className="mr-1.5 size-3.5 text-brand-primary" />
              ) : (
                <Link2 className="mr-1.5 size-3.5" />
              )}
              {linkCopied ? '복사됨' : '상세 링크 복사'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={handleCopyPlanApiUrl}
              title="로그인 없이 GET으로 조회할 수 있는 업무 계획 JSON URL 복사"
            >
              <FileJson className="mr-1.5 size-3.5" />
              AI 참고 URL
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={handleTestPlanApiUrl}
              disabled={planReferencePreviewLoading}
              title="AI 참고 URL JSON 응답 테스트"
            >
              {planReferencePreviewLoading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Search className="mr-1.5 size-3.5" />
              )}
              AI URL 테스트
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

      <PlanReferencePreviewDialog
        open={planReferencePreviewOpen}
        onOpenChange={setPlanReferencePreviewOpen}
        apiUrl={getPlanApiUrl()}
        isLoading={planReferencePreviewLoading}
        statusText={planReferencePreviewStatus}
        error={planReferencePreviewError}
        preview={planReferencePreview}
        onCopy={() =>
          copyText(planReferencePreview, 'AI 참고 URL 응답 JSON을 복사했습니다.')
        }
      />

      <Tabs.Root defaultValue="basic" className="space-y-4">
        <Tabs.List className="flex flex-wrap gap-1 rounded-md border border-surface-border-soft bg-surface-muted p-1">
          {[
            ['basic', '기본'],
            ['plan', '계획'],
            ['test', '테스트'],
            ['review', '리뷰'],
          ].map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="rounded-sm px-4 py-2 text-sm font-bold text-text-secondary transition-colors data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="basic" className="focus:outline-none">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
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

                    <label className="block space-y-1.5">
                      <FieldLabel>유형</FieldLabel>
                      <Select
                        value={form.taskType}
                        onChange={(event) =>
                          updateDraft({
                            taskType: event.target.value as TaskType,
                          })
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
                          updateDraft({
                            status: event.target.value as TaskStatus,
                          })
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
                title="댓글"
                description="업무 논의와 결정 내용을 남깁니다."
                icon={MessageSquareText}
                action={<TaskCommentCreateButton taskId={task.id} />}
              >
                <TaskCommentsPanel taskId={task.id} showComposer={false} />
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
        </Tabs.Content>

        <Tabs.Content value="plan" className="focus:outline-none">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SectionCard
              title="계획"
              description="단계별 계획과 예상 파일 구조를 관리합니다."
              icon={CheckSquare}
              action={
                <div className="flex items-center gap-2">
                  <input
                    ref={planFileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt"
                    className="hidden"
                    onChange={handlePlanFileUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => planFileInputRef.current?.click()}
                    disabled={updateTask.isPending}
                  >
                    {updateTask.isPending ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 size-3.5" />
                    )}
                    계획 파일 추가
                  </Button>
                </div>
              }
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-1.5">
                  <FieldLabel>단계별 계획</FieldLabel>
                  <Textarea
                    value={form.plan}
                    onChange={(event) =>
                      updateDraft({ plan: event.target.value })
                    }
                    className="min-h-48 resize-y font-mono text-sm leading-6"
                    placeholder="1. 현재 구조 확인&#10;2. 구현 범위 정리&#10;3. 코드 수정"
                  />
                </label>

                <div className="block space-y-1.5">
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
                      className="min-h-48 resize-y font-mono text-sm leading-6"
                      placeholder="towercrane-for-uiux-front/src/...&#10;towercrane-for-uiux-server/src/..."
                    />
                  ) : (
                    <FolderStructurePreview value={form.folderStructure} />
                  )}
                </div>

                <div className="flex justify-end border-t border-surface-border-soft pt-4">
                  <Button type="submit" disabled={updateTask.isPending}>
                    <Save className="mr-1.5 size-4" />
                    계획 저장
                  </Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title="MMD"
              description="계획 흐름도를 Mermaid로 관리합니다."
              icon={FileText}
            >
              <TaskMmdPanel task={task} />
            </SectionCard>
          </div>
        </Tabs.Content>

        <Tabs.Content value="test" className="focus:outline-none">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SectionCard
              title="완료 기준"
              description="파일 등록의 완료 기준 섹션을 검증 기준으로 관리합니다."
              icon={CheckSquare}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-1.5">
                  <FieldLabel>완료 기준</FieldLabel>
                  <Textarea
                    value={form.acceptanceCriteria}
                    onChange={(event) =>
                      updateDraft({ acceptanceCriteria: event.target.value })
                    }
                    className="min-h-56 resize-y font-mono text-sm leading-6"
                    placeholder="- 사용자가 검증할 수 있는 완료 조건&#10;- 오류와 빈 상태가 처리됨&#10;- 로컬 검증이 완료됨"
                  />
                </label>

                <div className="flex justify-end border-t border-surface-border-soft pt-4">
                  <Button type="submit" disabled={updateTask.isPending}>
                    <Save className="mr-1.5 size-4" />
                    완료 기준 저장
                  </Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title="체크리스트"
              description="실행 항목과 완료 여부를 관리합니다."
              icon={CheckSquare}
            >
              <TaskChecklistPanel taskId={task.id} showHeader={false} />
            </SectionCard>
          </div>
        </Tabs.Content>

        <Tabs.Content value="review" className="focus:outline-none">
          <SectionCard
            title="리뷰"
            description="등록된 코드 리뷰를 선택해 이 업무와 연결합니다."
            icon={Code2}
          >
            <TaskCodeReviewSelector taskId={task.id} />
          </SectionCard>
        </Tabs.Content>
      </Tabs.Root>
    </section>
  )
}
