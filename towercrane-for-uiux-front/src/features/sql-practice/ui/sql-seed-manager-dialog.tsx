import * as Dialog from '@radix-ui/react-dialog'
import {
  CheckCircle2,
  Database,
  FileText,
  Layers3,
  Loader2,
  Play,
  RefreshCw,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { SqlPracticeSeedSummary } from '../../../entities/sql-practice/model/types'
import { Button } from '../../../shared/ui/button'

type SqlSeedManagerDialogProps = {
  open: boolean
  activeSeed?: SqlPracticeSeedSummary
  seeds: SqlPracticeSeedSummary[]
  isLoading: boolean
  isActivating: boolean
  onClose: () => void
  onActivate: (seed: SqlPracticeSeedSummary) => void | Promise<void>
}

export function SqlSeedManagerDialog({
  open,
  activeSeed,
  seeds,
  isLoading,
  isActivating,
  onClose,
  onActivate,
}: SqlSeedManagerDialogProps) {
  const handleActivate = (seed: SqlPracticeSeedSummary) => {
    if (seed.isActive || isActivating) return
    if (
      !window.confirm(
        '연습 파일을 바꾸면 현재 연습 DB가 새 파일 기준으로 초기화됩니다. 계속할까요?',
      )
    ) {
      return
    }
    void onActivate(seed)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[86vh] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="ui-icon-button-brand size-9 shrink-0">
                <Database className="size-4" />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-base font-bold text-text-primary">
                  SQL 연습 파일 관리
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-5 text-text-secondary">
                  선택한 seed 파일 기준으로 practice.sqlite를 새로 만듭니다.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className="min-w-0">
              {isLoading ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-center">
                  <Loader2 className="mb-3 size-6 animate-spin text-brand-primary" />
                  <p className="text-sm font-semibold text-text-primary">seed 목록을 불러오는 중입니다</p>
                </div>
              ) : seeds.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-center">
                  <FileText className="mb-3 size-7 text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">표시할 seed 파일이 없습니다</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {seeds.map((seed) => (
                    <SeedCard
                      key={`${seed.source}-${seed.fileName}`}
                      seed={seed}
                      isActivating={isActivating}
                      onActivate={handleActivate}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="ui-panel-soft h-fit p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                <CheckCircle2 className="size-4 text-brand-primary" />
                현재 파일
              </div>
              {activeSeed ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="truncate font-mono text-sm font-bold text-text-primary">
                      {activeSeed.fileName}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {activeSeed.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <SeedBadge>{levelLabel(activeSeed.level)}</SeedBadge>
                    <SeedBadge>{sourceLabel(activeSeed)}</SeedBadge>
                  </div>
                  <div className="space-y-1 text-[11px] text-text-muted">
                    <p>tables: {activeSeed.tables.length}</p>
                    <p>hash: {activeSeed.hash.slice(0, 10)}</p>
                    <p>size: {formatBytes(activeSeed.sizeBytes)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
                  <RefreshCw className="size-3.5 animate-spin" />
                  불러오는 중
                </div>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SeedCard({
  seed,
  isActivating,
  onActivate,
}: {
  seed: SqlPracticeSeedSummary
  isActivating: boolean
  onActivate: (seed: SqlPracticeSeedSummary) => void
}) {
  return (
    <article
      className={`rounded-md border p-4 transition-colors ${
        seed.isActive
          ? 'border-brand-border bg-brand-glass'
          : 'border-surface-border-soft bg-surface-raised hover:border-brand-border'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-text-primary">{seed.title}</h3>
            {seed.isActive && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                <CheckCircle2 className="size-3" />
                사용 중
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">{seed.fileName}</p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">{seed.description}</p>
        </div>

        <Button
          type="button"
          size="sm"
          variant={seed.isActive ? 'secondary' : 'primary'}
          disabled={seed.isActive || isActivating}
          onClick={() => onActivate(seed)}
          className="shrink-0 gap-1.5"
        >
          {seed.isActive ? (
            <CheckCircle2 className="size-3.5" />
          ) : isActivating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {seed.isActive ? '사용 중' : '선택'}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <SeedBadge>{levelLabel(seed.level)}</SeedBadge>
        <SeedBadge>{sourceLabel(seed)}</SeedBadge>
        {seed.topics.map((topic) => (
          <SeedBadge key={topic}>{topic}</SeedBadge>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
            <Layers3 className="size-3.5 text-brand-primary" />
            테이블
          </div>
          <p className="mt-2 text-xs leading-5 text-text-primary">{seed.tables.join(', ')}</p>
        </div>
        <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
            <FileText className="size-3.5 text-brand-primary" />
            추천 쿼리
          </div>
          <div className="mt-2 space-y-1">
            {seed.recommendedQueries.slice(0, 2).map((query) => (
              <code
                key={query}
                className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-text-primary"
              >
                {query}
              </code>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function SeedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
      {children}
    </span>
  )
}

function levelLabel(level: SqlPracticeSeedSummary['level']) {
  const labels: Record<SqlPracticeSeedSummary['level'], string> = {
    beginner: '초급',
    basic: '기본',
    intermediate: '중급',
    advanced: '고급',
  }
  return labels[level]
}

function sourceLabel(seed: SqlPracticeSeedSummary) {
  return seed.isUpload ? '업로드' : '기본 제공'
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  return `${Math.round(sizeBytes / 1024)} KB`
}
