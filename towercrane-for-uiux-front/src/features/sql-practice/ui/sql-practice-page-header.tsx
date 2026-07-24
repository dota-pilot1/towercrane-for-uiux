import { ArrowLeftRight, Database, NotebookPen, Settings2, Trash2 } from 'lucide-react'

import { Button } from '../../../shared/ui/button'

type SqlPracticePageHeaderProps = {
  seedFile?: string
  hasHistory: boolean
  onOpenNotes: () => void
  onOpenSwap: () => void
  onOpenManage: () => void
  onClearHistory: () => void
}

export function SqlPracticePageHeader({
  hasHistory,
  onOpenNotes,
  onOpenSwap,
  onOpenManage,
  onClearHistory,
}: SqlPracticePageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-primary-foreground shadow-sm">
          <Database className="size-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-lg font-bold tracking-tight text-text-primary">SQL 연습장(공식)</h1>
          <p className="text-xs ui-text-secondary">
            공식 데이터베이스 환경에서 다양한 예제 문제들을 연습합니다.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onOpenSwap} className="min-w-[112px] justify-center">
          <ArrowLeftRight className="mr-1 size-3.5" />
          테이블 교체
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenManage}
          className="min-w-[112px] justify-center"
        >
          <Settings2 className="mr-1 size-3.5" />
          테이블 관리
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenNotes}
          aria-label="SQL 노트"
          title="SQL 노트"
          className="px-2"
        >
          <NotebookPen className="size-3.5" />
        </Button>

        {hasHistory && (
          <Button
            variant="secondary"
            tone="danger"
            size="sm"
            onClick={onClearHistory}
            aria-label="히스토리 비우기"
            title="히스토리 비우기"
            className="px-2"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
