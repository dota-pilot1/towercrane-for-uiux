import { useRef } from 'react'
import { Card } from '../../../shared/ui/card'
import { SqlInputBar, type SqlInputBarHandle } from '../../../features/sql-practice/ui/sql-input-bar'
import { SqlMyActivityDialog } from '../../../features/sql-practice/ui/sql-my-activity-dialog'
import { SqlPracticeEmptyState } from '../../../features/sql-practice/ui/sql-practice-empty-state'
import { SqlPracticeFooterDrawer } from '../../../features/sql-practice/ui/sql-practice-footer-drawer'
import { SqlPracticePageHeader } from '../../../features/sql-practice/ui/sql-practice-page-header'
import { SqlProblemPanel } from '../../../features/sql-practice/ui/sql-problem-panel'
import { SqlQuizSidebar } from '../../../features/sql-practice/ui/sql-quiz-sidebar'
import { SqlSchemaSidebar } from '../../../features/sql-practice/ui/sql-schema-sidebar'
import type { SqlPracticeOfficialWorkbench } from '../model/use-sql-practice-official-workbench'

type SqlPracticeDesktopViewProps = {
  workbench: SqlPracticeOfficialWorkbench
}

export function SqlPracticeDesktopView({ workbench }: SqlPracticeDesktopViewProps) {
  const {
    answerOpen,
    bottomRef,
    clearActivityMutation,
    deleteActivityMutation,
    executeMutation,
    flatExamples,
    footerOpen,
    handleClearMyActivity,
    handleCloseExample,
    handleDeleteMyActivity,
    handleExecute,
    handleNextExample,
    handlePrevExample,
    handleRefresh,
    handleReloadSeed,
    handleReset,
    handleSeedChange,
    handleSelectExample,
    history,
    metaQuery,
    myActivityDialogOpen,
    myActivityQuery,
    quizSidebarOpen,
    rankingQuery,
    activityQuery,
    reloadSeedMutation,
    resetMutation,
    selectedExample,
    selectedTable,
    setAnswerOpen,
    setFooterOpen,
    setHistory,
    setMyActivityDialogOpen,
    setQuizSidebarOpen,
    setSelectedTableOverride,
    submissionsQuery,
    tables,
    tablesQuery,
    totalProblemCount,
    userId,
    exampleSet,
  } = workbench

  const inputBarRef = useRef<SqlInputBarHandle>(null)

  return (
    <section className={footerOpen ? 'space-y-4 pb-[400px]' : 'space-y-4 pb-16'}>
      <SqlPracticePageHeader
        key={metaQuery.data?.seedFile ?? 'loading'}
        seedFile={metaQuery.data?.seedFile}
        hasHistory={history.length > 0}
        onOpenNotes={() => window.open('/sql/notes', '_blank', 'noopener,noreferrer')}
        onClearHistory={() => setHistory([])}
      />

      <div className="flex h-[calc(100dvh-220px)] min-h-0 gap-4 overflow-hidden">
        <SqlQuizSidebar
          exampleSet={exampleSet}
          selectedExample={selectedExample}
          onSelectExample={handleSelectExample}
          isOpen={quizSidebarOpen}
          onToggle={() => setQuizSidebarOpen((v) => !v)}
          submissionStatusByExample={submissionsQuery.data?.byExample ?? {}}
          totalScore={submissionsQuery.data?.summary.totalScore ?? 0}
          maxScore={totalProblemCount}
          onOpenHistory={() => setMyActivityDialogOpen(true)}
        />

        <Card className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md p-0">
          <div className="flex-1 overflow-y-auto">
            {selectedExample && (
              <SqlProblemPanel
                key={selectedExample.id}
                example={selectedExample}
                answerOpen={answerOpen}
                onToggleAnswer={() => setAnswerOpen((v) => !v)}
                onClose={handleCloseExample}
                onPrev={handlePrevExample}
                onNext={handleNextExample}
                hasPrev={flatExamples.findIndex((e) => e.id === selectedExample.id) > 0}
                hasNext={flatExamples.findIndex((e) => e.id === selectedExample.id) < flatExamples.length - 1}
                seedFile={metaQuery.data?.seedFile ?? selectedExample.seedFile}
                seedHash={metaQuery.data?.seedHash}
                tables={tables}
              />
            )}

            {history.length === 0 && !selectedExample ? (
              <SqlPracticeEmptyState
                isLoading={metaQuery.isLoading || tablesQuery.isLoading}
                tableCount={tables.length}
                seedFile={metaQuery.data?.seedFile}
                recommendedQuery={metaQuery.data?.activeSeed.recommendedQueries[0]}
              />
            ) : history.length > 0 ? (
              <div className="space-y-6 p-4">
                {history.map((item) => (
                  <SqlHistoryItemView key={item.id} item={item} />
                ))}
                <div ref={bottomRef} />
              </div>
            ) : null}
          </div>

          {!selectedExample && (
            <SqlInputBar
              ref={inputBarRef}
              onExecute={handleExecute}
              onClear={() => setHistory([])}
              isLoading={executeMutation.isPending}
            />
          )}
        </Card>

        <SqlSchemaSidebar
          meta={metaQuery.data}
          tables={tables}
          selectedTable={selectedTable}
          isLoading={metaQuery.isFetching || tablesQuery.isFetching}
          isResetting={resetMutation.isPending}
          isReloading={reloadSeedMutation.isPending}
          onSelectTable={setSelectedTableOverride}
          onRefresh={handleRefresh}
          onReset={handleReset}
          onReloadSeed={handleReloadSeed}
          onSeedActivated={handleSeedChange}
          onInsert={!selectedExample ? (text) => inputBarRef.current?.insert(text) : undefined}
        />
      </div>

      <SqlMyActivityDialog
        open={myActivityDialogOpen}
        onOpenChange={setMyActivityDialogOpen}
        seedFile={metaQuery.data?.seedFile}
        activities={myActivityQuery.data?.activities ?? []}
        isLoading={myActivityQuery.isLoading}
        isRefreshing={myActivityQuery.isFetching}
        currentUserId={userId}
        onRefresh={() => myActivityQuery.refetch()}
        onClearAll={handleClearMyActivity}
        onDeleteActivity={handleDeleteMyActivity}
        isClearing={clearActivityMutation.isPending}
        deletingActivityId={
          deleteActivityMutation.isPending ? (deleteActivityMutation.variables ?? null) : null
        }
      />

      <SqlPracticeFooterDrawer
        open={footerOpen}
        onOpenChange={setFooterOpen}
        seedFile={metaQuery.data?.seedFile}
        rankings={rankingQuery.data?.rankings ?? []}
        activities={activityQuery.data?.activities ?? []}
        rankingLoading={rankingQuery.isFetching}
        activityLoading={activityQuery.isFetching}
        currentUserId={userId}
        myScore={submissionsQuery.data?.summary.totalScore ?? 0}
        maxScore={totalProblemCount}
      />
    </section>
  )
}
