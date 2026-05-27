import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowRight,
  GitBranch,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCreatePrototypeWorkspace,
  useDeletePrototypeWorkspace,
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
    <div className="w-full min-w-0 ui-page-bg space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <GitBranch className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-brand-primary">
              Prototype Workspaces
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-text-primary">
              설계 및 프로토타입 공간
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              팀별 프로토타입과 설계 문서를 워크스페이스로 분리하여 체계적으로 카탈로그를 빌드합니다.
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center rounded-2xl border border-dashed border-surface-border-soft bg-surface-raised/40 p-12">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-glass border border-brand-border text-brand-primary mb-4">
              <GitBranch className="size-7" />
            </div>
            <h3 className="text-base font-bold ui-text-primary mb-1">
              설계 워크스페이스가 없습니다
            </h3>
            <p className="text-xs ui-text-muted max-w-sm leading-relaxed mb-4">
              생성된 프로토타입 및 설계 공간이 비어 있습니다.<br />
              관리자 권한이 있는 경우 새로운 워크스페이스를 생성하실 수 있습니다.
            </p>
            {isAuthenticated ? <CreateWorkspaceDialog /> : null}
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
  const canManage = workspace.role === 'owner'

  return (
    <div className="group flex min-h-[196px] flex-col justify-between rounded-xl border border-surface-border bg-surface-raised p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:bg-brand-glass hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary transition-transform duration-200 group-hover:scale-105">
            <Users className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-text-primary group-hover:text-brand-primary transition-colors">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">
              {workspace.description ?? '프로토타입 워크스페이스'}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {canManage ? (
            <DeleteWorkspaceDialog workspace={workspace} />
          ) : (
            <Button
              type="button"
              size="sm-icon"
              variant="ghost"
              tone="danger"
              aria-label={`${workspace.name} 삭제 권한 없음`}
              title="소유자만 삭제할 수 있습니다"
              disabled
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            tone="brand"
            aria-label={`${workspace.name} 열기`}
            onClick={onOpen}
          >
            <ArrowRight className="size-3.5 transition-all duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-6 grid w-full grid-cols-2 gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
      >
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-3 transition-all duration-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            Categories
          </div>
          <div className="mt-1 text-2xl font-black text-text-primary">
            {workspace.categoryCount}
          </div>
        </div>
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-3 transition-all duration-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            Prototypes
          </div>
          <div className="mt-1 text-2xl font-black text-text-primary">
            {workspace.prototypeCount}
          </div>
        </div>
      </button>
    </div>
  )
}

function DeleteWorkspaceDialog({ workspace }: { workspace: PrototypeWorkspace }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleteWorkspace = useDeletePrototypeWorkspace()
  const hasCategories = workspace.categoryCount > 0

  const onDelete = async () => {
    if (hasCategories) return
    setError(null)

    try {
      await deleteWorkspace.mutateAsync(workspace.id)
      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '워크스페이스 삭제에 실패했습니다.',
      )
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          type="button"
          size="sm-icon"
          variant="ghost"
          tone="danger"
          aria-label={`${workspace.name} 삭제`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
          <Dialog.Title className="text-lg font-black text-text-primary">
            워크스페이스 삭제
          </Dialog.Title>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {workspace.name} 워크스페이스를 삭제합니다.
          </p>
          {hasCategories ? (
            <p className="mt-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm font-semibold text-text-secondary">
              카테고리가 있는 워크스페이스는 먼저 비워야 삭제할 수 있습니다.
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onDelete}
              disabled={hasCategories || deleteWorkspace.isPending}
              className="border-destructive bg-danger-glass text-destructive hover:bg-danger-glass hover:brightness-95"
            >
              {deleteWorkspace.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
