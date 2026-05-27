import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
} from '../../../entities/code-review/api/code-review-api'
import type {
  CodeReviewChangedFile,
  CodeReviewFinding,
  CodeReviewRiskLevel,
} from '../../../entities/code-review/model/types'
import { Button } from '../../../shared/ui/button'
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

export function CodeReviewsPage({ reviewId = null }: CodeReviewsPageProps) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [sourceUrl, setSourceUrl] = useState('')
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const listQuery = useCodeReviewList({ q, page, pageSize: 20 })
  const detailQuery = useCodeReviewDetail(reviewId)
  const analyzeMutation = useAnalyzeCodeReview()

  useEffect(() => {
    setPage(1)
  }, [q])

  const selectedId = reviewId ?? listQuery.data?.items[0]?.id ?? null

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAnalyzeError(null)
    try {
      const detail = await analyzeMutation.mutateAsync({ sourceUrl })
      setSourceUrl('')
      navigate({ to: '/code-reviews/$reviewId', params: { reviewId: detail.id } })
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '분석에 실패했습니다.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={Code2}
        title="코드 리뷰 게시판"
        description="GitHub commit, PR, compare URL을 입력해 diff를 분석하고 리뷰로 저장합니다."
      />

      <form
        onSubmit={analyze}
        className="rounded-md border border-surface-border bg-surface-raised p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
            <GitPullRequest className="size-4 shrink-0 text-text-muted" />
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              placeholder="https://github.com/owner/repo/pull/123 또는 commit/sha"
              disabled={analyzeMutation.isPending}
            />
          </label>
          <Button type="submit" disabled={!sourceUrl.trim() || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <FileCode2 className="mr-1.5 size-3.5" />
            )}
            분석 후 저장
          </Button>
        </div>
        {analyzeError ? (
          <p className="mt-2 text-sm font-semibold text-danger-500">{analyzeError}</p>
        ) : (
          <p className="mt-2 text-xs text-text-muted">
            lock/generated/build 산출물은 자동 제외하고, 같은 diff는 중복 저장하지 않습니다.
          </p>
        )}
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
                        검토 {item.findingCount}개 · 테스트 공백 {item.testGapCount}개
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
                  GitHub URL을 입력하면 diff 분석 후 리뷰가 저장됩니다.
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
          {reviewId ? (
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
                <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                  왼쪽 목록에서 저장된 리뷰를 선택하면 검토 항목, 테스트 공백, 변경 파일을 확인할 수 있습니다.
                </p>
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
          <TestGapSection items={detail.testGaps} />
          <ChangedFilesSection title="검토 파일" files={detail.changedFiles} />
          <ChangedFilesSection title="제외 파일" files={detail.excludedFiles} />
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
                <h4 className="text-sm font-extrabold text-text-primary">{finding.title}</h4>
                <span
                  className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${riskClassName(
                    finding.severity,
                  )}`}
                >
                  {riskLabel(finding.severity)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {finding.body}
              </p>
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
          <p className="text-sm text-text-muted">검토 항목이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function TestGapSection({ items }: { items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">테스트 공백</h3>
      <div className="mt-2 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <p
              key={`${item}-${index}`}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm leading-6 text-text-secondary"
            >
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm text-text-muted">테스트 공백 항목이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function ChangedFilesSection({
  title,
  files,
}: {
  title: string
  files: CodeReviewChangedFile[]
}) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">{title}</h3>
      <div className="mt-2 overflow-hidden rounded-md border border-surface-border-soft">
        {files.length ? (
          files.map((file) => (
            <div
              key={`${title}-${file.path}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border-soft bg-surface-muted px-4 py-2 last:border-b-0"
            >
              <span className="min-w-0 break-all text-sm font-semibold text-text-primary">
                {file.path}
              </span>
              <span className="shrink-0 text-xs font-bold text-text-muted">
                +{file.additions} / -{file.deletions}
                {file.excludedReason ? ` · ${file.excludedReason}` : ''}
              </span>
            </div>
          ))
        ) : (
          <p className="bg-surface-muted px-4 py-3 text-sm text-text-muted">파일이 없습니다.</p>
        )}
      </div>
    </section>
  )
}
