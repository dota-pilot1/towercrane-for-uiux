import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, BookOpen, Globe, Loader2, Lock, Plus, RotateCcw } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
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
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 rounded-md border border-background/20 bg-background/10 px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-background/20"
          >
            <Plus className="size-3.5" />
            워크스페이스
          </button>
        }
      />

      <Card className="rounded-md p-4">
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
                  className="rounded-md border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black ui-text-primary">{workspace.title}</h2>
                      <p className="mt-1 line-clamp-2 min-h-9 text-xs ui-text-secondary">
                        {workspace.description || '학습 주제와 노트를 정리하는 워크스페이스입니다.'}
                      </p>
                    </div>
                    <div className="rounded-md bg-brand-glass p-2 text-brand-primary">
                      <BookOpen className="size-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs ui-text-muted">
                    {isShared ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                    <span>{isShared ? '공유 중' : '비공개'}</span>
                    <span>·</span>
                    <span>{workspace.ownerName}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>
    </section>
  )
}
