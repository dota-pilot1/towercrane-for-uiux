import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Check, CheckCircle2, CircleHelp, Copy, Loader2, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { taskApi } from '../../../entities/task/api/task-api'
import type { Task, TaskFilters, TaskScope } from '../../../entities/task/model/types'
import { API_BASE_URL } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import { taskQueryKeys, useCreateCompletedTasks } from '../model/use-task-queries'

const COMPLETED_LIST_PAGE_SIZE = 100
const MAX_BULK_COMPLETED_TASKS = 50

function parseCompletedTaskTitles(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function formatCompletedTime(value?: string | null) {
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

function getCompletedBy(task: Task) {
  return (
    task.completedByName ??
    task.assigneeName ??
    task.reporterName ??
    task.ownerName ??
    '-'
  )
}

type CompletedTasksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  filters: TaskFilters
  defaultScope: TaskScope
  currentUserId?: string | null
  onOpenTask: (taskId: string) => void
}

export function CompletedTasksDialog({
  open,
  onOpenChange,
  workspaceId,
  filters,
  defaultScope,
  currentUserId,
  onOpenTask,
}: CompletedTasksDialogProps) {
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [agentHelpOpen, setAgentHelpOpen] = useState(false)
  const [agentPromptCopied, setAgentPromptCopied] = useState(false)
  const createCompletedTasks = useCreateCompletedTasks(workspaceId)
  const completedBulkEndpoint = workspaceId
    ? `/tasks/workspaces/${workspaceId}/completed/bulk`
    : '/tasks/completed/bulk'
  const agentCommitEndpoint = workspaceId
    ? `${API_BASE_URL}/public/tasks/agent/workspaces/${workspaceId}/commit-tasks`
    : null
  const agentPrompt = agentCommitEndpoint
    ? `커밋할 때마다 이번 커밋에서 완료했거나 추가로 추적해야 할 할일을 Towercrane에 등록해줘.

현재 워크스페이스 ID: ${workspaceId}

POST ${agentCommitEndpoint}
Header:
  x-towercrane-agent-key: <TOWERCRANE_AGENT_KEY>
  Content-Type: application/json

Body 예시:
{
  "commitHash": "$(git rev-parse HEAD)",
  "commitMessage": "$(git log -1 --pretty=%s)",
  "source": "agent",
  "completedText": "한 일을 한 줄에 하나씩 입력",
  "tasks": [
    {
      "title": "후속으로 추적할 할일",
      "content": "필요하면 상세 내용을 적는다.",
      "taskType": "QA",
      "status": "TODO",
      "priority": "MEDIUM",
      "completed": false
    }
  ]
}

규칙:
- 등록할 할일이 없으면 API를 호출하지 않는다.
- tasks는 1~50개까지 보낸다.
- completedText는 textarea처럼 여러 줄을 보낼 수 있고 각 줄은 DONE 상태로 등록된다.
- tasks 안에서 완료한 일은 completed: true로 보내면 DONE 상태로 등록한다.
- 후속 작업은 completed를 생략하거나 false로 보낸다.
- 로그인 토큰은 쓰지 않고 Agent 전용 키만 헤더로 보낸다.
- 요청 성공 후 createdCount와 생성된 taskId 목록을 보고한다.`
    : ''

  const completedFilters = useMemo<TaskFilters>(
    () => ({
      ...filters,
      status: 'DONE',
      archived: false,
      page: 1,
      pageSize: COMPLETED_LIST_PAGE_SIZE,
      sort: 'recent',
    }),
    [filters],
  )

  const completedTasksQuery = useQuery({
    queryKey: workspaceId
      ? taskQueryKeys.workspaceTasks(workspaceId, completedFilters)
      : taskQueryKeys.list(completedFilters),
    queryFn: () =>
      workspaceId
        ? taskApi.listWorkspaceTasks(workspaceId, completedFilters)
        : taskApi.list(completedFilters),
    enabled: open,
  })

  const parsedTitles = useMemo(() => parseCompletedTaskTitles(bulkText), [bulkText])
  const visibleTitles = parsedTitles.slice(0, MAX_BULK_COMPLETED_TASKS)
  const hasOverflow = parsedTitles.length > MAX_BULK_COMPLETED_TASKS
  const completedTasks = completedTasksQuery.data?.items ?? []
  const total = completedTasksQuery.data?.total ?? 0

  const handleSubmitBulk = async () => {
    if (visibleTitles.length === 0) {
      toast.error('등록할 완료 업무를 한 줄 이상 입력하세요.')
      return
    }
    if (hasOverflow) {
      toast.error(`한 번에 최대 ${MAX_BULK_COMPLETED_TASKS}개까지 등록할 수 있습니다.`)
      return
    }

    await createCompletedTasks.mutateAsync({
      scope: defaultScope,
      assigneeId: defaultScope === 'PERSONAL' ? currentUserId ?? null : null,
      items: visibleTitles.map((title) => ({ title })),
    })
    setBulkText('')
    setBulkOpen(false)
    await completedTasksQuery.refetch()
  }

  const handleCopyAgentPrompt = async () => {
    if (!agentPrompt) return
    try {
      await navigator.clipboard.writeText(agentPrompt)
      setAgentPromptCopied(true)
      toast.success('Agent 입력 프롬프트를 복사했습니다.')
      window.setTimeout(() => setAgentPromptCopied(false), 1500)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/25" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[min(920px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 text-xl font-black text-text-primary">
                <CheckCircle2 className="size-5 text-brand-primary" />
                완료 목록
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                업무, 완료자, 완료 시간만 간단히 확인합니다.
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Dialog.Root open={agentHelpOpen} onOpenChange={setAgentHelpOpen}>
                <Dialog.Trigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    disabled={!agentCommitEndpoint}
                    aria-label="Agent 대량 입력 도움말"
                    title="Agent 대량 입력 도움말"
                  >
                    <CircleHelp className="mr-1.5 size-3.5" />
                    Agent 입력
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/15" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] max-h-[82vh] w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Dialog.Title className="text-lg font-black text-text-primary">
                          Agent 입력 프롬프트 설명서
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-text-secondary">
                          Agent에게 이 프롬프트를 주면 현재 워크스페이스에 할일을 POST로 등록할 수 있습니다.
                        </Dialog.Description>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9"
                          onClick={handleCopyAgentPrompt}
                        >
                          {agentPromptCopied ? (
                            <Check className="mr-1.5 size-3.5 text-brand-primary" />
                          ) : (
                            <Copy className="mr-1.5 size-3.5" />
                          )}
                          {agentPromptCopied ? '복사됨' : '프롬프트 복사'}
                        </Button>
                        <Dialog.Close asChild>
                          <Button variant="secondary" size="icon" aria-label="도움말 닫기">
                            <X className="size-4" />
                          </Button>
                        </Dialog.Close>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4 text-sm text-text-primary">
                      <section className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="font-black">복사용 프롬프트</h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          아래 내용을 Agent에게 그대로 입력하면 됩니다.
                        </p>
                        <pre className="mt-3 max-h-[420px] overflow-auto rounded-md border border-surface-border-soft bg-surface-raised p-3 text-xs leading-5 text-text-secondary">
{agentPrompt}
                        </pre>
                      </section>

                      <section className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="font-black">완료 업무만 여러 줄로 등록</h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          textarea에 붙여 넣는 것처럼 한 줄에 하나씩 보내면 DONE 상태로 생성됩니다.
                        </p>
                        <pre className="mt-3 overflow-x-auto rounded-md border border-surface-border-soft bg-surface-raised p-3 text-xs leading-5 text-text-secondary">
{`POST ${completedBulkEndpoint}
{
  "completedText": "프로토타입 워크스페이스 삭제 기능 구현\\n완료 목록 대량 입력 API 추가"
}`}
                        </pre>
                      </section>

                      <section className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="font-black">배열로 등록</h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          JSON이 편하면 문자열 배열 또는 title 객체 배열을 보낼 수 있습니다.
                        </p>
                        <pre className="mt-3 overflow-x-auto rounded-md border border-surface-border-soft bg-surface-raised p-3 text-xs leading-5 text-text-secondary">
{`POST ${completedBulkEndpoint}
{
  "items": [
    "API 요청 형식 정리",
    { "title": "우상단 도움말 버튼 추가" }
  ]
}`}
                        </pre>
                      </section>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9"
                onClick={() => setBulkOpen((value) => !value)}
              >
                <Plus className="mr-1.5 size-3.5" />
                완료 업무 등록
              </Button>
              <Dialog.Close asChild>
                <Button variant="secondary" size="icon" aria-label="닫기">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {bulkOpen ? (
              <div className="mb-5 rounded-md border border-surface-border-soft bg-surface-muted p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-text-primary">
                    완료 업무 여러 줄 등록
                  </h3>
                  <span className="text-xs font-bold text-text-secondary">
                    {parsedTitles.length}개
                  </span>
                </div>
                <Textarea
                  className="mt-3 min-h-36 resize-y"
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder={'완료한 업무를 한 줄에 하나씩 입력\n예: 프로토타입 워크스페이스 삭제 기능 구현'}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-text-muted">
                    빈 줄은 제외하고 등록합니다. 최대 {MAX_BULK_COMPLETED_TASKS}개까지 가능합니다.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setBulkText('')
                        setBulkOpen(false)
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        visibleTitles.length === 0 ||
                        hasOverflow ||
                        createCompletedTasks.isPending
                      }
                      onClick={handleSubmitBulk}
                    >
                      {createCompletedTasks.isPending ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : null}
                      등록
                    </Button>
                  </div>
                </div>
                {hasOverflow ? (
                  <p className="mt-2 text-xs font-bold text-destructive">
                    한 번에 최대 {MAX_BULK_COMPLETED_TASKS}개까지만 등록할 수 있습니다.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-md border border-surface-border-soft">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col />
                  <col className="w-36" />
                  <col className="w-44" />
                  <col className="w-20" />
                </colgroup>
                <thead className="bg-surface-muted">
                  <tr className="border-b border-surface-border-soft">
                    <th className="px-4 py-3 text-xs font-black text-text-secondary">업무</th>
                    <th className="px-4 py-3 text-xs font-black text-text-secondary">완료자</th>
                    <th className="px-4 py-3 text-xs font-black text-text-secondary">완료 시간</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-text-secondary">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border-soft">
                  {completedTasksQuery.isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                        <Loader2 className="mr-2 inline size-4 animate-spin" />
                        완료 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : completedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                        완료된 업무가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    completedTasks.map((task) => (
                      <tr key={task.id} className="bg-surface-raised">
                        <td className="min-w-0 px-4 py-3">
                          <p className="truncate text-sm font-bold text-text-primary">
                            {task.title}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                          {getCompletedBy(task)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                          {formatCompletedTime(task.completedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => {
                              onOpenChange(false)
                              onOpenTask(task.id)
                            }}
                          >
                            상세
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > COMPLETED_LIST_PAGE_SIZE ? (
              <p className="mt-3 text-xs text-text-muted">
                최근 완료 업무 {COMPLETED_LIST_PAGE_SIZE}개만 표시합니다. 전체 {total}개
              </p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
