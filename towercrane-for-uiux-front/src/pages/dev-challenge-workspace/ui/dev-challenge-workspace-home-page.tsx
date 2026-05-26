import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, LoaderCircle, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCreateDevChallengeWorkspace,
  useDevChallengeWorkspaces,
} from '../../../features/dev-challenge/lib/hooks'
import type { DevChallengeWorkspace } from '../../../entities/dev-challenge/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

export function DevChallengeWorkspaceHomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userRole = useSessionStore((state) => state.userRole)
  const canCreateWorkspace = isAuthenticated && userRole === 'admin'
  const workspacesQuery = useDevChallengeWorkspaces()
  const workspaces = workspacesQuery.data ?? []

  return (
    <div className="w-full min-w-0 ui-page-bg space-y-4">
      <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-primary-foreground shadow-sm">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              Challenge Workspaces
            </h1>
            <p className="text-xs ui-text-secondary">
              팀과 코스별 개발 챌린지를 워크스페이스로 관리합니다.
            </p>
          </div>
        </div>
        {canCreateWorkspace ? <CreateWorkspaceDialog /> : null}
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
              <DevChallengeWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={() =>
                  navigate({
                    to: '/dev-challenge/workspaces/$workspaceId',
                    params: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-md border border-dashed border-surface-border bg-surface-muted text-sm ui-text-muted">
            <p>생성된 챌린지 워크스페이스가 없습니다.</p>
            {canCreateWorkspace ? <CreateWorkspaceDialog /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

type DevChallengeWorkspaceCardProps = {
  workspace: DevChallengeWorkspace
  onOpen: () => void
}

function DevChallengeWorkspaceCard({
  workspace,
  onOpen,
}: DevChallengeWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col justify-between min-h-[195px] rounded-2xl border border-surface-border-soft bg-surface-raised p-5 text-left shadow-2xs relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border cursor-pointer select-none"
    >
      {/* 상단 액센트 탑 라인 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary/30 via-brand-primary to-brand-primary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            {/* 트로피 아이콘 컨테이너 */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-primary-foreground group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
              <Trophy className="size-5" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-black text-text-primary tracking-tight transition-colors group-hover:text-brand-primary">
                  {workspace.name}
                </h2>
                <span className="shrink-0 rounded-full bg-brand-glass border border-brand-border/40 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand-primary shadow-2xs">
                  {workspace.myRole}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {workspace.description || '개발 챌린지 워크스페이스'}
              </p>
            </div>
          </div>
          <ArrowRight className="mt-1.5 size-4 shrink-0 text-text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-primary" />
        </div>
      </div>

      <div className="mt-5 w-full grid grid-cols-3 gap-2">
        <Metric label="1차 주제" value={workspace.categoryCount} />
        <Metric label="과제" value={workspace.assignmentCount} brand />
        <Metric label="멤버" value={workspace.memberCount} />
      </div>
    </button>
  )
}

function Metric({
  label,
  value,
  brand,
}: {
  label: string
  value: number
  brand?: boolean
}) {
  return (
    <div className="rounded-xl border border-surface-border-soft/30 bg-surface-muted/30 p-3 transition-all duration-300 group-hover:bg-surface-muted/60 group-hover:border-brand-border/10">
      <div className="truncate text-[10px] font-extrabold uppercase tracking-widest text-text-muted transition-colors group-hover:text-text-secondary">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        {brand ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-xl font-black text-brand-primary tracking-tight">
              {value}
            </span>
            <span className="size-1.5 rounded-full bg-brand-primary animate-pulse" />
          </span>
        ) : (
          <span className="text-xl font-black text-text-primary tracking-tight transition-colors group-hover:text-brand-primary/80">
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createWorkspace = useCreateDevChallengeWorkspace()

  const canSubmit = name.trim().length >= 2

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    await createWorkspace.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: 'Trophy',
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
              <span className="text-sm font-semibold text-text-secondary">
                이름
              </span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 프론트엔드 온보딩"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-text-secondary">
                설명
              </span>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="예: 신규 팀원을 위한 실전 과제"
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
