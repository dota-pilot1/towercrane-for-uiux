import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Hash, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  useCreateMeetingWorkspace,
  useMeetingWorkspaces,
} from '../../../entities/meeting/model/use-meeting'
import type { MeetingWorkspace } from '../../../entities/meeting/model/types'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

export function MeetingWorkspaceHomePage() {
  const navigate = useNavigate()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userRole = useSessionStore((state) => state.userRole)
  const workspacesQuery = useMeetingWorkspaces()
  const workspaces = workspacesQuery.data ?? []

  return (
    <div className="w-full min-w-0 ui-page-bg space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <Hash className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-brand-primary">
              Meeting Workspaces
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-text-primary">
              화상 및 채널 회의 공간
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              팀별 회의 채널을 워크스페이스로 분리해 화상 통화 및 대화를 화기애애하게 진행합니다.
            </p>
          </div>
        </div>
        {isAuthenticated && userRole === 'admin' ? <CreateWorkspaceDialog /> : null}
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
              <MeetingWorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={() =>
                  navigate({
                    to: '/meeting/workspaces/$workspaceId',
                    params: { workspaceId: workspace.id },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center rounded-2xl border border-dashed border-surface-border-soft bg-surface-raised/40 p-12">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-glass border border-brand-border text-brand-primary mb-4">
              <Hash className="size-7" />
            </div>
            <h3 className="text-base font-bold ui-text-primary mb-1">
              회의 워크스페이스가 없습니다
            </h3>
            <p className="text-xs ui-text-muted max-w-sm leading-relaxed mb-4">
              생성된 화상 및 채널 회의 공간이 비어 있습니다.<br />
              관리자 권한이 있는 경우 새로운 워크스페이스를 생성하실 수 있습니다.
            </p>
            {isAuthenticated && userRole === 'admin' ? <CreateWorkspaceDialog /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

type MeetingWorkspaceCardProps = {
  workspace: MeetingWorkspace
  onOpen: () => void
}

function MeetingWorkspaceCard({ workspace, onOpen }: MeetingWorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[176px] flex-col justify-between rounded-xl border border-surface-border bg-surface-raised p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:bg-brand-glass hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
    >
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <Hash className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-text-primary group-hover:text-brand-primary transition-colors">
              {workspace.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">
              {workspace.description ?? '팀 회의 워크스페이스'}
            </p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-primary" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 w-full">
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-3 transition-all duration-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            전체 채널
          </div>
          <div className="mt-1 text-2xl font-black text-text-primary">
            {workspace.channelCount}
          </div>
        </div>
        <div className="rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-3 transition-all duration-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
            활성 채널
          </div>
          <div className="mt-1 text-2xl font-black text-brand-primary">
            {workspace.activeChannelCount}
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
  const createWorkspace = useCreateMeetingWorkspace()

  const canSubmit = name.trim().length >= 2

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    await createWorkspace.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
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
                placeholder="예: 개발팀 회의실"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-text-secondary">설명</span>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="예: 개발팀 일일 스탠드업 및 이슈 공유"
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
