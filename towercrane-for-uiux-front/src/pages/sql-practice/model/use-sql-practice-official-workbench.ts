import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  SqlHistoryItem,
  SqlPracticeActivityItem,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import type {
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../entities/sql-practice/model/example-types'
import {
  useClearSqlPracticeMyActivity,
  useDeleteSqlPracticeActivityItem,
  useExecuteSqlPracticeQuery,
  useReloadSqlPracticeSeed,
  useResetSqlPracticeDb,
  useSqlPracticeActivity,
  useSqlPracticeMeta,
  useSqlPracticeMyActivity,
  useSqlPracticeMySubmissions,
  useSqlPracticeRanking,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { getSqlPracticeExampleSet } from '../../../features/sql-practice/model/sql-practice-examples'
import { useSqlPracticeSelectionStore } from '../../../features/sql-practice/model/sql-practice-selection-store'
import { useSessionStore } from '../../../shared/store/session-store'

const EMPTY_TABLES: TableInfo[] = []

export function useSqlPracticeOfficialWorkbench() {
  const [history, setHistory] = useState<SqlHistoryItem[]>([])
  const [selectedTableOverride, setSelectedTableOverride] = useState<string | null>(null)
  const [quizSidebarOpen, setQuizSidebarOpen] = useState(true)
  const [myActivityDialogOpen, setMyActivityDialogOpen] = useState(false)
  const [footerOpen, setFooterOpen] = useState(false)
  const [selectedExample, setSelectedExample] = useState<SqlPracticeExample | null>(null)
  const [answerOpen, setAnswerOpen] = useState(false)
  const { selectedExampleId, setSelectedExampleId } = useSqlPracticeSelectionStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const userId = useSessionStore((state) => state.userId)

  const metaQuery = useSqlPracticeMeta()
  const tablesQuery = useSqlPracticeTables()
  const executeMutation = useExecuteSqlPracticeQuery()
  const resetMutation = useResetSqlPracticeDb()
  const reloadSeedMutation = useReloadSqlPracticeSeed()
  const deleteActivityMutation = useDeleteSqlPracticeActivityItem()
  const clearActivityMutation = useClearSqlPracticeMyActivity()
  const submissionsQuery = useSqlPracticeMySubmissions(metaQuery.data?.seedFile)
  const rankingQuery = useSqlPracticeRanking(metaQuery.data?.seedFile, true)
  const activityQuery = useSqlPracticeActivity(metaQuery.data?.seedFile, true)
  const myActivityQuery = useSqlPracticeMyActivity(
    metaQuery.data?.seedFile,
    myActivityDialogOpen,
  )

  const tables = tablesQuery.data ?? EMPTY_TABLES
  const selectedTable = useMemo(() => {
    if (tables.length === 0) return null
    if (
      selectedTableOverride &&
      tables.some((table) => table.tableName === selectedTableOverride)
    ) {
      return selectedTableOverride
    }
    return tables[0].tableName
  }, [selectedTableOverride, tables])

  const exampleSet = useMemo(
    () => getSqlPracticeExampleSet(metaQuery.data?.seedFile ?? '01_board_basic.sql'),
    [metaQuery.data?.seedFile],
  )
  const totalProblemCount = useMemo(() => getExampleSetTotalCount(exampleSet), [exampleSet])
  const flatExamples = useMemo(
    () => [...exampleSet.beginner, ...exampleSet.intermediate, ...exampleSet.advanced],
    [exampleSet],
  )

  useEffect(() => {
    if (flatExamples.length === 0 || selectedExample) return
    const found = flatExamples.find((e) => e.id === selectedExampleId)
    if (found) {
      setSelectedExample(found)
    }
  }, [flatExamples, selectedExampleId, selectedExample])

  const handleSelectExample = (example: SqlPracticeExample) => {
    setSelectedExample(example)
    setSelectedExampleId(example.id)
    setAnswerOpen(false)
  }

  const handlePrevExample = () => {
    if (!selectedExample) return
    const idx = flatExamples.findIndex((e) => e.id === selectedExample.id)
    if (idx > 0) handleSelectExample(flatExamples[idx - 1])
  }

  const handleNextExample = () => {
    if (!selectedExample) return
    const idx = flatExamples.findIndex((e) => e.id === selectedExample.id)
    if (idx < flatExamples.length - 1) handleSelectExample(flatExamples[idx + 1])
  }

  const handleCloseExample = () => {
    setSelectedExample(null)
    setAnswerOpen(false)
  }

  const handleSeedChange = () => {
    setHistory([])
    setSelectedTableOverride(null)
    setSelectedExample(null)
    setSelectedExampleId(null)
    setAnswerOpen(false)
  }

  const handleExecute = async (query: string) => {
    const response = await executeMutation.mutateAsync(query)
    setHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        query,
        response,
        timestamp: new Date(),
      },
    ])
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const handleRefresh = () => {
    metaQuery.refetch()
    tablesQuery.refetch()
  }

  const handleReset = async () => {
    const seedFile = metaQuery.data?.seedFile ?? '현재 seed'
    if (
      !window.confirm(
        `SQL 연습 DB를 ${seedFile} 기준으로 초기화할까요? 현재 직접 만든 테이블과 데이터는 삭제됩니다.`,
      )
    ) {
      return
    }
    await resetMutation.mutateAsync()
    handleSeedChange()
  }

  const handleReloadSeed = async () => {
    const seedFile = metaQuery.data?.seedFile ?? '현재 seed'
    if (!window.confirm(`${seedFile}을 다시 적용할까요? 현재 연습 DB는 새로 만들어집니다.`)) {
      return
    }
    await reloadSeedMutation.mutateAsync()
    handleSeedChange()
  }

  const handleDeleteMyActivity = (activity: SqlPracticeActivityItem) => {
    if (
      !window.confirm(
        `#${String(activity.exampleOrder).padStart(2, '0')} ${activity.exampleTitle} 풀이 로그를 삭제할까요? 점수와 정답 상태는 유지됩니다.`,
      )
    ) {
      return
    }
    deleteActivityMutation.mutate(activity.id)
  }

  const handleClearMyActivity = () => {
    const seedFile = metaQuery.data?.seedFile
    if (!seedFile) return

    if (
      !window.confirm(
        `${seedFile} 기준 내 풀이 로그를 모두 삭제할까요? 점수와 정답 상태는 유지됩니다.`,
      )
    ) {
      return
    }
    clearActivityMutation.mutate(seedFile)
  }

  return {
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
  }
}

export type SqlPracticeOfficialWorkbench = ReturnType<typeof useSqlPracticeOfficialWorkbench>

function getExampleSetTotalCount(exampleSet: SqlPracticeExampleSet) {
  return exampleSet.beginner.length + exampleSet.intermediate.length + exampleSet.advanced.length
}
