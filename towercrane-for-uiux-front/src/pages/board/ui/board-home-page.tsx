import { useNavigate } from '@tanstack/react-router'
import { MessageSquareText, Plus } from 'lucide-react'
import { useBoardConfigs } from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'

export function BoardHomePage() {
  const navigate = useNavigate()
  const configsQuery = useBoardConfigs()
  const configs = configsQuery.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary">게시판</h1>
          <p className="mt-1 text-sm text-text-secondary">공지와 문의를 한 곳에서 확인합니다.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {configs.map((config) => (
          <button
            key={config.id}
            type="button"
            onClick={() => navigate({ to: `/boards/${config.code}` })}
            className="ui-panel-soft flex min-h-40 flex-col items-start rounded-md border p-5 text-left transition hover:border-brand-border hover:bg-brand-glass"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <MessageSquareText className="size-5" />
            </div>
            <h2 className="text-lg font-black text-text-primary">{config.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
              {config.description || '게시글을 확인합니다.'}
            </p>
            {config.allowUserWrite && (
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold text-brand-primary">
                <Plus className="size-3.5" />
                작성 가능
              </span>
            )}
          </button>
        ))}
      </div>

      {!configsQuery.isLoading && configs.length === 0 && (
        <Card className="rounded-md border border-surface-border-soft p-10 text-center">
          <p className="text-sm text-text-muted">활성화된 게시판이 없습니다.</p>
        </Card>
      )}
    </div>
  )
}

