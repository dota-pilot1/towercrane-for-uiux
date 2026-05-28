import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FolderKanban, Plus, ShieldAlert, ArrowRight } from 'lucide-react'
import { ProjectIssueWorkbench } from '../../../features/project-issue/ui/project-issue-workbench'
import {
  useCreateProjectIssueWorkspace,
  useProjectIssueWorkspaces,
} from '../../../features/project-issue/model/use-project-issue-queries'

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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const selectedWorkspace = workspaceId
    ? workspaces.find((workspace) => workspace.id === workspaceId)
    : null

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    const workspace = await createWorkspace.mutateAsync({
      name: trimmedName,
      description: description.trim(),
    })
    setName('')
    setDescription('')
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

          <form
            className="grid gap-2.5 rounded-xl border border-surface-border-soft bg-surface-muted p-3 lg:w-[28rem] shadow-2xs"
            onSubmit={handleCreate}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="ui-input h-10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="워크스페이스 이름"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-glass px-4 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!name.trim() || createWorkspace.isPending}
              >
                <Plus className="size-4" aria-hidden />
                추가
              </button>
            </div>
            <input
              className="ui-input h-10"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="설명"
            />
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-raised/20 backdrop-blur-sm p-6 shadow-sm">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
            워크스페이스를 불러오는 중입니다.
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
            등록된 이슈 워크스페이스가 없습니다.
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
                {/* 상단 액센트 탑 라인 */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary/30 via-brand-primary to-brand-primary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="w-full flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    {/* 프로젝트 이슈 아이콘 */}
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
