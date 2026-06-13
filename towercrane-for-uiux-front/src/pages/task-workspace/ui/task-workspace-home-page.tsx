import * as Dialog from '@radix-ui/react-dialog'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Download,
  LayoutGrid,
  LoaderCircle,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import {
  useCreateTaskWorkspace,
  useTaskWorkspaces,
} from '../../../features/task/model/use-task-queries'
import { taskApi } from '../../../entities/task/api/task-api'
import type { Task, TaskFilters, TaskWorkspace } from '../../../entities/task/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { downloadTaskExcelWorkbook } from '../../../features/task/lib/task-excel-export'

const TASK_EXPORT_PAGE_SIZE = 100

type TaskWorkspaceHomeMode = 'all' | 'my'

type AccentStyle = React.CSSProperties & {
  '--task-accent': string
  '--task-accent-soft': string
  '--task-accent-muted': string
  '--task-accent-border': string
  '--task-accent-border-strong': string
  '--task-accent-border-subtle': string
  '--task-accent-shadow': string
  '--task-accent-wash': string
}

function getTaskAccentStyle(): AccentStyle {
  return {
    '--task-accent': 'var(--primary)',
    '--task-accent-soft': 'color-mix(in srgb, var(--primary) 4%, transparent)',
    '--task-accent-muted': 'color-mix(in srgb, var(--primary) 10%, transparent)',
    '--task-accent-border': 'color-mix(in srgb, var(--primary) 82%, transparent)',
    '--task-accent-border-strong': 'var(--primary)',
    '--task-accent-border-subtle': 'color-mix(in srgb, var(--primary) 48%, transparent)',
    '--task-accent-shadow': 'color-mix(in srgb, var(--primary) 10%, transparent)',
    '--task-accent-wash': 'color-mix(in srgb, var(--primary) 2%, transparent)',
  }
}

function getExportDate() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function fetchAllWorkspaceTasksForExport(
  workspaceId: string,
  filters: TaskFilters,
) {
  const items: Task[] = []
  let page = 1

  while (true) {
    const response = await taskApi.listWorkspaceTasks(workspaceId, {
      ...filters,
      archived: false,
      sort: 'order',
      page,
      pageSize: TASK_EXPORT_PAGE_SIZE,
    })
    items.push(...response.items)
    if (items.length >= response.total || response.items.length === 0) break
    page += 1
  }

  return items
}

export function TaskWorkspaceHomePage({
  scopeMode = 'all',
}: {
  scopeMode?: TaskWorkspaceHomeMode
}) {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const isMyMode = scopeMode === 'my'
  const workspaceFilters = isMyMode ? ({ scope: 'my' } as const) : undefined
  const workspacesQuery = useTaskWorkspaces(workspaceFilters)
  const workspaces = workspacesQuery.data ?? []
  const [isExporting, setIsExporting] = useState(false)

  const totalTasks = workspaces.reduce((sum, w) => sum + w.taskCount, 0)
  const totalOpen = workspaces.reduce((sum, w) => sum + w.openTaskCount, 0)
  const totalCompleted = Math.max(0, totalTasks - totalOpen)
  const overallPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  const handleExportAllWorkspaces = async () => {
    if (isExporting) return

    const exportWorkspaces = [...workspaces].sort(
      (a, b) => a.orderIdx - b.orderIdx,
    )
    if (exportWorkspaces.length === 0) {
      toast.error('다운로드할 워크스페이스가 없습니다.')
      return
    }

    setIsExporting(true)
    try {
      const worksheets: Array<{ name: string; tasks: Task[] }> = []
      const exportFilters: TaskFilters = {
        archived: false,
        sort: 'order',
        scope: scopeMode,
      }

      for (const workspace of exportWorkspaces) {
        const tasks = await fetchAllWorkspaceTasksForExport(
          workspace.id,
          exportFilters,
        )
        worksheets.push({ name: workspace.name, tasks })
      }

      await downloadTaskExcelWorkbook(
        worksheets,
        `${isMyMode ? '내업무' : '업무'}-워크스페이스별-${getExportDate()}.xlsx`,
      )
      const totalExported = worksheets.reduce(
        (sum, worksheet) => sum + worksheet.tasks.length,
        0,
      )
      toast.success(
        `워크스페이스 ${worksheets.length}개, 업무 ${totalExported}개를 엑셀로 내려받았습니다.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      style={getTaskAccentStyle()}
      className="w-full min-w-0 space-y-5 bg-background pb-8"
    >
      {/* Header Container with Visual Layering */}
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-surface-border-soft bg-surface-muted/50 px-5 py-4 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-border/40 bg-brand-glass text-brand-primary shadow-sm shadow-brand-primary/5">
            <CheckSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">
              {isMyMode ? 'My Task Workspaces' : 'Task Workspaces'}
            </p>
            <h1 className="mt-0.5 text-lg font-black tracking-tight text-text-primary">
              {isMyMode ? '내 업무 워크스페이스' : 'Task Workspaces'}
            </h1>
            <p className="mt-0.5 text-xs text-text-secondary">
              {isMyMode
                ? '내가 담당하거나 개인으로 등록한 업무를 워크스페이스별로 확인합니다.'
                : '팀별 업무를 워크스페이스로 분리해 관리합니다.'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={workspacesQuery.isLoading || isExporting}
              onClick={handleExportAllWorkspaces}
              title="모든 워크스페이스를 시트별로 엑셀 다운로드"
              aria-label="모든 워크스페이스를 시트별로 엑셀 다운로드"
            >
              {isExporting ? (
                <LoaderCircle className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 size-4" />
              )}
              {isExporting ? '내보내는 중...' : '전체 엑셀'}
            </Button>
            {isMyMode ? null : <CreateWorkspaceDialog />}
          </div>
        ) : null}
      </div>

      {/* Summary Tiles Row */}
      {!workspacesQuery.isLoading && workspaces.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            icon={<LayoutGrid className="size-4" />}
            label="워크스페이스"
            value={workspaces.length}
          />
          <SummaryTile
            icon={<ClipboardList className="size-4" />}
            label={isMyMode ? '내 업무' : '전체 업무'}
            value={totalTasks}
          />
          <SummaryTile
            icon={<Activity className="size-4" />}
            label="진행 중"
            value={totalOpen}
          />
          <SummaryTile
            icon={<CheckCircle2 className="size-4" />}
            label="완료"
            value={totalCompleted}
            trailing={
              <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--task-accent-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--task-accent)] [border-color:var(--task-accent-border)]">
                <TrendingUp className="size-3" />
                {overallPct}%
              </span>
            }
          />
        </div>
      ) : null}

      {/* Recessed Main Grid Wrapper */}
      <div className="min-h-[360px] xl:min-h-[calc(100dvh-380px)] rounded-2xl border border-surface-border-soft bg-surface-muted/40 p-6 shadow-xs">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm ui-text-muted">
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            워크스페이스 불러오는 중...
          </div>
        ) : workspaces.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {workspaces.map((workspace) => (
              <TaskWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                scopeMode={scopeMode}
                onOpen={() =>
                  navigate({
                    to: isMyMode
                      ? '/task/my/workspaces/$workspaceId'
                      : '/task/workspaces/$workspaceId',
                    params: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-surface-border bg-surface-muted text-sm ui-text-muted">
            <p>생성된 워크스페이스가 없습니다.</p>
            {isAuthenticated && !isMyMode ? <CreateWorkspaceDialog /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

type SummaryTileProps = {
  icon: React.ReactNode
  label: string
  value: number
  trailing?: React.ReactNode
}

function SummaryTile({ icon, label, value, trailing }: SummaryTileProps) {
  return (
    <div
      style={getTaskAccentStyle()}
      className="group relative overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-4 pt-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-md"
    >
      <span className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[var(--task-accent)] to-[var(--task-accent-border)] opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.1em] text-text-muted">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-[var(--task-accent-muted)] text-[var(--task-accent)] [border-color:var(--task-accent-border-subtle)]">
            {icon}
          </span>
          {label}
        </div>
        {trailing}
      </div>
      <div className="mt-2.5 text-3xl font-black tracking-tight text-text-primary">
        {value}
      </div>
    </div>
  )
}

type TaskWorkspaceCardProps = {
  workspace: TaskWorkspace
  scopeMode: TaskWorkspaceHomeMode
  onOpen: () => void
}

function TaskWorkspaceCard({
  workspace,
  scopeMode,
  onOpen,
}: TaskWorkspaceCardProps) {
  const isMyMode = scopeMode === 'my'
  const completedCount = Math.max(0, workspace.taskCount - workspace.openTaskCount)
  const progressPct = workspace.taskCount > 0 ? (completedCount / workspace.taskCount) * 100 : 0
  const remainingCount = Math.max(0, workspace.openTaskCount)

  return (
    <button
      type="button"
      onClick={onOpen}
      style={getTaskAccentStyle()}
      className="group relative flex min-h-[228px] flex-col overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:bg-surface-raised hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,var(--task-accent-wash)_0%,transparent_34%)]" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border bg-[var(--task-accent-muted)] text-[var(--task-accent)] transition-all duration-300 [border-color:var(--task-accent-border-subtle)] group-hover:scale-105 group-hover:bg-[var(--task-accent)] group-hover:text-primary-foreground group-hover:shadow-[0_10px_24px_var(--task-accent-shadow)]">
            <CheckSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black leading-tight text-text-primary transition-colors group-hover:text-[var(--task-accent)]">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-text-secondary">
              {workspace.description ?? '팀 업무 워크스페이스'}
            </p>
          </div>
        </div>
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-surface-border-soft bg-surface-raised text-text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-[var(--task-accent-muted)] group-hover:text-[var(--task-accent)]">
          <ArrowRight className="size-3.5" />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-surface-border-soft bg-surface-muted/60">
        <div className="min-w-0 px-3 py-3">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-text-muted">
            <ClipboardList className="size-3" />
            {isMyMode ? '내 업무' : '전체 업무'}
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-text-primary">
            {workspace.taskCount}
          </div>
        </div>
        <div className="min-w-0 border-l px-3 py-3 border-surface-border-soft">
          <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.1em] text-text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              <Activity className="size-3 text-[var(--task-accent)]" />
              진행 중
            </div>
            {workspace.openTaskCount > 0 ? (
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--task-accent)] shadow-[0_0_0_3px_var(--task-accent-muted)]" />
            ) : null}
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-[var(--task-accent)]">
            {workspace.openTaskCount}
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-lg border border-surface-border-soft bg-brand-glass px-3.5 py-3">
        <div className="flex items-center justify-between gap-3 text-xs font-black">
          <span className="text-text-secondary">완료율</span>
          <span className="text-[var(--task-accent)]">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-[var(--task-accent)] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
          <span>{completedCount}개 완료</span>
          <span>{remainingCount}개 남음</span>
        </div>
      </div>
    </button>
  )
}

function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createWorkspace = useCreateTaskWorkspace()

  const canSubmit = name.trim().length >= 2

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    await createWorkspace.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: 'CheckSquare',
    })
    setName('')
    setDescription('')
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="mr-1.5 size-4" />
          생성
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-black text-text-primary">
            워크스페이스 생성
          </Dialog.Title>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-text-secondary">이름</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 매장 운영팀"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-text-secondary">설명</span>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="예: 매장 관리와 주문 처리 업무"
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || createWorkspace.isPending}
              >
                {createWorkspace.isPending ? '생성 중...' : '생성'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
