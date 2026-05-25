import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, CheckSquare, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCreateTaskWorkspace,
  useTaskWorkspaces,
} from '../../../features/task/model/use-task-queries'
import type { TaskWorkspace } from '../../../entities/task/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

export function TaskWorkspaceHomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const workspacesQuery = useTaskWorkspaces()
  const workspaces = workspacesQuery.data ?? []

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
        {isAuthenticated ? <CreateWorkspaceDialog /> : null}
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

type TaskWorkspaceCardProps = {
  workspace: TaskWorkspace
  onOpen: () => void
}

function TaskWorkspaceCard({ workspace, onOpen }: TaskWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col justify-between min-h-[190px] rounded-2xl border border-surface-border-soft bg-surface-raised p-5 text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
    >
      <div className="w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-primary-foreground group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
              <CheckSquare className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-text-primary">
                {workspace.name}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {workspace.description ?? '팀 업무 워크스페이스'}
              </p>
            </div>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" />
        </div>
      </div>

      <div className="mt-5 w-full grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised p-3 transition-all duration-300 group-hover:bg-surface-muted/30">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            전체 업무
          </div>
          <div className="mt-1 text-lg font-extrabold text-text-primary">
            {workspace.taskCount}
          </div>
        </div>
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised p-3 transition-all duration-300 group-hover:bg-surface-muted/30">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            진행 중
          </div>
          <div className="mt-1 text-lg font-extrabold text-brand-primary">
            {workspace.openTaskCount}
          </div>
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
