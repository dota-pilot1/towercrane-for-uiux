import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Database, Plus, UsersRound } from 'lucide-react'

import {
  useCreateSqlTeamPracticeWorkspace,
  useSqlTeamPracticeWorkspaces,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'

export function SqlTeamPracticePage() {
  const navigate = useNavigate()
  const workspacesQuery = useSqlTeamPracticeWorkspaces()
  const createWorkspaceMutation = useCreateSqlTeamPracticeWorkspace()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const workspaces = workspacesQuery.data ?? []

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const workspace = await createWorkspaceMutation.mutateAsync({
      title: trimmedTitle,
      description: description.trim(),
    })
    setTitle('')
    setDescription('')
    navigate({ to: `/sql/team/workspaces/${workspace.id}/edit` })
  }

  return (
    <section className="space-y-4 pb-16">
      <div className="flex min-w-0 flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-glass border border-brand-border shadow-xs">
            <UsersRound className="size-5 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black text-text-primary">SQL 연습장(팀)</h1>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              팀 워크스페이스 안에서 개인 SQL 연습장 구조를 같이 사용하고 멤버들과 협업하세요.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-md p-4">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]" onSubmit={handleCreate}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="팀 연습장 이름"
            maxLength={80}
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="설명"
            maxLength={1000}
          />
          <Button type="submit" className="gap-1.5" disabled={createWorkspaceMutation.isPending}>
            <Plus className="size-4" />
            생성
          </Button>
        </form>
      </Card>

      {workspacesQuery.isLoading ? (
        <Card className="flex min-h-48 items-center justify-center rounded-md p-6 text-sm font-semibold text-text-muted">
          팀 SQL 연습장을 불러오는 중입니다.
        </Card>
      ) : workspaces.length === 0 ? (
        <Card className="flex min-h-64 flex-col items-center justify-center rounded-md p-8 text-center">
          <Database className="size-10 text-brand-primary" />
          <h2 className="mt-4 text-base font-black text-text-primary">
            팀 SQL 연습장이 없습니다.
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">
            첫 팀 연습장을 만들면 기본 커머스 DB와 schema version이 자동으로 준비됩니다.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              className="ui-panel-soft rounded-md p-4 text-left transition hover:border-brand-border hover:bg-brand-glass"
              onClick={() => navigate({ to: `/sql/team/workspaces/${workspace.id}` })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-black text-text-primary">{workspace.title}</h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-text-muted">
                    {workspace.description || '설명 없음'}
                  </p>
                </div>
                <span className="shrink-0 rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-black text-brand-primary">
                  {workspace.myRole}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-text-secondary">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
                  문제 {workspace.problemCount}
                </div>
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
                  멤버 {workspace.memberCount}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
