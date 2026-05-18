import { Code2, Database } from 'lucide-react'

export function SqlPracticeEmptyState({
  isLoading,
  tableCount,
  seedFile,
  recommendedQuery,
}: {
  isLoading: boolean
  tableCount: number
  seedFile?: string
  recommendedQuery?: string
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 size-10 animate-spin rounded-full border-2 border-surface-border border-t-brand-border" />
        <p className="text-sm font-semibold text-text-primary">연습 DB를 준비하는 중입니다</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-sm">
        <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary">
            <Code2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">SQL을 실행해보세요</p>
            <p className="text-[11px] text-text-muted">쿼리를 작성하면 결과가 여기에 표시됩니다</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
          <Database className="size-3.5 shrink-0 text-brand-primary" />
          <span className="min-w-0 truncate text-xs font-semibold text-text-secondary">
            {seedFile ?? '01_board_basic.sql'}
          </span>
          <span className="ml-auto shrink-0 rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-muted">
            테이블 {tableCount}개
          </span>
        </div>

        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            예시 쿼리
          </p>
          <pre className="overflow-x-auto rounded-lg border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
            {recommendedQuery ?? 'SELECT * FROM users LIMIT 10;'}
          </pre>
          <p className="mt-3 text-center text-[11px] text-text-muted">Ctrl+Enter 로 실행</p>
        </div>
      </div>
    </div>
  )
}
