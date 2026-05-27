import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  Clipboard,
  ClipboardList,
  Edit3,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  useDeleteDevMeetingMinutes,
  useDevMeetingMinutesDetail,
  useDevMeetingMinutesList,
  useUpdateDevMeetingMinutes,
} from '../../../entities/dev-meeting-minutes/api/dev-meeting-minutes-api'
import type {
  DevMeetingMinutesActionItem,
  DevMeetingMinutesTextItem,
} from '../../../entities/dev-meeting-minutes/model/types'
import { useDevManagementRooms } from '../../../entities/dev-management/model/use-dev-management'
import { Button } from '../../../shared/ui/button'
import { PageHeader } from '../../../shared/ui/page-header'

type DevMeetingMinutesPageProps = {
  minutesId?: string
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

function truncate(value: string, length = 130) {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}

export function DevMeetingMinutesPage({ minutesId = null }: DevMeetingMinutesPageProps) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const listQuery = useDevMeetingMinutesList({ q, page, pageSize: 20 })
  const roomsQuery = useDevManagementRooms()
  const detailQuery = useDevMeetingMinutesDetail(minutesId)

  const roomNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const room of roomsQuery.data ?? []) map.set(room.id, room.name)
    return map
  }, [roomsQuery.data])

  useEffect(() => {
    setPage(1)
  }, [q])

  const selectedId = minutesId ?? listQuery.data?.items[0]?.id ?? null

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={ClipboardList}
        title="회의록 게시판"
        description="개발 채팅에서 요약·저장한 회의록을 확인합니다."
      />

      <div className="grid min-h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-md border border-surface-border bg-surface-raised">
          <div className="border-b border-surface-border-soft p-3">
            <label className="flex h-10 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3">
              <Search className="size-4 text-text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                placeholder="제목 또는 요약 검색"
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
                        navigate({ to: '/dev-meeting-minutes/$minutesId', params: { minutesId: item.id } })
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
                        <span className="shrink-0 rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-text-muted">
                          {item.decisionCount + item.actionItemCount}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-text-secondary">
                        {truncate(item.summary)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
                        <span>{roomNameById.get(item.roomId) ?? item.roomId}</span>
                        <span>{item.createdByName}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-brand-primary">
                        결정사항 {item.decisionCount}개 · 액션 아이템 {item.actionItemCount}개
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-12 text-center">
                <ClipboardList className="mx-auto size-8 text-text-muted" />
                <p className="mt-3 text-sm font-bold text-text-primary">저장된 회의록이 없습니다.</p>
                <p className="mt-1 text-xs text-text-secondary">
                  개발 채팅에서 회의 요약 저장을 요청하면 여기에 표시됩니다.
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
          {minutesId ? (
            <MinutesDetailPanel
              minutesId={minutesId}
              roomName={detailQuery.data ? roomNameById.get(detailQuery.data.roomId) : undefined}
              onBack={() => navigate({ to: '/dev-meeting-minutes' })}
            />
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
              <div>
                <ClipboardList className="mx-auto size-10 text-text-muted" />
                <h3 className="mt-4 text-base font-extrabold text-text-primary">
                  회의록을 선택하세요
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                  왼쪽 목록에서 회의록을 선택하면 요약, 결정사항, 액션 아이템, 근거 메시지 ID를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MinutesDetailPanel({
  minutesId,
  roomName,
  onBack,
}: {
  minutesId: string
  roomName?: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const detailQuery = useDevMeetingMinutesDetail(minutesId)
  const updateMutation = useUpdateDevMeetingMinutes(minutesId)
  const deleteMutation = useDeleteDevMeetingMinutes()
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
        회의록을 불러오는 중
      </div>
    )
  }

  if (!detailQuery.data) {
    return (
      <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-sm text-text-muted">
        회의록을 찾을 수 없습니다.
      </div>
    )
  }

  const detail = detailQuery.data

  async function save() {
    await updateMutation.mutateAsync({ title, summary })
    setIsEditing(false)
  }

  async function remove() {
    if (!window.confirm('이 회의록을 삭제할까요?')) return
    await deleteMutation.mutateAsync(minutesId)
    navigate({ to: '/dev-meeting-minutes' })
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
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
              <span>{roomName ?? detail.roomId}</span>
              <span>{detail.createdByName}</span>
              <span>{formatDateTime(detail.createdAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyLink}>
              <Clipboard className="mr-1.5 size-3.5" />
              링크
            </Button>
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
                  <Edit3 className="mr-1.5 size-3.5" />
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
                className="text-danger hover:text-danger"
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

          <TextItemSection title="주요 논의" items={detail.discussionPoints} />
          <TextItemSection title="결정사항" items={detail.decisions} />
          <ActionItemSection items={detail.actionItems} />
          <TextItemSection title="미해결 이슈" items={detail.openQuestions} />

          <section>
            <h3 className="text-sm font-extrabold text-text-primary">근거 메시지</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.sourceMessageIds.length ? (
                detail.sourceMessageIds.map((id) => (
                  <span
                    key={id}
                    className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-xs font-semibold text-text-muted"
                  >
                    {id}
                  </span>
                ))
              ) : (
                <p className="text-sm text-text-muted">근거 메시지가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function TextItemSection({
  title,
  items,
}: {
  title: string
  items: DevMeetingMinutesTextItem[]
}) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.text}-${index}`}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3"
            >
              <p className="text-sm leading-6 text-text-primary">{item.text}</p>
              <SourceIds ids={item.sourceMessageIds} />
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">항목이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function ActionItemSection({ items }: { items: DevMeetingMinutesActionItem[] }) {
  return (
    <section>
      <h3 className="text-sm font-extrabold text-text-primary">액션 아이템</h3>
      <div className="mt-2 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.text}-${index}`}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm leading-6 text-text-primary">{item.text}</p>
                <div className="flex shrink-0 flex-wrap gap-2 text-[11px] font-bold text-text-muted">
                  {item.assigneeName ? <span>담당 {item.assigneeName}</span> : null}
                  {item.dueDate ? <span>기한 {item.dueDate}</span> : null}
                </div>
              </div>
              <SourceIds ids={item.sourceMessageIds} />
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">액션 아이템이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function SourceIds({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span
          key={id}
          className="rounded-sm border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-muted"
        >
          {id}
        </span>
      ))}
    </div>
  )
}
