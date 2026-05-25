import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, BookOpen, Globe, Loader2, Lock, Plus, RotateCcw, ArrowRight } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { PageHeader } from '../../../shared/ui/page-header'
import {
  useCreateStudyDiaryWorkspace,
  useStudyDiaryWorkspaces,
} from '../../../features/study-diary/lib/hooks'

export function StudyDiaryWorkspaceHomePage() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const { data: workspaces = [], error, isError, isLoading, refetch } = useStudyDiaryWorkspaces()
  const createWorkspace = useCreateStudyDiaryWorkspace()

  const handleCreate = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const workspace = await createWorkspace.mutateAsync({ title: trimmed })
    setTitle('')
    setIsCreating(false)
    navigate({
      to: '/study-diary/workspaces/$workspaceId',
      params: { workspaceId: workspace.id },
    })
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={BookOpen}
        title="학습 일지"
        description="개인, 팀, 프로젝트별 학습 일지를 워크스페이스로 관리합니다."
        actions={
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="mr-1 size-3.5" />
            새 워크스페이스
          </Button>
        }
      />

      <div className="rounded-2xl border border-surface-border-soft bg-surface-raised/20 p-6 backdrop-blur-sm shadow-sm">
        {isCreating && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-surface-border bg-surface-muted p-3">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter') handleCreate()
                if (event.key === 'Escape') {
                  setIsCreating(false)
                  setTitle('')
                }
              }}
              placeholder="워크스페이스 이름"
              className="ui-input min-w-0 flex-1"
            />
            <button
              onClick={handleCreate}
              disabled={!title.trim() || createWorkspace.isPending}
              className="rounded-md bg-brand-primary px-3 py-2 text-xs font-bold text-background transition-colors disabled:opacity-40"
            >
              만들기
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setTitle('')
              }}
              className="rounded-md border border-surface-border px-3 py-2 text-xs font-medium ui-text-secondary"
            >
              취소
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-[calc(100vh-260px)] items-center justify-center">
            <Loader2 className="size-5 animate-spin ui-text-secondary" />
          </div>
        ) : isError ? (
          <div className="flex h-[calc(100vh-260px)] items-center justify-center px-4">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <AlertCircle className="size-5" />
              </div>
              <p className="mt-3 text-sm font-bold ui-text-primary">워크스페이스를 불러오지 못했습니다.</p>
              <p className="mt-1 text-xs leading-5 ui-text-muted">
                백엔드 API 서버가 실행 중인지 확인한 뒤 다시 시도하세요.
              </p>
              <p className="mt-1 break-words text-[11px] ui-text-muted">
                {(error as Error)?.message ?? '요청 실패'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mx-auto mt-3 flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-muted ui-text-secondary"
              >
                <RotateCcw className="size-3.5" />
                다시 시도
              </button>
            </div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex h-[calc(100vh-260px)] items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium ui-text-primary">아직 워크스페이스가 없습니다.</p>
              <p className="mt-1 text-xs ui-text-muted">새 워크스페이스를 만들어 학습 일지를 시작하세요.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => {
              const isShared = workspace.visibility === 'shared' || workspace.visibility === 'public'
              return (
                <button
                  key={workspace.id}
                  onClick={() =>
                    navigate({
                      to: '/study-diary/workspaces/$workspaceId',
                      params: { workspaceId: workspace.id },
                    })
                  }
                  className="group flex flex-col justify-between min-h-[160px] rounded-2xl border border-surface-border-soft bg-surface-raised p-5 text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
                >
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-black ui-text-primary transition-colors group-hover:text-brand-primary">
                          {workspace.title}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                          {workspace.description || '학습 주제와 노트를 정리하는 워크스페이스입니다.'}
                        </p>
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-primary-foreground group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
                        <BookOpen className="size-4.5" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 w-full flex items-center justify-between border-t border-surface-border-soft pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium ui-text-muted">
                      {isShared ? <Globe className="size-3.5 text-brand-primary" /> : <Lock className="size-3.5" />}
                      <span>{isShared ? '공유 중' : '비공개'}</span>
                      <span>·</span>
                      <span>{workspace.ownerName}</span>
                    </div>
                    
                    <span className="flex size-6 items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-glass group-hover:text-brand-primary">
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
