import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckSquare,
  Check,
  Clipboard,
  Code2,
  Copy,
  FilePenLine,
  FileText,
  Folder,
  Link2,
  MessageSquareText,
  Paperclip,
  Save,
  Trash2,
  UserRound,
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
  useTaskAiReviews,
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
  if (nodes.length === 0) return null

  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <div className="mb-2 flex items-center gap-2">
        <Folder className="size-4 text-brand-primary" />
        <p className="text-xs font-black text-text-secondary">도식 미리보기</p>
      </div>
      <div className="max-h-64 overflow-auto rounded-md border border-surface-border-soft bg-surface-raised p-2">
        <ul className="min-w-max space-y-0.5">
          <FolderTreeItems nodes={nodes} />
        </ul>
      </div>
    </div>
  )
}

function PromptCopyBox({
  title,
  content,
  onCopy,
}: {
  title: string
  content: string
  onCopy: () => void
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-text-secondary">{title}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
          <Copy className="mr-1.5 size-3.5" />
          복사
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary">
        {content}
      </p>
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
  const aiReviewsQuery = useTaskAiReviews(taskId)
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

  const implementationPrompt = task
    ? `이 업무(${task.id})를 구현해줘. 업무 상세, 단계별 계획, 예상 파일 구조를 참고해서 작업하고, 완료 후 변경 요약과 검증 결과를 남겨줘.`
    : ''
  const reviewPrompt = task
    ? `이 업무(${task.id})에 대한 구현 결과를 코드 리뷰로 등록해줘. 변경 파일, 주요 결정, 테스트 결과, 남은 리스크를 markdown으로 정리해줘.`
    : ''

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
                  <FieldLabel>예상 파일 구조</FieldLabel>
                  <Textarea
                    value={form.folderStructure}
                    onChange={(event) =>
                      updateDraft({ folderStructure: event.target.value })
                    }
                    className="min-h-32 resize-y font-mono text-sm leading-6"
                    placeholder="towercrane-for-uiux-front/src/...&#10;towercrane-for-uiux-server/src/..."
                  />
                  <FolderStructurePreview value={form.folderStructure} />
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

          <SectionCard
            title="Codex 요청"
            description="업무 ID와 스킬 요청 문구를 복사합니다."
            icon={Clipboard}
          >
            <div className="space-y-3">
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-text-secondary">
                      업무 ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-text-primary">
                      {task.id}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText(task.id, '업무 ID를 복사했습니다.')}
                  >
                    <Copy className="mr-1.5 size-3.5" />
                    복사
                  </Button>
                </div>
              </div>

              <PromptCopyBox
                title="구현 요청"
                content={implementationPrompt}
                onCopy={() =>
                  copyText(
                    implementationPrompt,
                    '구현 요청 문구를 복사했습니다.',
                  )
                }
              />
              <PromptCopyBox
                title="리뷰 등록 요청"
                content={reviewPrompt}
                onCopy={() =>
                  copyText(reviewPrompt, '리뷰 등록 문구를 복사했습니다.')
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="코드 리뷰"
            description="Codex가 등록한 구현 리뷰를 확인합니다."
            icon={Code2}
          >
            {aiReviewsQuery.isLoading ? (
              <p className="text-sm text-text-muted">
                코드 리뷰를 불러오는 중입니다.
              </p>
            ) : aiReviewsQuery.data?.length ? (
              <div className="space-y-3">
                {aiReviewsQuery.data.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-md border border-surface-border-soft bg-surface-muted p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-text-primary">
                        {review.title}
                      </h3>
                      <span className="rounded-md border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-text-muted">
                        {review.format}
                      </span>
                    </div>
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised p-3 text-sm leading-6 text-text-primary">
                      {review.content}
                    </pre>
                    <p className="mt-2 text-xs text-text-muted">
                      {formatDateTime(review.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                등록된 코드 리뷰가 없습니다.
              </p>
            )}
          </SectionCard>

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
