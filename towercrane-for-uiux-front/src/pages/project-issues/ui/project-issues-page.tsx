import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FolderKanban, Plus, ShieldAlert } from 'lucide-react'
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
      <section className="rounded-md border border-surface-border bg-surface-raised p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-sm bg-brand-glass text-brand-primary">
              <ShieldAlert className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-black text-text-primary">프로젝트 이슈</h1>
              <p className="mt-1 text-sm text-text-secondary">
                이슈 워크스페이스를 먼저 만들고, 워크스페이스별로 이슈를 관리합니다.
              </p>
            </div>
          </div>

          <form
            className="grid gap-2 rounded-md border border-surface-border-soft bg-surface-muted p-3 lg:w-[28rem]"
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 text-sm font-bold text-brand-primary transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
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

      <section className="rounded-md border border-surface-border bg-surface-raised p-4">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
            워크스페이스를 불러오는 중입니다.
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-text-muted">
            등록된 이슈 워크스페이스가 없습니다.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className="min-h-28 rounded-md border border-surface-border-soft bg-surface-muted p-4 text-left transition hover:border-brand-border hover:bg-brand-glass"
                onClick={() =>
                  navigate({
                    to: '/project-issues',
                    search: { workspaceId: workspace.id },
                  })
                }
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-raised text-brand-primary">
                    <FolderKanban className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="min-w-0 break-words text-sm font-black text-text-primary">
                        {workspace.name}
                      </h2>
                      <span className="shrink-0 rounded-sm border border-surface-border-soft px-1.5 py-0.5 text-[11px] font-bold text-text-muted">
                        {workspace.issueCount}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                      {workspace.description || '설명 없음'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
