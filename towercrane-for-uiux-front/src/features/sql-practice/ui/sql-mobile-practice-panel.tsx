import type { RefObject } from 'react'

import { Card } from '../../../shared/ui/card'
import type { SqlHistoryItem, TableInfo } from '../../../entities/sql-practice/model/types'
import type { SqlPracticeExample } from '../../../entities/sql-practice/model/example-types'
import { SqlHistoryItem as SqlHistoryItemView } from './sql-history-item'
import { SqlInputBar } from './sql-input-bar'
import { SqlPracticeEmptyState } from './sql-practice-empty-state'
import { SqlProblemPanel } from './sql-problem-panel'

type SqlMobilePracticePanelProps = {
  answerOpen: boolean
  flatExamples: SqlPracticeExample[]
  history: SqlHistoryItem[]
  isExecuting: boolean
  isInitialLoading: boolean
  recommendedQuery?: string
  seedFile?: string
  seedHash?: string
  selectedExample: SqlPracticeExample | null
  tables: TableInfo[]
  totalTableCount: number
  bottomRef: RefObject<HTMLDivElement | null>
  onClearHistory: () => void
  onCloseExample: () => void
  onExecute: (query: string) => void
  onNextExample: () => void
  onPrevExample: () => void
  onToggleAnswer: () => void
}

export function SqlMobilePracticePanel({
  answerOpen,
  flatExamples,
  history,
  isExecuting,
  isInitialLoading,
  recommendedQuery,
  seedFile,
  seedHash,
  selectedExample,
  tables,
  totalTableCount,
  bottomRef,
  onClearHistory,
  onCloseExample,
  onExecute,
  onNextExample,
  onPrevExample,
  onToggleAnswer,
}: SqlMobilePracticePanelProps) {
  const selectedIndex = selectedExample
    ? flatExamples.findIndex((example) => example.id === selectedExample.id)
    : -1

  return (
    <Card className="min-w-0 overflow-hidden rounded-md p-0">
      {selectedExample ? (
        <SqlProblemPanel
          key={selectedExample.id}
          example={selectedExample}
          answerOpen={answerOpen}
          onToggleAnswer={onToggleAnswer}
          onClose={onCloseExample}
          onPrev={onPrevExample}
          onNext={onNextExample}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < flatExamples.length - 1}
          seedFile={seedFile ?? selectedExample.seedFile}
          seedHash={seedHash}
          tables={tables}
          className="min-w-0"
          keywordMode="answer-only"
        />
      ) : (
        <>
          <div className="max-h-[48dvh] overflow-y-auto">
            {history.length === 0 ? (
              <SqlPracticeEmptyState
                isLoading={isInitialLoading}
                tableCount={totalTableCount}
                seedFile={seedFile}
                recommendedQuery={recommendedQuery}
              />
            ) : (
              <div className="space-y-4 p-3">
                {history.map((item) => (
                  <SqlHistoryItemView key={item.id} item={item} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          <SqlInputBar
            onExecute={onExecute}
            onClear={onClearHistory}
            isLoading={isExecuting}
          />
        </>
      )}
    </Card>
  )
}
