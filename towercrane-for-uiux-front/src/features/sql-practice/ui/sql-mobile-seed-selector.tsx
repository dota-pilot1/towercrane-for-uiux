import { Database, Loader2 } from 'lucide-react'

import type { SqlPracticeMeta, SqlPracticeSeedSummary } from '../../../entities/sql-practice/model/types'
import { CompactSelect } from '../../../shared/ui/compact-select'
import {
  useActivateSqlPracticeSeed,
  useSqlPracticeSeeds,
} from '../model/use-sql-practice-queries'

type SqlMobileSeedSelectorProps = {
  meta?: SqlPracticeMeta
  onSeedActivated: () => void
}

export function SqlMobileSeedSelector({
  meta,
  onSeedActivated,
}: SqlMobileSeedSelectorProps) {
  const seedsQuery = useSqlPracticeSeeds()
  const activateSeedMutation = useActivateSqlPracticeSeed({ onSuccess: onSeedActivated })
  const seeds = seedsQuery.data?.seeds ?? []
  const activeSeed = seeds.find((seed) => seed.isActive) ?? meta?.activeSeed
  const activeValue = activeSeed ? seedValue(activeSeed) : ''

  const handleChange = (value: string) => {
    const seed = seeds.find((item) => seedValue(item) === value)
    if (!seed || seed.isActive || activateSeedMutation.isPending) return
    if (
      !window.confirm(
        '연습 파일을 바꾸면 현재 연습 DB가 새 파일 기준으로 초기화됩니다. 계속할까요?',
      )
    ) {
      return
    }
    activateSeedMutation.mutate({ source: seed.source, fileName: seed.fileName })
  }

  return (
    <div className="ui-panel-soft flex min-w-0 items-center gap-2 rounded-md px-3 py-2">
      <Database className="size-4 shrink-0 text-brand-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase text-text-muted">파일</p>
        <CompactSelect
          value={activeValue}
          onChange={(event) => handleChange(event.target.value)}
          disabled={seedsQuery.isLoading || activateSeedMutation.isPending || seeds.length === 0}
          wrapperClassName="mt-1 w-full"
          className="h-8 text-[12px]"
          aria-label="SQL 연습 파일 선택"
        >
          {activeSeed && seeds.length === 0 && (
            <option value={activeValue}>{activeSeed.fileName}</option>
          )}
          {seeds.map((seed) => (
            <option key={seedValue(seed)} value={seedValue(seed)}>
              {seed.title}
            </option>
          ))}
        </CompactSelect>
      </div>
      {(seedsQuery.isLoading || activateSeedMutation.isPending) && (
        <Loader2 className="size-4 shrink-0 animate-spin text-text-muted" />
      )}
    </div>
  )
}

function seedValue(seed: Pick<SqlPracticeSeedSummary, 'source' | 'fileName'>) {
  return `${seed.source}:${seed.fileName}`
}
