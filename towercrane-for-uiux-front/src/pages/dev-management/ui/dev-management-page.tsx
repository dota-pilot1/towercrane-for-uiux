import * as Dialog from '@radix-ui/react-dialog'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  BotMessageSquare,
  Brain,
  ClipboardList,
  Code2,
  FileSearch,
  Hash,
  MessageSquare,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import {
  useClearDevManagementMessages,
  useDevManagementBotSettings,
  useDevManagementMembers,
  useDevManagementMessages,
  useDevManagementRooms,
  useDevManagementWebSocket,
  useSendDevManagementMessage,
  useStartDevManagementDm,
  useUpdateDevManagementBotSettings,
} from '../../../entities/dev-management/model/use-dev-management'
import type {
  DevManagementMember,
  DevManagementMessage,
  DevManagementRoom,
} from '../../../entities/dev-management/model/types'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import { useAssignableUsers, type AssignableUser } from '../../../shared/api/users'
import { useSessionStore } from '../../../shared/store/session-store'

const quickActions = [
  {
    label: '회의 요약',
    icon: BotMessageSquare,
    prompt: '현재 대화 기준으로 회의 요약을 작성해줘.',
  },
  {
    label: '프로토타입 검색',
    icon: FileSearch,
    prompt: '이 주제에 참고할 만한 프로토타입을 찾아줘.',
  },
  {
    label: '부채 분석',
    icon: Brain,
    prompt: '최근 업무 히스토리 기준으로 기술 부채 후보를 분석해줘.',
  },
]

function initials(name: string) {
  return name.slice(0, 1).toUpperCase()
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function roomDescription(room: DevManagementRoom) {
  return room.description ?? '개발 채팅 채널'
}

function memberRoleLabel(member: DevManagementMember) {
  if (member.memberType === 'BOT') return 'Bot'
  return member.role === 'admin' ? 'Admin' : 'Member'
}

function messageTypeLabel(message: DevManagementMessage) {
  if (message.messageType === 'SUMMARY') return '회의 요약'
  if (message.messageType === 'MEETING_MINUTES_SAVED') return '회의록 저장'
  if (message.messageType === 'CODE_REVIEW_SAVED') return '코드 리뷰 저장'
  if (message.messageType === 'PROTOTYPE_SEARCH_RESULT') return '프로토타입 검색'
  if (message.messageType === 'TECH_DEBT_ANALYSIS') return '기술 부채 분석'
  if (message.messageType === 'TOOL_RESULT') return '도구 결과'
  return null
}

function sourceCount(message: DevManagementMessage) {
  const value = message.payload?.sourceCount
  return typeof value === 'number' ? value : null
}

type PrototypeSearchResult = {
  id: string
  title: string
  summary: string
  status?: string
  score?: number
  demoUrl?: string | null
  figmaUrl?: string | null
  repoUrl?: string | null
  internalUrl?: string
}

function prototypeSearchResults(message: DevManagementMessage) {
  if (message.messageType !== 'PROTOTYPE_SEARCH_RESULT') return []
  const results = message.payload?.results
  if (!Array.isArray(results)) return []
  return results.filter((item): item is PrototypeSearchResult => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as Record<string, unknown>
    return typeof candidate.id === 'string' && typeof candidate.title === 'string'
  })
}

type SavedMinutesCard = {
  id: string
  url: string
  title: string
  summary: string
  decisionCount: number
  actionItemCount: number
}

type SavedCodeReviewCard = {
  id: string
  url: string
  title: string
  repository: string
  riskLevel: 'low' | 'medium' | 'high'
  findingCount: number
  highSeverityCount: number
  testGapCount: number
  changedFileCount: number
  excludedFileCount: number
}

function savedMinutesCard(message: DevManagementMessage): SavedMinutesCard | null {
  if (message.messageType !== 'MEETING_MINUTES_SAVED') return null
  const minutes = message.payload?.minutes
  if (!minutes || typeof minutes !== 'object') return null
  const candidate = minutes as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.url !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    url: candidate.url,
    title: candidate.title,
    summary: typeof candidate.summary === 'string' ? candidate.summary : '',
    decisionCount:
      typeof candidate.decisionCount === 'number' ? candidate.decisionCount : 0,
    actionItemCount:
      typeof candidate.actionItemCount === 'number' ? candidate.actionItemCount : 0,
  }
}

function savedCodeReviewCard(message: DevManagementMessage): SavedCodeReviewCard | null {
  if (message.messageType !== 'CODE_REVIEW_SAVED') return null
  const review = message.payload?.review
  if (!review || typeof review !== 'object') return null
  const candidate = review as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.url !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.repository !== 'string'
  ) {
    return null
  }

  const riskLevel =
    candidate.riskLevel === 'high' || candidate.riskLevel === 'medium'
      ? candidate.riskLevel
      : 'low'

  return {
    id: candidate.id,
    url: candidate.url,
    title: candidate.title,
    repository: candidate.repository,
    riskLevel,
    findingCount:
      typeof candidate.findingCount === 'number' ? candidate.findingCount : 0,
    highSeverityCount:
      typeof candidate.highSeverityCount === 'number' ? candidate.highSeverityCount : 0,
    testGapCount:
      typeof candidate.testGapCount === 'number' ? candidate.testGapCount : 0,
    changedFileCount:
      typeof candidate.changedFileCount === 'number' ? candidate.changedFileCount : 0,
    excludedFileCount:
      typeof candidate.excludedFileCount === 'number' ? candidate.excludedFileCount : 0,
  }
}

function codeReviewRiskLabel(riskLevel: SavedCodeReviewCard['riskLevel']) {
  if (riskLevel === 'high') return '높음'
  if (riskLevel === 'medium') return '중간'
  return '낮음'
}

type SummaryRange = 'recent10' | 'recent30' | 'all'

function messagesForRange(messages: DevManagementMessage[], range: SummaryRange) {
  const userMessages = messages.filter(
    (message) =>
      message.senderType === 'USER' &&
      message.content.replace(/@개발\s?관리봇/g, '').trim().length > 0,
  )

  if (range === 'recent10') return userMessages.slice(-10)
  if (range === 'recent30') return userMessages.slice(-30)
  return userMessages
}

function MeetingMinutesSummaryDialog({
  messages,
  isPending,
  onSummarize,
}: {
  messages: DevManagementMessage[]
  isPending: boolean
  onSummarize: (sourceMessageIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<SummaryRange>('recent30')
  const [rows, setRows] = useState<DevManagementMessage[]>([])

  const userMessageCount = useMemo(
    () => messagesForRange(messages, 'all').length,
    [messages],
  )

  useEffect(() => {
    if (!open) return
    setRows(messagesForRange(messages, range))
  }, [messages, open, range])

  const changeRange = (nextRange: SummaryRange) => {
    setRange(nextRange)
    setRows(messagesForRange(messages, nextRange))
  }

  const removeRow = (messageId: string) => {
    setRows((current) => current.filter((message) => message.id !== messageId))
  }

  const summarize = () => {
    if (rows.length < 2) return
    onSummarize(rows.map((message) => message.id))
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={userMessageCount === 0 || isPending}
        >
          <ClipboardList className="mr-1.5 size-3.5" />
          회의록 요약
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(720px,calc(100vh-2rem))] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-surface-border bg-surface-raised shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-surface-border-soft px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                회의록 요약 범위 선택
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                요약에 포함할 메시지만 남기고 필요 없는 행은 삭제하세요.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border-soft px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['recent10', '최근 10개'],
                ['recent30', '최근 30개'],
                ['all', '전체'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={range === value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => changeRange(value as SummaryRange)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs font-semibold text-text-muted">
              선택 {rows.length}개 / 사용자 메시지 {userMessageCount}개
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="overflow-hidden rounded-md border border-surface-border-soft">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-muted">
                  <tr className="border-b border-surface-border-soft">
                    <th className="w-28 px-3 py-2 text-xs font-black uppercase tracking-widest text-text-muted">
                      시간
                    </th>
                    <th className="w-32 px-3 py-2 text-xs font-black uppercase tracking-widest text-text-muted">
                      작성자
                    </th>
                    <th className="px-3 py-2 text-xs font-black uppercase tracking-widest text-text-muted">
                      내용
                    </th>
                    <th className="w-16 px-3 py-2 text-right text-xs font-black uppercase tracking-widest text-text-muted">
                      삭제
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border-soft)] bg-surface-raised">
                  {rows.length > 0 ? (
                    rows.map((message) => (
                      <tr key={message.id} className="align-top">
                        <td className="px-3 py-3 text-xs font-semibold text-text-muted">
                          {formatMessageTime(message.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-xs font-bold text-text-secondary">
                          {message.senderName}
                        </td>
                        <td className="px-3 py-3 text-sm leading-6 text-text-primary">
                          {message.content}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="ui-icon-button-danger size-7"
                            onClick={() => removeRow(message.id)}
                            aria-label="요약 대상에서 삭제"
                            title="요약 대상에서 삭제"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                        요약할 사용자 메시지가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-surface-border-soft px-5 py-4">
            <p className="text-xs text-text-muted">
              회의록 저장은 사용자 메시지 2개 이상부터 가능합니다.
            </p>
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm">
                  취소
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                size="sm"
                onClick={summarize}
                disabled={rows.length < 2 || isPending}
              >
                <ClipboardList className="mr-1.5 size-3.5" />
                요약
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MessageBubble({
  currentUserId,
  message,
}: {
  currentUserId: string
  message: DevManagementMessage
}) {
  const isCurrentUser = message.senderType === 'USER' && message.senderId === currentUserId
  const isBot = message.senderType === 'BOT'
  const label = messageTypeLabel(message)
  const sources = sourceCount(message)
  const prototypeResults = prototypeSearchResults(message)
  const minutesCard = savedMinutesCard(message)
  const codeReviewCard = savedCodeReviewCard(message)

  return (
    <div className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser ? (
        <div
          className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border ${
            isBot
              ? 'border-brand-border bg-brand-glass text-brand-primary'
              : 'border-surface-border-soft bg-surface-muted ui-text-secondary'
          }`}
        >
          {isBot ? <BotMessageSquare className="size-4" /> : initials(message.senderName)}
        </div>
      ) : null}
      <div
        className={`flex max-w-[min(38rem,82%)] flex-col gap-1 ${
          isCurrentUser ? 'items-end' : 'items-start'
        }`}
      >
        <div className="flex items-center gap-2 px-1 text-xs ui-text-muted">
          <span className="font-bold ui-text-secondary">{message.senderName}</span>
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
        <div
          className={`whitespace-pre-wrap rounded-md border px-4 py-3 text-sm leading-6 ${
            isCurrentUser
              ? 'border-brand-border bg-brand-glass text-text-primary'
              : isBot
                ? 'border-brand-border bg-surface-muted text-text-primary'
                : 'border-surface-border-soft bg-surface-raised text-text-primary'
          }`}
        >
          {message.content}
        </div>
        {prototypeResults.length > 0 ? (
          <div className="grid w-full gap-2">
            {prototypeResults.map((result) => {
              const href = result.internalUrl ?? result.demoUrl ?? result.figmaUrl ?? result.repoUrl
              return (
                <div
                  key={result.id}
                  className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black ui-text-primary">{result.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 ui-text-secondary">
                        {result.summary}
                      </p>
                    </div>
                    {typeof result.score === 'number' ? (
                      <span className="shrink-0 rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                        {result.score > 0 ? `매칭 ${result.score}` : '최근'}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {result.status ? (
                      <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold ui-text-muted">
                        {result.status}
                      </span>
                    ) : null}
                    {href ? (
                      <a
                        href={href}
                        className="ml-auto rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-brand-primary hover:border-brand-border hover:bg-brand-glass"
                      >
                        열기
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
        {minutesCard ? (
          <div className="w-full rounded-md border border-brand-border bg-brand-glass px-3 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-text-primary">{minutesCard.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                  {minutesCard.summary}
                </p>
              </div>
              <a
                href={minutesCard.url}
                className="shrink-0 rounded-sm border border-brand-border bg-surface-raised px-2 py-1 text-[11px] font-bold text-brand-primary hover:bg-brand-glass"
              >
                열기
              </a>
            </div>
            <div className="mt-2 text-[11px] font-bold text-brand-primary">
              결정사항 {minutesCard.decisionCount}개 · 액션 아이템 {minutesCard.actionItemCount}개
            </div>
          </div>
        ) : null}
        {codeReviewCard ? (
          <div className="w-full rounded-md border border-brand-border bg-brand-glass px-3 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Code2 className="size-4 shrink-0 text-brand-primary" />
                  <p className="truncate font-black text-text-primary">
                    {codeReviewCard.title}
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {codeReviewCard.repository}
                </p>
              </div>
              <a
                href={codeReviewCard.url}
                className="shrink-0 rounded-sm border border-brand-border bg-surface-raised px-2 py-1 text-[11px] font-bold text-brand-primary hover:bg-brand-glass"
              >
                열기
              </a>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-brand-primary">
              <span>위험도 {codeReviewRiskLabel(codeReviewCard.riskLevel)}</span>
              <span>검토 {codeReviewCard.findingCount}개</span>
              <span>높음 {codeReviewCard.highSeverityCount}개</span>
              <span>테스트 공백 {codeReviewCard.testGapCount}개</span>
              <span>파일 {codeReviewCard.changedFileCount}개</span>
              {codeReviewCard.excludedFileCount > 0 ? (
                <span>제외 {codeReviewCard.excludedFileCount}개</span>
              ) : null}
            </div>
          </div>
        ) : null}
        {label ? (
          <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] font-bold ui-text-muted">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-brand-primary">
              {label}
            </span>
            {sources !== null ? <span>근거 {sources}개</span> : null}
          </div>
        ) : null}
      </div>
      {isCurrentUser ? (
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-glass text-brand-primary">
          {initials(message.senderName)}
        </div>
      ) : null}
    </div>
  )
}

function StartDmDialog({
  users,
  currentUserId,
  isPending,
  onStart,
}: {
  users: AssignableUser[]
  currentUserId: string
  isPending: boolean
  onStart: (userId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredUsers = users
    .filter((user) => user.id !== currentUserId)
    .filter((user) => {
      const keyword = query.trim().toLowerCase()
      if (!keyword) return true
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      )
    })

  const handleStart = (userId: string) => {
    onStart(userId)
    setOpen(false)
    setQuery('')
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="ui-icon-button size-7" aria-label="DM 시작">
          <Plus className="size-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                DM 시작
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                개발 논의를 이어갈 사용자를 선택하세요.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="ui-input w-full"
              placeholder="이름 또는 이메일 검색"
              autoFocus
            />
          </div>

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-8 text-center text-sm text-text-muted">
                선택할 사용자가 없습니다.
              </div>
            ) : null}
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleStart(user.id)}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-left transition hover:border-brand-border hover:bg-brand-glass"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-surface-border-soft bg-surface-raised text-sm font-black text-text-secondary">
                  {initials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{user.name}</p>
                  <p className="truncate text-xs text-text-muted">{user.email}</p>
                </div>
                <UserPlus className="size-4 shrink-0 text-brand-primary" />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function DevManagementPage() {
  const roomsQuery = useDevManagementRooms()
  const assignableUsersQuery = useAssignableUsers()
  const currentUserId = useSessionStore((state) => state.userId)
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [botSelected, setBotSelected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isComposingRef = useRef(false)
  const lastCompositionEndAtRef = useRef(0)
  const lastSubmittedRef = useRef<{
    roomId: string
    content: string
    target: 'ROOM' | 'BOT'
    submittedAt: number
  } | null>(null)

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId],
  )
  const roomId = selectedRoom?.id ?? null

  const messagesQuery = useDevManagementMessages(roomId)
  const membersQuery = useDevManagementMembers(roomId)
  const botSettingsQuery = useDevManagementBotSettings(roomId)
  const clearMessages = useClearDevManagementMessages(roomId)
  const sendMessage = useSendDevManagementMessage(roomId)
  const startDm = useStartDevManagementDm()
  const updateBotSettings = useUpdateDevManagementBotSettings(roomId)
  useDevManagementWebSocket(roomId)

  const messages = messagesQuery.data ?? []
  const members = useMemo(
    () => {
      const rawMembers = membersQuery.data ?? []
      return rawMembers.filter((member) => {
        if (member.memberType === 'BOT') return true
        if (member.online) return true
        if (member.id === currentUserId) return true
        return selectedRoom?.roomType === 'DM'
      })
    },
    [currentUserId, membersQuery.data, selectedRoom?.roomType],
  )
  const botSettings = botSettingsQuery.data
  const botEnabled = botSettings?.enabled ?? true

  const publicRooms = rooms.filter((room) => room.roomType !== 'DM')
  const dmRooms = rooms.filter((room) => room.roomType === 'DM')
  const assignableUsers = assignableUsersQuery.data ?? []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, roomId])

  const submitMessage = () => {
    const content = draft.trim()
    if (!content || !roomId || sendMessage.isPending) return
    const target = botSelected ? 'BOT' : 'ROOM'
    const now = Date.now()
    const lastSubmitted = lastSubmittedRef.current
    if (
      lastSubmitted?.roomId === roomId &&
      lastSubmitted.content === content &&
      lastSubmitted.target === target &&
      now - lastSubmitted.submittedAt < 1_000
    ) {
      return
    }
    lastSubmittedRef.current = { roomId, content, target, submittedAt: now }
    sendMessage.mutate(
      { content, target },
      {
        onSuccess: () => {
          setDraft('')
        },
        onError: () => {
          lastSubmittedRef.current = null
        },
      },
    )
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitMessage()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    const nativeEvent = event.nativeEvent
    const justEndedComposition =
      Date.now() - lastCompositionEndAtRef.current < 120
    if (
      nativeEvent.isComposing ||
      isComposingRef.current ||
      nativeEvent.keyCode === 229 ||
      justEndedComposition
    ) {
      return
    }
    event.preventDefault()
    submitMessage()
  }

  const onCompositionStart = () => {
    isComposingRef.current = true
  }

  const onCompositionEnd = () => {
    isComposingRef.current = false
    lastCompositionEndAtRef.current = Date.now()
  }

  const clearCurrentRoomMessages = () => {
    if (!roomId || messages.length === 0 || clearMessages.isPending) return
    clearMessages.mutate()
  }

  const selectBotTarget = () => {
    setBotSelected(true)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const selectRoom = (nextRoomId: string) => {
    setSelectedRoomId(nextRoomId)
    setBotSelected(false)
  }

  const openDm = (otherUserId: string) => {
    if (!otherUserId || otherUserId === currentUserId || startDm.isPending) return
    startDm.mutate(otherUserId, {
      onSuccess: (room) => selectRoom(room.id),
    })
  }

  const summarizeSelectedMessages = (sourceMessageIds: string[]) => {
    if (!roomId || sourceMessageIds.length < 2 || sendMessage.isPending) return
    setBotSelected(true)
    sendMessage.mutate({
      content: '@개발관리봇 선택한 메시지 기준 회의록으로 저장해줘',
      target: 'BOT',
      payload: { sourceMessageIds },
    })
  }

  return (
    <div className="flex h-[calc(100vh-8.75rem)] min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-md border border-brand-border bg-brand-glass px-2.5 py-1 text-xs font-bold text-brand-primary">
            <BotMessageSquare className="size-3.5" />
            개발 도구
          </div>
          <h1 className="text-xl font-black ui-text-primary">개발 채팅</h1>
          <p className="mt-0.5 text-sm ui-text-secondary">
            회의실 구조를 참고한 저장형 개발 채팅입니다. 챗봇은 서버에서 활성화 상태와 멘션 조건을 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(action.prompt)
                  selectBotTarget()
                }}
              >
                <Icon className="mr-2 size-4" />
                {action.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <aside className="ui-panel flex min-h-0 flex-col overflow-hidden bg-surface-raised">
          <div className="border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] ui-text-muted">
              Dev Channels
            </p>
            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-lg font-black ui-text-primary">채널</h2>
              <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                LIVE
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {roomsQuery.isLoading ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
                채널을 불러오는 중입니다.
              </div>
            ) : null}
            {!roomsQuery.isLoading && publicRooms.length === 0 ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
                생성된 개발 채널이 없습니다.
              </div>
            ) : null}
            {publicRooms.map((room) => {
              const isActive = room.id === selectedRoom?.id
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => selectRoom(room.id)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'border-brand-border bg-brand-glass text-brand-primary shadow-sm'
                      : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
                  }`}
                >
                  <Hash className={`size-4 shrink-0 ${isActive ? 'text-brand-primary' : ''}`} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-bold ${
                        isActive ? 'text-brand-primary' : ''
                      }`}
                    >
                      {room.name}
                    </span>
                    <span
                      className={`block truncate text-xs ${
                        isActive ? 'text-brand-primary/70' : 'ui-text-muted'
                      }`}
                    >
                      {roomDescription(room)}
                    </span>
                  </span>
                  {room.messageCount > 0 ? (
                    <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-text-on-brand">
                      {room.messageCount}
                    </span>
                  ) : null}
                </button>
              )
            })}

            <div className="pt-4">
              <div className="mb-2 flex items-center justify-between gap-2 px-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] ui-text-muted">
                  DM
                </p>
                <StartDmDialog
                  users={assignableUsers}
                  currentUserId={currentUserId}
                  isPending={startDm.isPending}
                  onStart={openDm}
                />
              </div>
              {dmRooms.length === 0 ? (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-xs ui-text-muted">
                  사용자 선택으로 1:1 개발 대화를 시작할 수 있습니다.
                </div>
              ) : null}
              {dmRooms.map((room) => {
                const isActive = room.id === selectedRoom?.id
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => selectRoom(room.id)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-brand-border bg-brand-glass text-brand-primary shadow-sm'
                        : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
                    }`}
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{room.name}</span>
                      <span className="block truncate text-xs ui-text-muted">
                        {roomDescription(room)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <section className="ui-panel flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="ui-icon-button-brand rounded-md p-2.5">
                <Hash className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black ui-text-primary">
                  {selectedRoom?.name ?? '개발 채널'}
                </h2>
                <p className="truncate text-xs ui-text-secondary">
                  {selectedRoom ? roomDescription(selectedRoom) : '채널을 선택하세요.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 text-xs ui-text-muted sm:flex">
                <Users className="size-4" />
                {members.length}명 참가
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm-icon"
                tone="danger"
                onClick={clearCurrentRoomMessages}
                disabled={!roomId || messages.length === 0 || clearMessages.isPending}
                aria-label="현재 채팅 내용 비우기"
                title="현재 채팅 내용 비우기"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
            {messagesQuery.isLoading ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-sm ui-text-muted">
                메시지를 불러오는 중입니다.
              </div>
            ) : null}
            {!messagesQuery.isLoading && messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-4 py-10 text-center text-sm ui-text-muted">
                아직 메시지가 없습니다. 개발 논의를 시작해보세요.
              </div>
            ) : null}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                currentUserId={currentUserId}
                message={message}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-surface-border-soft bg-surface-raised p-4">
            {botSelected ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-brand-border bg-brand-glass px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-brand-primary">
                  <BotMessageSquare className="size-4 shrink-0" />
                  <span className="truncate">개발 관리 봇에게 묻기</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBotSelected(false)}
                  className="ui-icon-button size-7"
                  aria-label="개발 관리 봇 선택 해제"
                  title="개발 관리 봇 선택 해제"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : null}
            <div className="mb-2 flex items-center justify-between">
              <MeetingMinutesSummaryDialog
                messages={messages}
                isPending={sendMessage.isPending}
                onSummarize={summarizeSelectedMessages}
              />
            </div>
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                className="min-h-20 resize-none flex-1"
                placeholder={
                  botSelected
                    ? '개발 관리 봇에게 물어볼 내용을 입력하세요.'
                    : '메시지를 입력하세요. Enter 전송, Shift+Enter 줄바꿈'
                }
              />
              <Button
                type="submit"
                className="h-20 shrink-0 self-end px-4"
                disabled={!draft.trim() || !roomId || sendMessage.isPending}
              >
                <Send className="mr-2 size-4" />
                전송
              </Button>
            </div>
          </form>
        </section>

        <aside className="ui-panel flex min-h-0 flex-col overflow-hidden bg-surface-raised">
          <div className="border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] ui-text-muted">
              Participants
            </p>
            <h2 className="mt-1 text-lg font-black ui-text-primary">참가자</h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-2">
              {membersQuery.isLoading ? (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
                  참가자를 불러오는 중입니다.
                </div>
              ) : null}
              {members.map((member) => {
                const isBotMember = member.memberType === 'BOT'
                const canOpenDm = member.memberType === 'USER' && member.id !== currentUserId
                const content = (
                  <>
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
                      member.memberType === 'BOT'
                        ? 'border-brand-border bg-brand-glass text-brand-primary'
                        : 'border-surface-border-soft bg-surface-raised ui-text-secondary'
                    }`}
                  >
                    {member.memberType === 'BOT' ? (
                      <BotMessageSquare className="size-4" />
                    ) : (
                      initials(member.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold ui-text-primary">{member.name}</p>
                      <span
                        className={`size-2 rounded-full ${
                          member.online ? 'bg-status-online' : 'bg-text-muted'
                        }`}
                      />
                    </div>
                    <p className="truncate text-xs ui-text-muted">{memberRoleLabel(member)}</p>
                  </div>
                    {canOpenDm ? (
                      <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-bold text-brand-primary">
                        DM
                      </span>
                    ) : null}
                  </>
                )

                if (isBotMember) {
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={selectBotTarget}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                        botSelected
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-surface-muted hover:border-brand-border hover:bg-brand-glass'
                      }`}
                    >
                      {content}
                    </button>
                  )
                }

                if (!canOpenDm) {
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3"
                    >
                      {content}
                    </div>
                  )
                }

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => openDm(member.id)}
                    disabled={startDm.isPending}
                    className="flex w-full items-center gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-left transition hover:border-brand-border hover:bg-brand-glass"
                  >
                    {content}
                  </button>
                )
              })}
            </div>

            <div className="rounded-md border border-brand-border bg-brand-glass p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-brand-primary">개발 관리 봇</p>
                  <p className="mt-1 text-xs ui-text-secondary">서버가 멘션 조건을 최종 판정</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateBotSettings.mutate({
                      enabled: !botEnabled,
                    })
                  }
                  className={`relative h-7 w-12 rounded-full border transition ${
                    botEnabled
                      ? 'border-brand-border bg-brand-primary'
                      : 'border-surface-border-soft bg-surface-strong'
                  }`}
                  disabled={!roomId || updateBotSettings.isPending}
                  aria-pressed={botEnabled}
                  aria-label="개발 관리 봇 활성화"
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-surface-raised transition ${
                      botEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <div className="space-y-2 text-xs ui-text-secondary">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand-primary" />
                  상태: {botEnabled ? '활성' : '비활성'}
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="size-4 text-brand-primary" />
                  응답 조건: 봇 선택 또는 @개발관리봇 멘션
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
