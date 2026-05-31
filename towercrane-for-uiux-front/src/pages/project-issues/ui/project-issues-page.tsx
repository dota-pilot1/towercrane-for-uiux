import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FolderKanban, Plus, ShieldAlert, ArrowRight, X, LayoutGrid, Calendar, ClipboardList, Activity } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ProjectIssueWorkbench } from '../../../features/project-issue/ui/project-issue-workbench'
import {
  useCreateProjectIssueWorkspace,
  useProjectIssueWorkspaces,
} from '../../../features/project-issue/model/use-project-issue-queries'

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-md border border-surface-border bg-surface-raised px-4 py-3.5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-border hover:bg-surface-muted/30">
      <div className="flex items-center gap-2 text-text-secondary">
        <div className="text-brand-primary opacity-80">{icon}</div>
        <span className="text-[11px] font-bold tracking-tight uppercase">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-black leading-none text-text-primary tracking-tight">
        {value}
      </p>
    </div>
  )
}

function CreateWorkspaceDialog({
  onCreate,
  isPending,
}: {
  onCreate: (name: string, description: string) => Promise<void>
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    await onCreate(trimmedName, description.trim())
    setName('')
    setDescription('')
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-border bg-brand-glass px-4 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-4" aria-hidden />
          워크스페이스 추가
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border border-brand-border/40 bg-brand-glass text-brand-primary">
                <FolderKanban className="size-5" aria-hidden />
              </div>
              <div>
                <Dialog.Title className="text-base font-black text-text-primary tracking-tight">
                  새 워크스페이스 만들기
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-text-muted">
                  이슈를 묶어 관리할 프로젝트 단위입니다.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button mt-0.5"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                워크스페이스 이름 <span className="text-brand-primary">*</span>
              </label>
              <input
                className="ui-input h-10 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 결제 모듈, 어드민 리뉴얼"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                설명 <span className="text-text-muted font-normal">(선택)</span>
              </label>
              <input
                className="ui-input h-10 w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 워크스페이스에서 다루는 이슈의 범위를 적어주세요."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-surface-border px-4 text-sm font-semibold text-text-secondary hover:bg-surface-muted transition-all cursor-pointer"
                >
                  취소
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-glass px-5 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!name.trim() || isPending}
              >
                <Plus className="size-4" aria-hidden />
                {isPending ? '생성 중…' : '만들기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ProjectIssuesPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    workspaceId?: string
    projectId?: string
  }
  const workspaceId = search.workspaceId ?? search.projectId
  const workspacesQuery = useProjectIssueWorkspaces()
  const createWorkspace = useCreateProjectIssueWorkspace()
  const workspaces = workspacesQuery.data ?? []

  const selectedWorkspace = workspaceId
    ? workspaces.find((workspace) => workspace.id === workspaceId)
    : null

  const handleCreate = async (name: string, description: string) => {
    const workspace = await createWorkspace.mutateAsync({ name, description })
    navigate({
      to: '/project-issues',
      search: { workspaceId: workspace.id },
    })
  }

  if (workspaceId && selectedWorkspace) {
    return (
      <ProjectIssueWorkbench
        workspaceId={workspaceId}
        title={`${selectedWorkspace.name} 이슈`}
        description={
          selectedWorkspace.description ||
          '선택한 워크스페이스의 이슈, 담당자, 체크리스트와 댓글을 관리합니다.'
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-surface-border bg-surface-muted p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-md border border-brand-border/40 bg-brand-glass text-brand-primary shadow-sm shadow-brand-primary/5">
              <ShieldAlert className="size-5.5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-black text-text-primary tracking-tight">프로젝트 이슈</h1>
              <p className="mt-0.5 text-xs text-text-secondary">
                이슈 워크스페이스를 먼저 만들고, 워크스페이스별로 이슈를 관리합니다.
              </p>
            </div>
          </div>

          <CreateWorkspaceDialog
            onCreate={handleCreate}
            isPending={createWorkspace.isPending}
          />
        </div>
      </section>

      {/* 요약 대시보드 타일 */}
      {!workspacesQuery.isLoading && workspaces.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile
            icon={<LayoutGrid className="size-4" />}
            label="워크스페이스"
            value={workspaces.length}
          />
          <SummaryTile
            icon={<ShieldAlert className="size-4" />}
            label="전체 등록 이슈"
            value={workspaces.reduce((sum, w) => sum + w.issueCount, 0)}
          />
          <SummaryTile
            icon={<Calendar className="size-4" />}
            label="활성 워크스페이스"
            value={`${workspaces.filter(w => w.issueCount > 0).length}개`}
          />
        </div>
      )}

      <section className="ui-panel p-6 shadow-sm">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
            워크스페이스를 불러오는 중입니다.
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm text-text-muted">
            <FolderKanban className="size-8 opacity-30" />
            <span>등록된 이슈 워크스페이스가 없습니다.</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {workspaces.map((workspace) => (
              <ProjectIssueWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={() =>
                  navigate({
                    to: '/project-issues',
                    search: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

type ProjectIssueWorkspaceCardProps = {
  workspace: any
  onOpen: () => void
}

function ProjectIssueWorkspaceCard({ workspace, onOpen }: ProjectIssueWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex min-h-[228px] flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-border hover:bg-surface-muted/30 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border cursor-pointer select-none"
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_2%,transparent)_0%,transparent_34%)]" />
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-md border border-brand-border/40 bg-brand-glass text-brand-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-primary-foreground group-hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_20%,transparent)]">
            <FolderKanban className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black leading-tight text-text-primary transition-colors group-hover:text-brand-primary">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-text-secondary">
              {workspace.description || '이슈 관리 워크스페이스'}
            </p>
          </div>
        </div>
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-surface-border-soft bg-surface-raised text-text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-glass group-hover:text-brand-primary">
          <ArrowRight className="size-3.5" />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised/70 w-full">
        <div className="min-w-0 px-3 py-3">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-text-muted">
            <ClipboardList className="size-3" />
            전체 이슈
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-text-primary">
            {workspace.issueCount}
          </div>
        </div>
        <div className="min-w-0 border-l px-3 py-3 border-surface-border-soft">
          <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.1em] text-text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              <Activity className="size-3 text-brand-primary" />
              상태
            </div>
            {workspace.issueCount > 0 ? (
              <span className="size-1.5 shrink-0 rounded-full bg-brand-primary animate-pulse" />
            ) : null}
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-brand-primary">
            {workspace.issueCount > 0 ? '활성' : '대기'}
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-md border border-surface-border-soft bg-brand-glass px-3.5 py-3 w-full">
        <div className="flex items-center justify-between gap-3 text-xs font-black">
          <span className="text-text-secondary">생성 날짜</span>
          <span className="text-brand-primary">{formatDate(workspace.createdAt)}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised/90">
          <div
            className="h-full rounded-full bg-brand-primary transition-all duration-500 ease-out"
            style={{ width: workspace.issueCount > 0 ? '100%' : '0%' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
          <span>{workspace.createdBy || 'Seed User'} 생성</span>
          <span>이슈 관리 ➔</span>
        </div>
      </div>
    </button>
  )
}
