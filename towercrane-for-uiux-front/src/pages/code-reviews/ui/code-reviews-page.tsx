import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import {
  Check,
  Code2,
  ExternalLink,
  FileCode2,
  GitPullRequest,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  useAnalyzeCodeReview,
  useCodeReviewDetail,
  useCodeReviewList,
  useDeleteCodeReview,
  useUpdateCodeReview,
  useValidateCodeReviewRepository,
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewFinding,
  CodeReviewRiskLevel,
  CodeReviewSection,
  CodeReviewRepositoryValidation,
} from '../../../entities/code-review/model/types'
import { Button } from '../../../shared/ui/button'
import { Mermaid } from '../../../shared/ui/mermaid'
import { PageHeader } from '../../../shared/ui/page-header'

type CodeReviewsPageProps = {
  reviewId?: string
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function truncate(value: string, length = 120) {
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

function extractMermaidChart(value: string) {
  const fenced = value.match(/```(?:mmd|mermaid)?\n([\s\S]*?)```/i)
  return (fenced?.[1] ?? value).trim()
}

function isMermaidChart(value: string) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(
    value.trim(),
  )
}

function shouldRenderCodeBlock(category: CodeReviewFinding['category']) {
  return category === 'structure' || category === 'code' || category === 'syntax'
}

const defaultReviewSections: CodeReviewSection[] = [
  'structure',
  'process',
  'code',
  'syntax',
  'architecture',
]

const reviewSectionOptions: Array<{ value: CodeReviewSection; label: string }> = [
  { value: 'structure', label: '1. 변경 파일' },
  { value: 'process', label: '2. 주요 프로세스' },
  { value: 'code', label: '3. 주요 로직' },
  { value: 'syntax', label: '4. 핵심 문법' },
  { value: 'architecture', label: '5. 아키텍처/클린코드' },
  { value: 'diagram', label: '6. mmd' },
]

const repositoryStorageKey = 'towercrane.codeReview.repositoryUrl'
const testCodeReviewRepositoryUrl = 'https://github.com/dota-pilot1/towercrane-for-uiux'
const testCodeReviewCommitUrl =
  'https://github.com/dota-pilot1/towercrane-for-uiux/commit/0620b8ec376e0ee19379eabf2c063628d140ed6a'
const testCodeReviewGoal = '프로토 타입 워크 스페이스 수정 관련 로직'
const testCodeReviewSections = reviewSectionOptions.map((option) => option.value)

function getCommitUrlInputError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(trimmed)) {
    return '저장소 주소가 아니라 GitHub commit URL을 입력하세요.'
  }
  if (
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[0-9a-f]{7,40}(?:\.diff)?(?:[?#].*)?$/i.test(
      trimmed,
    )
  ) {
    return '예: https://github.com/owner/repo/commit/sha'
  }
  return null
}

const ANALYZE_STEPS = [
  { icon: '⬇️', label: 'GitHub diff 수집 중...' },
  { icon: '📂', label: '변경 파일 전체 읽는 중...' },
  { icon: '🔗', label: '연관 파일 탐색 중...' },
  { icon: '🤖', label: 'AI 코드 리뷰 생성 중...' },
  { icon: '💾', label: '리뷰 저장 중...' },
]

function AnalyzingOverlay() {
  const [step, setStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStep((prev) => (prev < ANALYZE_STEPS.length - 1 ? prev + 1 : prev))
    }, 2200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-8 p-8">
      {/* 아이콘 애니메이션 */}
      <div className="relative flex size-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-glass opacity-60" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-brand-glass opacity-40" />
        <Code2 className="relative size-10 text-brand-primary" />
      </div>

      {/* 제목 */}
      <div className="text-center">
        <p className="text-base font-extrabold text-text-primary">AI 코드 리뷰 분석 중</p>
        <p className="mt-1 text-xs text-text-muted">diff · 전체 파일 · 연관 파일까지 읽습니다</p>
      </div>

      {/* 단계 표시 */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        {ANALYZE_STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-500 ${
              i === step
                ? 'bg-brand-glass text-brand-primary font-bold'
                : i < step
                  ? 'text-text-muted line-through opacity-50'
                  : 'text-text-muted opacity-30'
            }`}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.label}</span>
            {i === step && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-brand-primary" />
            )}
            {i < step && (
              <Check className="ml-auto size-3.5 text-brand-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CodeReviewsPage({ reviewId = null }: CodeReviewsPageProps) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [sourceUrl, setSourceUrl] = useState('')
  const [reviewGoal, setReviewGoal] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [repositoryValidation, setRepositoryValidation] =
    useState<CodeReviewRepositoryValidation | null>(null)
  const [repositoryError, setRepositoryError] = useState<string | null>(null)
  const [selectedSections, setSelectedSections] =
    useState<CodeReviewSection[]>(defaultReviewSections)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const listQuery = useCodeReviewList({ q, page, pageSize: 20 })
  const detailQuery = useCodeReviewDetail(reviewId)
  const analyzeMutation = useAnalyzeCodeReview()
  const validateRepositoryMutation = useValidateCodeReviewRepository()
  const sourceUrlError = getCommitUrlInputError(sourceUrl)

  useEffect(() => {
    setPage(1)
  }, [q])

  useEffect(() => {
    const savedRepository = window.localStorage.getItem(repositoryStorageKey)
    if (!savedRepository) return
    setRepositoryUrl(savedRepository)
    void validateRepository(savedRepository, false)
  }, [])

  const selectedId = reviewId ?? listQuery.data?.items[0]?.id ?? null

  async function validateRepository(value = repositoryUrl, persist = true) {
    const nextValue = value.trim()
    if (!nextValue) {
      setRepositoryValidation(null)
      setRepositoryError('저장소 주소를 입력하세요.')
      return
    }

    setRepositoryError(null)
    try {
      const result = await validateRepositoryMutation.mutateAsync(nextValue)
      setRepositoryValidation(result)
      setRepositoryUrl(result.repositoryUrl)
      if (result.valid && persist) {
        window.localStorage.setItem(repositoryStorageKey, result.repositoryUrl)
      }
      if (!result.valid) setRepositoryError(result.message)
    } catch (error) {
      setRepositoryValidation(null)
      setRepositoryError(
        error instanceof Error ? error.message : '저장소 확인에 실패했습니다.',
      )
    }
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAnalyzeError(null)
    if (sourceUrlError) {
      setAnalyzeError(sourceUrlError)
      return
    }
    try {
      const detail = await analyzeMutation.mutateAsync({
        sourceUrl,
        repositoryUrl: repositoryValidation?.valid ? repositoryValidation.repositoryUrl : undefined,
        reviewGoal: reviewGoal.trim() || undefined,
        sections: selectedSections,
      })
      setSourceUrl('')
      navigate({ to: '/code-reviews/$reviewId', params: { reviewId: detail.id } })
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '분석에 실패했습니다.')
    }
  }

  function toggleSection(section: CodeReviewSection) {
    setSelectedSections((current) => {
      if (current.includes(section)) {
        return current.filter((item) => item !== section)
      }
      return [...current, section]
    })
  }

  function fillTestReviewInput() {
    setRepositoryUrl(testCodeReviewRepositoryUrl)
    setRepositoryValidation({
      valid: true,
      repository: 'dota-pilot1/towercrane-for-uiux',
      repositoryUrl: testCodeReviewRepositoryUrl,
      defaultBranch: 'main',
      message: '테스트 저장소가 입력되었습니다.',
    })
    setRepositoryError(null)
    setSourceUrl(testCodeReviewCommitUrl)
    setReviewGoal(testCodeReviewGoal)
    setSelectedSections(testCodeReviewSections)
    setAnalyzeError(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={Code2}
        title="코드 리뷰 게시판"
      />

      <form
        onSubmit={analyze}
        className="rounded-md border border-surface-border bg-surface-raised p-4"
      >
        <div className="mb-4 rounded-md border border-surface-border-soft bg-surface-muted p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-40">
              <div className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
                <GitPullRequest className="size-4 text-brand-primary" />
                리뷰 저장소
              </div>
            </div>
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-raised px-3">
              <input
                value={repositoryUrl}
                onChange={(event) => {
                  setRepositoryUrl(event.target.value)
                  setRepositoryValidation(null)
                  setRepositoryError(null)
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="https://github.com/dota-pilot1/towercrane-for-uiux"
                disabled={validateRepositoryMutation.isPending}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void validateRepository()}
              disabled={!repositoryUrl.trim() || validateRepositoryMutation.isPending}
            >
              {validateRepositoryMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-3.5" />
              )}
              확인
            </Button>
          </div>
          {repositoryValidation?.valid || repositoryError ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              {repositoryValidation?.valid ? (
                <>
                  <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-brand-primary">
                    {repositoryValidation.message}
                  </span>
                  <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-text-secondary">
                    {repositoryValidation.repository}
                  </span>
                  {repositoryValidation.defaultBranch ? (
                    <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-text-secondary">
                      {repositoryValidation.defaultBranch}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-danger-500">{repositoryError}</span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <GitPullRequest className="size-4 shrink-0 text-text-muted" />
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="https://github.com/owner/repo/commit/sha"
                disabled={analyzeMutation.isPending}
              />
            </label>
            {sourceUrlError ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                {sourceUrlError}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={fillTestReviewInput}
              disabled={analyzeMutation.isPending}
            >
              <Code2 className="mr-1.5 size-3.5" />
              테스트
            </Button>
            <Button
              type="submit"
              disabled={
                !sourceUrl.trim() ||
                Boolean(sourceUrlError) ||
                selectedSections.length === 0 ||
                analyzeMutation.isPending
              }
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <FileCode2 className="mr-1.5 size-3.5" />
              )}
              분석 후 저장
            </Button>
          </div>
        </div>
        <label className="mt-3 block rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
          <span className="text-xs font-extrabold text-text-secondary">
            리뷰할 로직 설명
          </span>
          <textarea
            value={reviewGoal}
            onChange={(event) => setReviewGoal(event.target.value)}
            className="mt-2 min-h-20 w-full resize-y bg-transparent text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted"
            placeholder="예: 프로토타입 워크스페이스 삭제 권한, 삭제 차단 조건, delete mutation 후 목록 갱신 흐름 위주로 리뷰"
            maxLength={1000}
            disabled={analyzeMutation.isPending}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {reviewSectionOptions.map((option) => {
            const checked = selectedSections.includes(option.value)
            return (
              <label
                key={option.value}
                className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-3 text-xs font-bold transition-colors ${
                  checked
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:border-brand-border hover:bg-brand-glass'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSection(option.value)}
                  className="size-3 accent-[var(--brand-primary)]"
                  disabled={analyzeMutation.isPending}
                />
                {option.label}
              </label>
            )
          })}
        </div>
        {analyzeError ? (
          <p className="mt-2 text-sm font-semibold text-danger-500">{analyzeError}</p>
        ) : null}
      </form>

      <div className="grid min-h-[calc(100vh-16rem)] gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border-soft p-3">
            <label className="flex h-10 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="제목, 저장소, 요약 검색"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                불러오는 중
              </div>
            ) : listQuery.data?.items.length ? (
              <div className="flex flex-col gap-2">
                {listQuery.data.items.map((item) => {
                  const isActive = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: '/code-reviews/$reviewId',
                          params: { reviewId: item.id },
                        })
                      }
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 text-sm font-extrabold text-text-primary">
                          {item.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-bold ${riskClassName(
                            item.riskLevel,
                          )}`}
                        >
                          {riskLabel(item.riskLevel)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-text-secondary">
                        {truncate(item.summary)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                        <span>{item.repository}</span>
                        <span>{item.createdByName}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-brand-primary">
                        평가 {item.findingCount}개
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-12 text-center">
                <Code2 className="mx-auto size-8 text-text-muted" />
                <p className="mt-3 text-sm font-bold text-text-primary">저장된 코드 리뷰가 없습니다.</p>
                <p className="mt-1 text-xs text-text-secondary">
                  GitHub commit URL을 입력하면 변경 파일 분석 후 리뷰가 저장됩니다.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-surface-border-soft px-3 py-2 text-xs text-text-muted">
            <span>총 {listQuery.data?.total ?? 0}건</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {listQuery.data?.totalPages ?? 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-surface-border bg-surface-raised">
          {analyzeMutation.isPending ? (
            <AnalyzingOverlay />
          ) : reviewId ? (
            <ReviewDetailPanel
              reviewId={reviewId}
              onBack={() => navigate({ to: '/code-reviews' })}
            />
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
              <div>
                <Code2 className="mx-auto size-10 text-text-muted" />
                <h3 className="mt-4 text-base font-extrabold text-text-primary">
                  코드 리뷰를 선택하세요
                </h3>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ReviewDetailPanel({
  reviewId,
  onBack,
}: {
  reviewId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const detailQuery = useCodeReviewDetail(reviewId)
  const updateMutation = useUpdateCodeReview(reviewId)
  const deleteMutation = useDeleteCodeReview()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!detailQuery.data) return
    setTitle(detailQuery.data.title)
    setSummary(detailQuery.data.summary)
    setIsEditing(false)
  }, [detailQuery.data])

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        코드 리뷰를 불러오는 중
      </div>
    )
  }

  if (!detailQuery.data) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-sm text-text-muted">
        코드 리뷰를 찾을 수 없습니다.
      </div>
    )
  }

  const detail = detailQuery.data

  async function save() {
    await updateMutation.mutateAsync({ title, summary })
    setIsEditing(false)
  }

  async function remove() {
    if (!window.confirm('이 코드 리뷰를 삭제할까요?')) return
    await deleteMutation.mutateAsync(reviewId)
    navigate({ to: '/code-reviews' })
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="border-b border-surface-border-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {isEditing ? (
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="ui-input h-10 w-full max-w-2xl text-base font-extrabold"
              />
            ) : (
              <h2 className="text-xl font-extrabold text-text-primary">{detail.title}</h2>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
              <span>{detail.repository}</span>
              <span>{detail.createdByName}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
              <span
                className={`rounded-sm border px-2 py-0.5 ${riskClassName(detail.riskLevel)}`}
              >
                위험도 {riskLabel(detail.riskLevel)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-muted px-3 text-sm font-semibold text-text-primary hover:bg-surface-strong"
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              원본
            </a>
            {detail.canEdit ? (
              isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="mr-1.5 size-3.5" />
                    취소
                  </Button>
                  <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
                    <Check className="mr-1.5 size-3.5" />
                    저장
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  수정
                </Button>
              )
            ) : null}
            {detail.canDelete ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={remove}
                disabled={deleteMutation.isPending}
                className="text-danger-500 hover:text-danger-500"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                삭제
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onBack}>
              닫기
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-extrabold text-text-primary">전체 요약</h3>
            {isEditing ? (
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="ui-input mt-2 min-h-36 w-full resize-y py-3 leading-6"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-6 text-text-secondary">
                {detail.summary}
              </p>
            )}
          </section>

          <FindingSection findings={detail.findings} />
        </div>
      </div>
    </div>
  )
}

function FindingSection({ findings }: { findings: CodeReviewFinding[] }) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">검토 항목</h3>
      <div className="mt-2 space-y-2">
        {findings.length ? (
          findings.map((finding, index) => (
            <div
              key={`${finding.title}-${index}`}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                    {findingCategoryLabel(finding.category)}
                  </span>
                  <h4 className="min-w-0 text-sm font-extrabold text-text-primary">
                    {finding.title}
                  </h4>
                </div>
                <span
                  className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
                    finding.severity,
                  )}`}
                >
                  {riskLabel(finding.severity)}
                </span>
              </div>
              <FindingBody finding={finding} />
              <p className="mt-2 text-sm font-semibold text-text-primary">
                권장: {finding.recommendation}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                {finding.filePath ? <span>{finding.filePath}</span> : null}
                {finding.lineNumber ? <span>line {finding.lineNumber}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">평가 항목이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function FindingBody({ finding }: { finding: CodeReviewFinding }) {
  if (finding.category === 'diagram') {
    const chart = extractMermaidChart(finding.body)

    if (!isMermaidChart(chart)) {
      return (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
          {finding.body}
        </pre>
      )
    }

    return (
      <div className="mt-3 rounded-md border border-surface-border-soft bg-surface-raised p-3">
        <Mermaid chart={chart} className="min-h-36" />
      </div>
    )
  }

  if (shouldRenderCodeBlock(finding.category)) {
    if (finding.category === 'code' || finding.category === 'syntax') {
      return <HighlightedMarkdownBody value={finding.body} />
    }

    return (
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
        {finding.body}
      </pre>
    )
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
      {finding.body}
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
            <h4 className="pt-2 text-sm font-extrabold text-text-primary">
              {children}
            </h4>
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
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3 font-mono text-xs leading-5 text-text-secondary">
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
