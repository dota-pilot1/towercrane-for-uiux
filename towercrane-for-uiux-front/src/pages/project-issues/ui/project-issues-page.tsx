import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FolderKanban, Plus, ShieldAlert, ArrowRight, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ProjectIssueWorkbench } from '../../../features/project-issue/ui/project-issue-workbench'
import {
  useCreateProjectIssueWorkspace,
  useProjectIssueWorkspaces,
} from '../../../features/project-issue/model/use-project-issue-queries'

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
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-4 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-4" aria-hidden />
          워크스페이스 추가
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-brand-border/40 bg-brand-glass text-brand-primary">
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
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-surface-border px-4 text-sm font-semibold text-text-secondary hover:bg-surface-muted transition-all cursor-pointer"
                >
                  취소
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-5 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
      <section className="rounded-xl border border-surface-border bg-surface-raised p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl border border-brand-border/40 bg-brand-glass text-brand-primary shadow-sm shadow-brand-primary/5">
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

      <section className="rounded-xl border border-surface-border bg-surface-raised/20 backdrop-blur-sm p-6 shadow-sm">
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
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className="group flex flex-col justify-between min-h-[135px] rounded-2xl border border-surface-border-soft bg-surface-raised p-5 text-left shadow-2xs relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border cursor-pointer select-none"
                onClick={() =>
                  navigate({
                    to: '/project-issues',
                    search: { workspaceId: workspace.id },
                  })
                }
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary/30 via-brand-primary to-brand-primary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="w-full flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-primary-foreground group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
                      <FolderKanban className="size-5" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-base font-black text-text-primary tracking-tight transition-colors group-hover:text-brand-primary">
                          {workspace.name}
                        </h2>
                        <span className="shrink-0 rounded-full bg-brand-glass border border-brand-border/40 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand-primary shadow-2xs">
                          이슈 {workspace.issueCount}
                        </span>
                        {workspace.issueCount > 0 && (
                          <span className="shrink-0 size-1.5 rounded-full bg-brand-primary animate-pulse" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                        {workspace.description || '설명 없음'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1.5 size-4 shrink-0 text-text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
