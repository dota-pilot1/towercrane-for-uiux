import { SqlMobilePracticePanel } from '../../../features/sql-practice/ui/sql-mobile-practice-panel'
import { SqlMobileProblemCarousel } from '../../../features/sql-practice/ui/sql-mobile-problem-carousel'
import { SqlMobileSchemaActions } from '../../../features/sql-practice/ui/sql-mobile-schema-actions'
import { SqlMobileSeedSelector } from '../../../features/sql-practice/ui/sql-mobile-seed-selector'
import { SqlMyActivityDialog } from '../../../features/sql-practice/ui/sql-my-activity-dialog'
import type { SqlPracticeOfficialWorkbench } from '../model/use-sql-practice-official-workbench'

type SqlPracticeMobileViewProps = {
  workbench: SqlPracticeOfficialWorkbench
}

export function SqlPracticeMobileView({ workbench }: SqlPracticeMobileViewProps) {
  const {
    answerOpen,
    bottomRef,
    clearActivityMutation,
    deleteActivityMutation,
    executeMutation,
    flatExamples,
    handleClearMyActivity,
    handleCloseExample,
    handleDeleteMyActivity,
    handleExecute,
    handleNextExample,
    handlePrevExample,
    handleSeedChange,
    handleSelectExample,
    history,
    metaQuery,
    myActivityDialogOpen,
    myActivityQuery,
    selectedExample,
    setAnswerOpen,
    setHistory,
    setMyActivityDialogOpen,
    submissionsQuery,
    tables,
    tablesQuery,
    totalProblemCount,
    userId,
    exampleSet,
  } = workbench

  return (
    <section className="min-w-0 space-y-3 pb-8">
      <SqlMobileSeedSelector
        meta={metaQuery.data}
        onSeedActivated={handleSeedChange}
      />

      <SqlMobileProblemCarousel
        exampleSet={exampleSet}
        selectedExample={selectedExample}
        submissionStatusByExample={submissionsQuery.data?.byExample ?? {}}
        totalScore={submissionsQuery.data?.summary.totalScore ?? 0}
        maxScore={totalProblemCount}
        onSelectExample={handleSelectExample}
        onOpenHistory={() => setMyActivityDialogOpen(true)}
      />

      <SqlMobileSchemaActions
        meta={metaQuery.data}
        tables={tables}
      />

      <SqlMobilePracticePanel
        answerOpen={answerOpen}
        flatExamples={flatExamples}
        history={history}
        isExecuting={executeMutation.isPending}
        isInitialLoading={metaQuery.isLoading || tablesQuery.isLoading}
        recommendedQuery={metaQuery.data?.activeSeed.recommendedQueries[0]}
        seedFile={metaQuery.data?.seedFile}
        seedHash={metaQuery.data?.seedHash}
        selectedExample={selectedExample}
        tables={tables}
        totalTableCount={tables.length}
        bottomRef={bottomRef}
        onClearHistory={() => setHistory([])}
        onCloseExample={handleCloseExample}
        onExecute={handleExecute}
        onNextExample={handleNextExample}
        onPrevExample={handlePrevExample}
        onToggleAnswer={() => setAnswerOpen((value) => !value)}
      />

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
    </section>
  )
}
