import * as Dialog from '@radix-ui/react-dialog'
import {
  Activity,
  ArrowRight,
  CheckSquare,
  ClipboardList,
  Download,
  LoaderCircle,
  Plus,
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
import type { Task } from '../../../entities/task/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { downloadTaskExcelWorkbook } from '../../../features/task/lib/task-excel-export'

const TASK_EXPORT_PAGE_SIZE = 100

function getExportDate() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function fetchAllWorkspaceTasksForExport(workspaceId: string) {
  const items: Task[] = []
  let page = 1

  while (true) {
    const response = await taskApi.listWorkspaceTasks(workspaceId, {
      archived: false,
      sort: 'order',
      scope: 'all',
      page,
      pageSize: TASK_EXPORT_PAGE_SIZE,
    })
    items.push(...response.items)
    if (items.length >= response.total || response.items.length === 0) break
    page += 1
  }

  return items
}

export function TaskWorkspaceHomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const workspacesQuery = useTaskWorkspaces()
  const workspaces = workspacesQuery.data ?? []
  const [isExporting, setIsExporting] = useState(false)

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

      for (const workspace of exportWorkspaces) {
        const tasks = await fetchAllWorkspaceTasksForExport(workspace.id)
        worksheets.push({ name: workspace.name, tasks })
      }

      await downloadTaskExcelWorkbook(
        worksheets,
        `업무-워크스페이스별-${getExportDate()}.xlsx`,
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
    <div className="w-full min-w-0 ui-page-bg space-y-4">
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-primary-foreground shadow-sm">
            <CheckSquare className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              Task Workspaces
            </h1>
            <p className="text-xs ui-text-secondary">
              팀별 업무를 워크스페이스로 분리해 관리합니다.
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
            <CreateWorkspaceDialog />
          </div>
        ) : null}
      </div>

      <div className="min-h-[calc(100dvh-180px)] rounded-2xl border border-surface-border-soft bg-surface-raised/20 p-6 backdrop-blur-sm shadow-sm">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm ui-text-muted">
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            워크스페이스 불러오는 중...
          </div>
        ) : workspaces.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <TaskWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={() =>
                  navigate({
                    to: '/task/workspaces/$workspaceId',
                    params: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-md border border-dashed border-surface-border bg-surface-muted text-sm ui-text-muted">
            <p>생성된 워크스페이스가 없습니다.</p>
            {isAuthenticated ? <CreateWorkspaceDialog /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskWorkspaceCard({ workspace, onOpen }: TaskWorkspaceCardProps) {
  const completedCount = Math.max(0, workspace.taskCount - workspace.openTaskCount)
  const progressPct = workspace.taskCount > 0 ? (completedCount / workspace.taskCount) * 100 : 0

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        '--accent-color': 'var(--color-brand-primary)',
        '--accent-glass': 'var(--color-brand-glass)',
        '--accent-glass-strong': 'color-mix(in srgb, var(--color-brand-primary) 18%, transparent)',
        '--accent-border': 'var(--color-brand-border)',
        '--accent-border-hover': 'color-mix(in srgb, var(--color-brand-primary) 55%, transparent)',
      } as React.CSSProperties}
      className="group relative overflow-hidden flex flex-col justify-between min-h-[200px] rounded-2xl border border-surface-border bg-surface-raised text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-border-hover)] hover:shadow-md hover:shadow-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] p-0"
    >

      {/* 1. Header Panel - Clearly divided area */}
      <div className="w-full px-5 py-3.5 border-b border-surface-border-soft/60 bg-surface-raised flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* Accent-colored squircle icon wrapper */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-glass)] text-[var(--accent-color)] transition-all duration-500 group-hover:scale-105 group-hover:bg-[var(--accent-color)] group-hover:text-background group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_25%,transparent)]">
            <CheckSquare className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-text-primary group-hover:text-[var(--accent-color)] transition-colors leading-tight">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-[11px] text-text-muted">
              {workspace.description ?? '팀 업무 워크스페이스'}
            </p>
          </div>
        </div>

        {/* Small compact chevron on the right */}
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-surface-border-soft bg-surface-muted/30 text-text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:border-[var(--accent-border)] group-hover:bg-[var(--accent-glass)] group-hover:text-[var(--accent-color)]">
          <ArrowRight className="size-3" />
        </div>
      </div>

      {/* 2. Middle Body Panel - Compact statistics inside tinted container */}
      <div className="w-full px-5 py-3.5 bg-surface-muted/10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Tasks Box */}
          <div className="rounded-xl border border-surface-border-soft/60 bg-surface-raised/50 p-2.5 transition-all duration-300 group-hover:bg-surface-raised/90 group-hover:border-surface-border-soft">
            <div className="flex items-center gap-1.5 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
              <ClipboardList className="size-3 text-text-muted" />
              전체 업무
            </div>
            <div className="mt-0.5 text-lg font-black text-text-primary">
              {workspace.taskCount}
            </div>
          </div>

          {/* Active Tasks Box */}
          <div className="rounded-xl border border-surface-border-soft/60 bg-surface-raised/50 p-2.5 transition-all duration-300 group-hover:bg-surface-raised/90 group-hover:border-surface-border-soft">
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
                <Activity className="size-3 text-[var(--accent-color)]" />
                진행 중
              </div>
              {/* Pulsing Active Dot with accent color */}
              {workspace.openTaskCount > 0 && (
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-border)] opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--accent-color)]"></span>
                </span>
              )}
            </div>
            <div className="mt-0.5 text-lg font-black text-[var(--accent-color)]">
              {workspace.openTaskCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Footer Panel - Integrated progress bar */}
      <div className="w-full px-5 py-3 border-t border-surface-border-soft bg-surface-muted/20">
        <div className="flex items-center justify-between text-[9px] font-bold text-text-muted mb-1.5">
          <span>워크스페이스 완료율</span>
          <span className="text-[var(--accent-color)]">{Math.round(progressPct)}% ({completedCount}/{workspace.taskCount})</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-500 ease-out shadow-[0_0_6px_var(--accent-color)]"
            style={{ width: `${progressPct}%` }}
          />
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
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-raised p-6 shadow-2xl">
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
