import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  BookOpenText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  Loader2,
  Send,
  Table2,
  WandSparkles,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import type { SqlExampleLevel, SqlPracticeExample } from '../../../entities/sql-practice/model/example-types'
import type { TableInfo } from '../../../entities/sql-practice/model/types'
import { formatSqlQuery } from '../lib/format-sql'
import {
  buildSqlMistakeAnalysisPrompt,
  buildSqlSupplementPrompt,
  parseSqlMistakeAnalysis,
  type SqlMistakeAnalysisState,
} from '../lib/sql-practice-analysis'
import { sqlExampleLevelLabels } from '../model/sql-practice-examples'
import {
  useExecuteSqlPracticeQuery,
  useGradeSqlPracticeSubmission,
  useSqlPracticeSupplementExplanation,
} from '../model/use-sql-practice-queries'
import { SqlMistakeAnalysisDialog } from './sql-mistake-analysis-dialog'
import { SqlSubmissionResultDialog, type SqlGradeStatus, type SqlSubmissionResultState } from './sql-submission-result-dialog'
import { SqlSupplementExplanationDialog } from './sql-supplement-explanation-dialog'
import { SqlTableSchemaDialog } from './sql-table-schema-dialog'

const LEVEL_BADGE_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-glass text-brand-primary',
  intermediate: 'border-surface-border bg-surface-muted text-text-secondary',
  advanced: 'border-surface-border bg-surface-strong text-text-primary',
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'JOIN', 'ON', 'WHERE', 'AND', 'OR', 'LIKE',
  'GROUP BY', 'HAVING', 'COUNT(*)', 'SUM()', 'ORDER BY', 'ASC', 'DESC', 'LIMIT',
]

export function SqlProblemPanel({
  example,
  answerOpen,
  onToggleAnswer,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  seedFile,
  seedHash,
  tables,
  className,
}: {
  example: SqlPracticeExample
  answerOpen: boolean
  onToggleAnswer: () => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  seedFile: string
  seedHash?: string
  tables: TableInfo[]
  className?: string
}) {
  const [submittedSql, setSubmittedSql] = useState('')
  const [gradeStatus, setGradeStatus] = useState<SqlGradeStatus>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [gradeBody, setGradeBody] = useState('')
  const [gradeError, setGradeError] = useState('')
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null)
  const [supplementOpen, setSupplementOpen] = useState(false)
  const [supplementBody, setSupplementBody] = useState('')
  const [supplementError, setSupplementError] = useState('')
  const [mistakeOpen, setMistakeOpen] = useState(false)
  const [mistakeAnalysis, setMistakeAnalysis] = useState<SqlMistakeAnalysisState | null>(null)
  const [mistakeError, setMistakeError] = useState('')
  const gradeMutation = useGradeSqlPracticeSubmission()
  const executeAnswerMutation = useExecuteSqlPracticeQuery()
  const supplementMutation = useSqlPracticeSupplementExplanation()
  const [submissionResult, setSubmissionResult] = useState<SqlSubmissionResultState | null>(null)
  const isGrading = gradeMutation.isPending || executeAnswerMutation.isPending
  const isSupplementLoading = supplementMutation.isPending
  const targetTables = useMemo(
    () =>
      example.relatedTables.map((tableName) => ({
        tableName,
        info: tables.find((table) => table.tableName === tableName),
      })),
    [example.relatedTables, tables],
  )

  const handleSubmitAnswer = async () => {
    const trimmed = submittedSql.trim()
    if (!trimmed || isGrading) return

    setGradeStatus(null)
    setGradeBody('')
    setGradeError('')
    setSupplementBody('')
    setSupplementError('')
    setMistakeAnalysis(null)
    setMistakeError('')

    const gradePayload = {
      seedFile,
      seedHash,
      exampleId: example.id,
      exampleTitle: example.title,
      exampleLevel: example.level,
      exampleOrder: example.order,
      description: example.description,
      hint: example.hint,
      relatedTables: example.relatedTables,
      submittedSql: trimmed,
      answerSql: example.answerSql,
    }

    const [executeResult, gradeResult] = await Promise.allSettled([
      executeAnswerMutation.mutateAsync(trimmed),
      gradeMutation.mutateAsync(gradePayload),
    ])

    const nextExecuteResponse =
      executeResult.status === 'fulfilled' ? executeResult.value : null
    const nextExecuteError =
      executeResult.status === 'rejected'
        ? errorMessage(executeResult.reason, 'SQL 실행 중 오류가 발생했습니다.')
        : ''
    const nextGradeStatus =
      gradeResult.status === 'fulfilled'
        ? gradeResult.value.submission.isCorrect
          ? 'correct'
          : 'incorrect'
        : null
    const nextGradeBody =
      gradeResult.status === 'fulfilled' ? gradeResult.value.submission.feedback : ''
    const nextGradeError =
      gradeResult.status === 'rejected'
        ? errorMessage(gradeResult.reason, '채점 중 오류가 발생했습니다.')
        : ''

    setGradeStatus(nextGradeStatus)
    setGradeBody(nextGradeBody)
    setGradeError(nextGradeError)
    setSubmissionResult({
      submittedSql: trimmed,
      answerSql: example.answerSql,
      executeResponse: nextExecuteResponse,
      executeError: nextExecuteError,
      gradeStatus: nextGradeStatus,
      gradeBody: nextGradeBody,
      gradeError: nextGradeError,
    })

    if (nextExecuteError) {
      setGradeError(nextGradeError || nextExecuteError)
    }
  }

  const handleOpenMistakeAnalysis = async () => {
    const targetSubmission = submissionResult?.submittedSql ?? submittedSql.trim()
    const targetFeedback = submissionResult?.gradeBody ?? gradeBody
    setMistakeOpen(true)
    setMistakeError('')
    if (mistakeAnalysis || isSupplementLoading) return

    try {
      const response = await supplementMutation.mutateAsync(
        buildSqlMistakeAnalysisPrompt({
          example,
          submittedSql: targetSubmission,
          answerSql: example.answerSql,
          gradeFeedback: targetFeedback,
          executeError: submissionResult?.executeError ?? '',
        }),
      )
      setMistakeAnalysis(
        parseSqlMistakeAnalysis(response.answer, targetSubmission, example.answerSql),
      )
    } catch (error) {
      setMistakeError(
        error instanceof Error ? error.message : '오답 분석을 생성하는 중 오류가 발생했습니다.',
      )
    }
  }

  const handleOpenSupplement = async () => {
    setSupplementOpen(true)
    setSupplementError('')
    if (supplementBody.trim() || isSupplementLoading) return

    try {
      const response = await supplementMutation.mutateAsync(
        buildSqlSupplementPrompt({
          example,
          submittedSql: submittedSql.trim(),
          answerSql: example.answerSql,
          gradeFeedback: gradeBody,
        }),
      )
      setSupplementBody(response.answer.trim() || '보충 설명을 생성하지 못했습니다.')
    } catch (error) {
      setSupplementError(
        error instanceof Error ? error.message : '보충 설명을 생성하는 중 오류가 발생했습니다.',
      )
    }
  }

  const handleInsertKeyword = (keyword: string, newline = false) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = submittedSql.slice(0, start)
    const after = submittedSql.slice(end)
    const prefix = newline && before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    const inserted = `${prefix}${keyword} `
    setSubmittedSql(before + inserted + after)
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + inserted.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  const handleFormatAnswer = () => {
    const trimmed = submittedSql.trim()
    if (!trimmed) return

    try {
      const formatted = formatSqlQuery(trimmed)
      setSubmittedSql(formatted)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    } catch {
      toast.error('SQL을 정리할 수 없습니다. 문법을 확인해 주세요.')
    }
  }

  const handleAnswerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmitAnswer()
    }
  }

  return (
    <>
      <div className={`border-l-[3px] border-brand-border ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-brand-glass/30 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-surface-border bg-surface-raised px-2 text-xs font-black tabular-nums text-text-primary">
            {String(example.order).padStart(2, '0')}
          </span>
          <span
            className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-black ${LEVEL_BADGE_CLASS[example.level]}`}
          >
            {sqlExampleLevelLabels[example.level]}
          </span>
          <span className="min-w-0 truncate text-sm font-bold text-text-primary">
            {example.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {gradeStatus === 'correct' && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-brand-border bg-brand-glass px-2 text-[11px] font-bold text-brand-primary">
              <CheckCircle className="size-3" />
              정답
            </span>
          )}
          {gradeStatus === 'incorrect' && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-destructive/40 bg-danger-glass px-2 text-[11px] font-bold text-destructive">
              <XCircle className="size-3" />
              오답
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ui-icon-button size-7 shrink-0 disabled:opacity-30"
              onClick={onPrev}
              disabled={!hasPrev}
              title="이전 문제"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              className="ui-icon-button size-7 shrink-0 disabled:opacity-30"
              onClick={onNext}
              disabled={!hasNext}
              title="다음 문제"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="mx-1 h-4 w-px bg-surface-border" />
          <button
            type="button"
            className="ui-icon-button size-7 shrink-0"
            onClick={onClose}
            title="문제 닫기"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-surface-border">
        <div className="bg-surface-muted/50 px-4 py-3">
          <p className="max-w-4xl text-sm leading-6 text-text-secondary">
            {example.description}
          </p>
        </div>

        <div className="bg-surface-muted/40">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Table2 className="size-4 text-brand-primary" />
              <p className="text-sm font-black text-text-primary">대상 테이블</p>
            </div>
            <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-muted">
              {targetTables.length}개
            </span>
          </div>

          <div className={`grid gap-2 px-4 pb-3 ${targetTables.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {targetTables.map(({ tableName, info }) => (
              <div
                key={tableName}
                className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Database className="size-3.5 shrink-0 text-brand-primary" />
                    <span className="truncate text-sm font-black text-text-primary">
                      {tableName}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {info && (
                      <span className="text-[11px] font-bold tabular-nums text-text-muted">
                        {info.rowCount}행
                      </span>
                    )}
                    {info && (
                      <button
                        type="button"
                        className="ui-icon-button size-7"
                        onClick={() => setSchemaDialog(info)}
                        aria-label={`${tableName} 스키마 보기`}
                        title="스키마 보기"
                      >
                        <Info className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {info ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {info.columns.slice(0, 6).map((column) => (
                      <span
                        key={column.name}
                        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary"
                      >
                        <span className="truncate">{column.name}</span>
                        {column.primaryKey && (
                          <span className="text-[9px] font-black text-brand-primary">PK</span>
                        )}
                      </span>
                    ))}
                    {info.columns.length > 6 && (
                      <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                        +{info.columns.length - 6}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-text-muted">테이블 정보를 불러오는 중입니다.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 bg-brand-glass px-4 py-2.5">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
          <p className="text-xs leading-5 text-text-secondary">{example.hint}</p>
        </div>

        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-text-primary">답안 SQL</p>
            <p className="text-[10px] font-medium text-text-muted">
              클릭: 커서 삽입 · Ctrl+클릭: 줄바꿈
            </p>
          </div>
          <div className="flex items-start justify-between gap-3">
            <SqlKeywordButtons onInsert={(kw, newline) => handleInsertKeyword(kw, newline)} />
            <button
              type="button"
              onClick={handleFormatAnswer}
              disabled={!submittedSql.trim() || isGrading}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-surface-border bg-surface-muted px-3 text-xs font-bold text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              title="줄바꿈과 SQL 키워드 대문자를 정리합니다"
            >
              <WandSparkles className="size-3.5" />
              SQL 정리
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={submittedSql}
            onChange={(event) => setSubmittedSql(event.target.value)}
            onKeyDown={handleAnswerKeyDown}
            className="ui-input mt-2 min-h-36 w-full resize-y font-mono text-sm leading-6"
            placeholder={'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'}
            spellCheck={false}
          />

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!submittedSql.trim() || isGrading}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-4 text-xs font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGrading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              제출
            </button>
          </div>

          {(isGrading || gradeError || gradeBody) && (
            <div className="mt-3 rounded-md border border-surface-border bg-surface-raised px-3 py-2">
              {isGrading && (
                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  Gemini가 정답과 비교하는 중입니다.
                </div>
              )}
              {!isGrading && gradeError && (
                <p className="text-xs font-semibold text-destructive">{gradeError}</p>
              )}
              {!isGrading && !gradeError && gradeBody && (
                <div className="flex items-start gap-3">
                  <pre className="min-w-0 flex-1 whitespace-pre-wrap font-sans text-xs leading-5 text-text-secondary">
                    {gradeBody}
                  </pre>
                  <button
                    type="button"
                    onClick={gradeStatus === 'incorrect' ? handleOpenMistakeAnalysis : handleOpenSupplement}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[11px] font-bold transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                      gradeStatus === 'incorrect'
                        ? 'border-destructive/40 bg-danger-glass text-destructive'
                        : 'border-brand-border bg-brand-glass text-brand-primary'
                    }`}
                    disabled={isSupplementLoading}
                  >
                    {isSupplementLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : gradeStatus === 'incorrect' ? (
                      <XCircle className="size-3.5" />
                    ) : (
                      <BookOpenText className="size-3.5" />
                    )}
                    {gradeStatus === 'incorrect' ? '오답 분석' : '보충 설명'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end px-4 py-2.5">
          <button
            type="button"
            onClick={onToggleAnswer}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors ${
              answerOpen
                ? 'border-brand-border bg-brand-glass text-brand-primary'
                : 'border-surface-border bg-surface-muted text-text-secondary hover:border-brand-border hover:text-brand-primary'
            }`}
          >
            {answerOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {answerOpen ? '정답 숨기기' : '정답 보기'}
          </button>
        </div>

        {answerOpen && (
          <>
            <pre className="max-h-56 overflow-auto bg-surface-muted px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
              {example.answerSql}
            </pre>
            <div className="bg-surface-muted/40 px-4 py-3">
              <p className="text-[11px] font-black text-text-muted">해설</p>
              <p className="mt-1 text-[11px] leading-5 text-text-secondary">{example.explanation}</p>
            </div>
          </>
        )}
      </div>
    </div>

      {schemaDialog && (
        <SqlTableSchemaDialog
          table={schemaDialog}
          tables={tables}
          onClose={() => setSchemaDialog(null)}
        />
      )}

      <SqlSupplementExplanationDialog
        open={supplementOpen}
        onOpenChange={setSupplementOpen}
        title={`${example.title}의 정답 SQL`}
        body={supplementBody}
        error={supplementError}
        isLoading={isSupplementLoading}
      />

      <SqlMistakeAnalysisDialog
        open={mistakeOpen}
        onOpenChange={setMistakeOpen}
        title={`${example.title}의 오답 분석`}
        submittedSql={submissionResult?.submittedSql ?? submittedSql.trim()}
        answerSql={example.answerSql}
        analysis={mistakeAnalysis}
        error={mistakeError}
        isLoading={isSupplementLoading}
      />

      <SqlSubmissionResultDialog
        open={submissionResult !== null}
        onOpenChange={(open) => {
          if (!open) setSubmissionResult(null)
        }}
        result={submissionResult}
        title={example.title}
        description={example.description}
        onOpenSupplement={handleOpenSupplement}
        onOpenMistakeAnalysis={handleOpenMistakeAnalysis}
        isSupplementLoading={isSupplementLoading}
      />
    </>
  )
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function SqlKeywordButtons({ onInsert }: { onInsert: (keyword: string, newline: boolean) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
      {SQL_KEYWORDS.map((kw) => (
        <button
          key={kw}
          type="button"
          onClick={(e) => onInsert(kw, e.ctrlKey || e.metaKey)}
          className="inline-flex h-6 items-center rounded border border-surface-border-soft bg-surface-muted px-2 font-mono text-[10px] font-bold text-text-secondary transition-colors hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
        >
          {kw}
        </button>
      ))}
    </div>
  )
}
