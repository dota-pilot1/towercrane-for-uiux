import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, GitBranch, LoaderCircle, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCreatePrototypeWorkspace,
  usePrototypeWorkspaces,
  type PrototypeWorkspace,
} from '../../../shared/api/catalog'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

export function PrototypeWorkspaceHomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const workspacesQuery = usePrototypeWorkspaces()
  const workspaces = workspacesQuery.data ?? []

  return (
    <div className="w-full min-w-0 ui-page-bg space-y-3">
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-text-primary px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="size-3.5 shrink-0 text-background/70" />
          <h1 className="text-sm font-black text-background">Prototype Workspaces</h1>
          <span className="hidden text-xs text-background/50 sm:block">
            팀별 프로토타입과 설계 문서를 관리합니다.
          </span>
        </div>
        {isAuthenticated ? <CreateWorkspaceDialog /> : null}
      </div>

      <div className="min-h-[calc(100dvh-160px)] rounded-md border border-surface-border bg-surface-raised p-5">
        {workspacesQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm ui-text-muted">
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            워크스페이스 불러오는 중...
          </div>
        ) : workspaces.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <PrototypeWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={() =>
                  navigate({
                    to: '/prototype/workspaces/$workspaceId',
                    params: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-muted text-sm ui-text-muted">
            생성된 워크스페이스가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

type PrototypeWorkspaceCardProps = {
  workspace: PrototypeWorkspace
  onOpen: () => void
}

function PrototypeWorkspaceCard({ workspace, onOpen }: PrototypeWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-h-[168px] rounded-md border border-surface-border bg-surface-muted p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-border hover:bg-surface-strong hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <Users className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-text-primary">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">
              {workspace.description ?? '프로토타입 워크스페이스'}
            </p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-sm border border-surface-border bg-surface-raised px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            Categories
          </div>
          <div className="mt-1 text-xl font-black text-text-primary">
            {workspace.categoryCount}
          </div>
        </div>
        <div className="rounded-sm border border-surface-border bg-surface-raised px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            Prototypes
          </div>
          <div className="mt-1 text-xl font-black text-text-primary">
            {workspace.prototypeCount}
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
  const createWorkspace = useCreatePrototypeWorkspace()

  const canSubmit = name.trim().length >= 2

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    await createWorkspace.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      icon: 'GitBranch',
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
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
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
                placeholder="예: 매장 관리와 주문 흐름 프로토타입"
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
