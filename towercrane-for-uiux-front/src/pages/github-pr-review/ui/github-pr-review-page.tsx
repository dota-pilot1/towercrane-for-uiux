import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Check,
  Circle,
  ExternalLink,
  FileCode2,
  GitPullRequest,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'

import {
  useAnalyzeGithubPrReview,
  useCodeReviewDetail,
  useCodeReviewList,
  useGithubPrReviewPreferences,
  useSaveGithubPrReviewPreferences,
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewDetail,
  CodeReviewFinding,
  GithubPrCriterionResult,
  GithubPrReviewCriterion,
  CodeReviewRiskLevel,
} from '../../../entities/code-review/model/types'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Mermaid } from '../../../shared/ui/mermaid'

type GithubPrReviewPageProps = {
  reviewId?: string | null
}

function getPrUrlInputError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(trimmed)) {
    return '저장소 주소가 아니라 GitHub PR URL을 입력하세요.'
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+(?:\.diff)?(?:[?#].*)?$/i.test(trimmed)) {
    return '예: https://github.com/owner/repo/pull/123'
  }
  return null
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function truncate(value: string, length = 96) {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}

function riskLabel(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') return '높음'
  if (riskLevel === 'medium') return '중간'
  return '낮음'
}

function riskClassName(riskLevel: CodeReviewRiskLevel) {
  if (riskLevel === 'high') {
    return 'border-danger-border bg-danger-glass text-danger-500'
  }
  if (riskLevel === 'medium') {
    return 'border-brand-border bg-brand-glass text-brand-primary'
  }
  return 'border-surface-border-soft bg-surface-muted text-text-secondary'
}

function findingCategoryLabel(category: CodeReviewFinding['category']) {
  if (category === 'structure') return '변경 파일'
  if (category === 'process') return '주요 프로세스'
  if (category === 'code') return '주요 로직'
  if (category === 'syntax') return '핵심 문법'
  if (category === 'architecture') return '아키텍처'
  if (category === 'clean_code') return '클린코드'
  if (category === 'diagram') return 'mmd'
  if (category === 'risk') return '리스크'
  return '평가'
}

function criterionStatusLabel(status: GithubPrCriterionResult['status']) {
  if (status === 'problem') return '문제 발견'
  if (status === 'warning') return '주의'
  if (status === 'not_applicable') return '해당 없음'
  return '발견 없음'
}

function criterionStatusClassName(status: GithubPrCriterionResult['status']) {
  if (status === 'problem') return 'border-danger-border bg-danger-glass text-danger-500'
  if (status === 'warning') return 'border-brand-border bg-brand-glass text-brand-primary'
  return 'border-surface-border-soft bg-surface-muted text-text-secondary'
}

function extractMermaidChart(value: string) {
  const fenced = value.match(/```(?:mmd|mermaid)?\n([\s\S]*?)```/i)
  return (fenced?.[1] ?? value).trim()
}

function isMermaidChart(value: string) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(
    value.trim(),
  )
}

function orderedFindings(detail: CodeReviewDetail | undefined) {
  if (!detail) return []
  const order: Array<CodeReviewFinding['category']> = [
    'structure',
    'process',
    'code',
    'syntax',
    'architecture',
    'clean_code',
    'diagram',
    'risk',
  ]
  return [...detail.findings].sort((a, b) => {
    const aIndex = order.indexOf(a.category)
    const bIndex = order.indexOf(b.category)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })
}

export function GithubPrReviewPage({ reviewId = null }: GithubPrReviewPageProps) {
  const navigate = useNavigate()
  const [prUrl, setPrUrl] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [criteriaDraft, setCriteriaDraft] = useState<GithubPrReviewCriterion[]>([])
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false)
  const [q, setQ] = useState('')

  const listQuery = useCodeReviewList({
    q,
    sourceType: 'pr',
    page: 1,
    pageSize: 50,
  })
  const selectedReviewId = reviewId ?? listQuery.data?.items[0]?.id ?? null
  const detailQuery = useCodeReviewDetail(selectedReviewId)
  const analyzeReview = useAnalyzeGithubPrReview()
  const preferencesQuery = useGithubPrReviewPreferences()
  const savePreferences = useSaveGithubPrReviewPreferences()

  const inputError = getPrUrlInputError(prUrl)
  const activeCriteriaCount = criteriaDraft.filter((criterion) => criterion.enabled).length
  const canAnalyze = prUrl.trim().length > 0 && !inputError && activeCriteriaCount > 0
  const findings = useMemo(() => orderedFindings(detailQuery.data), [detailQuery.data])

  useEffect(() => {
    if (preferencesQuery.data) setCriteriaDraft(preferencesQuery.data.criteria)
  }, [preferencesQuery.data])

  function updateCriterion(index: number, changes: Partial<GithubPrReviewCriterion>) {
    setCriteriaDraft((current) =>
      current.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...changes } : criterion,
      ),
    )
  }

  function addCriterion() {
    setCriteriaDraft((current) => [
      ...current,
      {
        id: `draft-${Date.now()}`,
        title: '새 리뷰 기준',
        instruction: '이 PR에서 확인할 기준을 입력하세요.',
        enabled: true,
        orderIdx: current.length,
      },
    ])
  }

  function removeCriterion(index: number) {
    setCriteriaDraft((current) =>
      current
        .filter((_, criterionIndex) => criterionIndex !== index)
        .map((criterion, orderIdx) => ({ ...criterion, orderIdx })),
    )
  }

  async function onSaveCriteria() {
    try {
      const saved = await savePreferences.mutateAsync({
        criteria: criteriaDraft.map((criterion, orderIdx) => ({ ...criterion, orderIdx })),
      })
      setCriteriaDraft(saved.criteria)
      toast.success('리뷰 기준을 저장했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '리뷰 기준 저장에 실패했습니다.')
    }
  }

  async function onAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canAnalyze) {
      toast.error(inputError ?? '리뷰 기준을 하나 이상 선택하세요.')
      return
    }

    try {
      const detail = await analyzeReview.mutateAsync({
        sourceUrl: prUrl.trim(),
        reviewNote: reviewNote.trim(),
      })
      toast.success(detail.duplicate ? '같은 분석 결과를 불러왔습니다.' : 'PR 리뷰 분석을 완료했습니다.')
      setPrUrl('')
      navigate({ to: `/github-pr-review/${detail.id}` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PR 리뷰 분석에 실패했습니다.')
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-104px)] min-h-[720px] w-full max-w-[1600px] flex-col overflow-hidden rounded-md border border-surface-border bg-background">
      <form
        onSubmit={onAnalyze}
        className="flex shrink-0 flex-col gap-3 border-b border-surface-border-soft bg-surface-raised px-4 py-3 lg:flex-row lg:items-start"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GitPullRequest className="size-4 text-brand-primary" aria-hidden />
            <span className="text-sm font-extrabold text-text-primary">GitHub PR 리뷰</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Input
                value={prUrl}
                onChange={(event) => setPrUrl(event.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="pr-10"
                aria-label="GitHub PR URL"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            </div>
            <Button type="submit" disabled={!canAnalyze || analyzeReview.isPending} className="gap-2">
              {analyzeReview.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              분석
            </Button>
          </div>
          {inputError && <p className="mt-2 text-xs font-semibold text-danger-500">{inputError}</p>}
        </div>

        <div className="w-full shrink-0 lg:w-[520px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
              <SlidersHorizontal className="size-3.5" aria-hidden />
              리뷰 기준 {activeCriteriaCount}개
            </div>
            <button
              type="button"
              onClick={() => setShowCriteriaEditor((value) => !value)}
              className="rounded-sm border border-surface-border-soft bg-background px-2 py-1 text-[11px] font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary"
            >
              {showCriteriaEditor ? '접기' : '설정'}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {criteriaDraft.map((criterion, index) => {
              const active = criterion.enabled
              return (
                <button
                  key={criterion.id}
                  type="button"
                  onClick={() => updateCriterion(index, { enabled: !active })}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition ${
                    active
                      ? 'border-brand-border bg-brand-glass text-brand-primary'
                      : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:bg-surface-strong hover:text-text-primary'
                  }`}
                >
                  {active && <Check className="size-3.5" aria-hidden />}
                  {criterion.title}
                </button>
              )
            })}
            {preferencesQuery.isLoading && (
              <span className="inline-flex h-8 items-center rounded-sm border border-surface-border-soft bg-surface-muted px-2.5 text-xs font-bold text-text-muted">
                기준 불러오는 중
              </span>
            )}
          </div>
          {showCriteriaEditor && (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-md border border-surface-border-soft bg-background p-3">
              {criteriaDraft.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="rounded-md border border-surface-border-soft bg-surface-muted p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={criterion.enabled}
                      onChange={(event) =>
                        updateCriterion(index, { enabled: event.target.checked })
                      }
                      aria-label={`${criterion.title} 활성화`}
                      className="size-4 accent-brand-primary"
                    />
                    <Input
                      value={criterion.title}
                      onChange={(event) =>
                        updateCriterion(index, { title: event.target.value })
                      }
                      className="h-8 min-w-0 flex-1 py-1 text-xs font-bold"
                      aria-label="리뷰 기준 제목"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      disabled={criteriaDraft.length <= 1}
                      className="inline-flex size-8 items-center justify-center rounded-sm border border-surface-border-soft bg-background text-text-muted transition hover:bg-surface-strong hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="리뷰 기준 삭제"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <textarea
                    value={criterion.instruction}
                    onChange={(event) =>
                      updateCriterion(index, { instruction: event.target.value })
                    }
                    placeholder="이 기준에서 확인할 내용을 입력하세요."
                    className="mt-2 min-h-16 w-full resize-none rounded-md border border-surface-border-soft bg-background px-3 py-2 text-xs leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addCriterion}
                  disabled={criteriaDraft.length >= 10}
                  className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-surface-border-soft bg-background px-2.5 text-xs font-bold text-text-secondary transition hover:bg-surface-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-3.5" aria-hidden />
                  기준 추가
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSaveCriteria}
                  disabled={savePreferences.isPending || activeCriteriaCount < 1}
                  className="gap-1.5"
                >
                  <Save className="size-3.5" aria-hidden />
                  기준 저장
                </Button>
              </div>
            </div>
          )}
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="참고 사항: 인증 흐름, 테스트 관점, 특히 볼 파일 등"
            className="mt-2 min-h-16 w-full resize-none rounded-md border border-surface-border-soft bg-background px-3 py-2 text-xs leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border"
          />
        </div>
      </form>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-surface-border-soft bg-surface-muted lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-surface-border-soft p-3">
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="리뷰 히스토리 검색"
              className="h-9 py-2 text-xs"
              aria-label="리뷰 히스토리 검색"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-text-muted">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                불러오는 중
              </div>
            ) : listQuery.data?.items.length ? (
              <div className="space-y-2">
                {listQuery.data.items.map((item) => {
                  const active = item.id === selectedReviewId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate({ to: `/github-pr-review/${item.id}` })}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        active
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-background hover:bg-surface-raised'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-extrabold text-text-primary">
                          {item.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold ${riskClassName(
                            item.riskLevel,
                          )}`}
                        >
                          {riskLabel(item.riskLevel)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-text-secondary">{item.repository}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                        <span>{item.findingCount}개 항목</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-surface-border-soft bg-background p-4 text-sm text-text-muted">
                분석된 PR 리뷰가 없습니다.
              </div>
            )}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-background">
          {detailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-text-muted">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              리뷰 본문을 불러오는 중
            </div>
          ) : detailQuery.data ? (
            <ReviewDocument detail={detailQuery.data} findings={findings} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <FileCode2 className="mx-auto size-10 text-text-muted" aria-hidden />
                <p className="mt-3 text-sm font-bold text-text-primary">PR URL을 입력하고 분석하세요.</p>
                <p className="mt-1 text-xs text-text-muted">
                  분석 결과는 왼쪽 히스토리에 PR 단위로 쌓입니다.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ReviewDocument({
  detail,
  findings,
}: {
  detail: CodeReviewDetail
  findings: CodeReviewFinding[]
}) {
  const criterionResults = detail.criterionResults ?? []
  return (
    <article className="mx-auto max-w-5xl px-5 py-6">
      <div className="border-b border-surface-border-soft pb-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-muted">
          <span>{detail.repository}</span>
          {detail.prNumber && (
            <>
              <span>ㆍ</span>
              <span>#{detail.prNumber}</span>
            </>
          )}
          {detail.baseRef && detail.headRef && (
            <>
              <span>ㆍ</span>
              <span>
                {detail.headRef} → {detail.baseRef}
              </span>
            </>
          )}
          {detail.prState && (
            <>
              <span>ㆍ</span>
              <span>{detail.prState.toUpperCase()}</span>
            </>
          )}
          <span>ㆍ</span>
          <span>{formatDateTime(detail.createdAt)}</span>
          <span
            className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
              detail.riskLevel,
            )}`}
          >
            위험도 {riskLabel(detail.riskLevel)}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold tracking-normal text-text-primary">
              {detail.title}
            </h1>
            <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {detail.summary}
            </p>
          </div>
          <a
            href={detail.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-sm border border-surface-border-soft bg-surface-muted px-3 text-xs font-bold text-text-primary transition hover:bg-surface-strong"
          >
            <ExternalLink className="size-4" aria-hidden />
            PR 열기
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label="리뷰 기준"
          value={`${criterionResults.length || detail.findingCount}개`}
        />
        <Metric label="변경 파일" value={`${detail.changedFileCount}개`} />
        <Metric label="제외 파일" value={`${detail.excludedFileCount}개`} />
      </div>

      {detail.reviewNote && (
        <section className="mt-6 rounded-md border border-surface-border-soft bg-surface-muted p-4">
          <h2 className="text-sm font-extrabold text-text-primary">이번 리뷰 참고사항</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
            {detail.reviewNote}
          </p>
        </section>
      )}

      {criterionResults.length > 0 ? (
        <section className="mt-6 space-y-4">
          {criterionResults.map((result, index) => (
            <CriterionResultSection
              key={`${result.criterionId}-${index}`}
              result={result}
              index={index}
            />
          ))}
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {findings.map((finding, index) => (
            <FindingSection
              key={`${finding.category}-${finding.title}-${index}`}
              finding={finding}
            />
          ))}
        </section>
      )}

      {detail.testGaps.length > 0 && (
        <section className="mt-6 rounded-md border border-surface-border-soft bg-surface-muted p-4">
          <h2 className="text-sm font-extrabold text-text-primary">검증 참고</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
            {detail.testGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

function CriterionResultSection({
  result,
  index,
}: {
  result: GithubPrCriterionResult
  index: number
}) {
  return (
    <section className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
              {index + 1}. {result.criterionTitle}
            </span>
            <span
              className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${criterionStatusClassName(
                result.status,
              )}`}
            >
              {criterionStatusLabel(result.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{result.summary}</p>
        </div>
      </div>
      {result.findings.length > 0 ? (
        <div className="mt-4 space-y-3">
          {result.findings.map((finding, findingIndex) => (
            <div
              key={`${finding.message}-${findingIndex}`}
              className="rounded-md border border-surface-border-soft bg-background p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
                    finding.severity,
                  )}`}
                >
                  {riskLabel(finding.severity)}
                </span>
                <strong className="text-sm text-text-primary">{finding.message}</strong>
              </div>
              {finding.filePath && (
                <p className="mt-1 text-xs text-text-muted">
                  {finding.filePath}
                  {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {truncate(finding.evidence, 2400)}
              </p>
              <p className="mt-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm leading-6 text-text-secondary">
                {finding.recommendation}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-surface-border-soft bg-background px-3 py-2 text-sm leading-6 text-text-muted">
          제공된 diff 범위에서는 이 기준에 대한 명확한 발견 사항이 없습니다.
        </p>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3">
      <p className="text-[11px] font-bold text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-text-primary">{value}</p>
    </div>
  )
}

function FindingSection({ finding }: { finding: CodeReviewFinding }) {
  return (
    <section className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
              {findingCategoryLabel(finding.category)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">
              <SeverityIcon severity={finding.severity} />
              {riskLabel(finding.severity)}
            </span>
          </div>
          <h2 className="mt-2 break-words text-lg font-extrabold tracking-normal text-text-primary">
            {finding.title}
          </h2>
          {finding.filePath && (
            <p className="mt-1 text-xs text-text-muted">
              {finding.filePath}
              {finding.lineNumber ? `:${finding.lineNumber}` : ''}
            </p>
          )}
        </div>
      </div>
      <FindingBody finding={finding} />
      <p className="mt-4 rounded-md border border-surface-border-soft bg-background px-3 py-2 text-sm leading-6 text-text-secondary">
        {finding.recommendation}
      </p>
    </section>
  )
}

function SeverityIcon({ severity }: { severity: CodeReviewFinding['severity'] }) {
  if (severity === 'high') return <AlertTriangle className="size-3" aria-hidden />
  if (severity === 'medium') return <Circle className="size-3" aria-hidden />
  return <Check className="size-3" aria-hidden />
}

function FindingBody({ finding }: { finding: CodeReviewFinding }) {
  if (finding.category === 'diagram') {
    const chart = extractMermaidChart(finding.body)
    if (isMermaidChart(chart)) {
      return <Mermaid chart={chart} className="mt-3 min-h-36" />
    }
  }

  if (finding.category === 'structure') {
    return (
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-background px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
        {finding.body}
      </pre>
    )
  }

  if (finding.category === 'code' || finding.category === 'syntax') {
    return <HighlightedMarkdownBody value={finding.body} />
  }

  return (
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
      {truncate(finding.body, 4000)}
    </p>
  )
}

function HighlightedMarkdownBody({ value }: { value: string }) {
  return (
    <div className="mt-3 space-y-4 text-sm leading-6 text-text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h4: ({ children }) => (
            <h4 className="pt-2 text-sm font-extrabold text-text-primary">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {children}
            </p>
          ),
          hr: () => <hr className="my-5 border-surface-border-soft" />,
          ol: ({ children }) => (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-background px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className?.includes('hljs') || className?.startsWith('language-')) {
              return <code className={className}>{children}</code>
            }

            return (
              <code className="rounded-sm border border-surface-border-soft bg-surface-muted px-1 py-0.5 font-mono text-[0.92em] text-text-primary">
                {children}
              </code>
            )
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}
