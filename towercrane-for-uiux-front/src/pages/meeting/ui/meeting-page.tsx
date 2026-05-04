import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Bot,
  Bug,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitBranch,
  Hash,
  ListChecks,
  Lock,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Send,
  Smile,
  Users,
} from 'lucide-react'
import {
  useMeetingMembers,
  useMeetingMessages,
  useMeetingRooms,
  useMeetingWebSocket,
  useSendMeetingMessage,
  useStartMeetingDm,
} from '../../../entities/meeting/model/use-meeting'
import type { MeetingMember, MeetingMessage, MeetingRoom, MeetingRoomType } from '../../../entities/meeting/model/types'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import { useSessionStore } from '../../../shared/store/session-store'

const slashCommands = [
  {
    command: '/도움말',
    title: '명령어 보기',
    description: '사용 가능한 워크룸 명령어를 표시합니다.',
    icon: ListChecks,
  },
  {
    command: '/채널활동',
    title: '채널 활동',
    description: '최근 채널별 메시지 수를 확인합니다.',
    icon: CalendarClock,
  },
  {
    command: '/요약 오늘',
    title: '오늘 회의 요약',
    description: '오늘 대화의 요약과 결정사항을 정리합니다.',
    icon: Bot,
  },
]

function RoomIcon({ type, className }: { type: MeetingRoomType; className?: string }) {
  if (type === 'DM' || type === 'ANNOUNCE') return <MessageSquare className={className} />
  if (type === 'PROTOTYPE') return <GitBranch className={className} />
  if (type === 'FEEDBACK') return <MessagesSquare className={className} />
  if (type === 'ISSUE') return <Bug className={className} />
  if (type === 'DECISION') return <CheckCircle2 className={className} />
  if (type === 'RESOURCE') return <FileText className={className} />
  if (type === 'INTERNAL') return <Lock className={className} />
  return <Hash className={className} />
}

function roomTypeLabel(type: MeetingRoomType) {
  if (type === 'ANNOUNCE') return '공지'
  if (type === 'PROTOTYPE') return '프로토타입'
  if (type === 'FEEDBACK') return '피드백'
  if (type === 'ISSUE') return '이슈'
  if (type === 'DECISION') return '결정사항'
  if (type === 'RESOURCE') return '자료'
  if (type === 'INTERNAL') return '프로토타입'
  if (type === 'FREE') return '피드백'
  if (type === 'QNA') return '이슈'
  return 'DM'
}

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

function ChannelSidebar({
  rooms,
  selectedRoomId,
  isLoading,
  onSelect,
}: {
  rooms: MeetingRoom[]
  selectedRoomId: string | null
  isLoading?: boolean
  onSelect: (roomId: string) => void
}) {
  return (
    <aside className="ui-panel flex min-h-0 w-full flex-col overflow-hidden bg-surface-raised lg:w-72">
      <div className="border-b border-surface-border-soft bg-surface-muted px-5 py-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] ui-text-muted">Workroom</p>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-lg font-black ui-text-primary">워크룸</h2>
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
            LIVE
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
            채널을 불러오는 중입니다.
          </div>
        ) : null}
        {!isLoading && rooms.length === 0 ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
            생성된 워크룸 채널이 없습니다.
          </div>
        ) : null}
        {rooms.filter((room) => room.roomType !== 'DM').map((room) => {
          const isActive = selectedRoomId === room.id
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room.id)}
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                isActive
                  ? 'border-brand-border bg-surface-strong text-text-primary shadow-sm'
                  : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
              }`}
            >
              <RoomIcon type={room.roomType} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{room.name}</span>
                <span className="block truncate text-xs ui-text-muted">{room.description ?? '프로젝트 채널'}</span>
              </span>
              {room.messageCount > 0 ? (
                <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-text-on-brand">
                  {room.messageCount}
                </span>
              ) : null}
            </button>
          )
        })}
        {rooms.some((room) => room.roomType === 'DM') ? (
          <div className="pt-4">
            <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.18em] ui-text-muted">DM</p>
            <div className="space-y-1">
              {rooms.filter((room) => room.roomType === 'DM').map((room) => {
                const isActive = selectedRoomId === room.id
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onSelect(room.id)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-brand-border bg-surface-strong text-text-primary shadow-sm'
                        : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
                    }`}
                  >
                    <RoomIcon type={room.roomType} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{room.name}</span>
                      <span className="block truncate text-xs ui-text-muted">{room.description ?? '1:1 DM'}</span>
                    </span>
                    {room.messageCount > 0 ? (
                      <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-text-on-brand">
                        {room.messageCount}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function MessageBubble({ message, isMine }: { message: MeetingMessage; isMine: boolean }) {
  if (message.messageType === 'SYSTEM' || message.messageType === 'COMMAND_RESULT') {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-3 py-1 text-xs ui-text-muted">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-sm font-black ui-text-primary">
          {message.messageType === 'BOT_REPLY' ? <Bot className="size-4" /> : initials(message.senderName)}
        </div>
      ) : null}
      <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-bold ui-text-primary">{isMine ? '나' : message.senderName}</span>
          <span className="ui-text-muted">{message.senderRole ?? 'member'}</span>
          <span className="ui-text-muted">{formatMessageTime(message.createdAt)}</span>
        </div>
        <div
          className={`rounded-md border px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
            isMine
              ? 'border-brand-border bg-brand-glass text-text-primary'
              : 'border-surface-border-soft bg-surface-raised text-text-primary'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

function SlashCommandPopup({ query, onPick }: { query: string; onPick: (command: string) => void }) {
  const filtered = slashCommands.filter((item) => item.command.startsWith(query.trim() || '/'))

  if (!query.startsWith('/') || filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-xl overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-2xl">
      {filtered.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.command}
            type="button"
            onClick={() => onPick(item.command)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="ui-icon-button-brand size-8 shrink-0">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold ui-text-primary">{item.command}</span>
              <span className="block truncate text-xs ui-text-secondary">
                {item.title} · {item.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MessageInput({
  disabled,
  onSend,
}: {
  disabled?: boolean
  onSend: (content: string) => void
}) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative border-t border-surface-border-soft bg-surface-raised p-4">
      <SlashCommandPopup query={value} onPick={setValue} />
      <div className="flex gap-2">
        <Button variant="secondary" size="icon" aria-label="첨부" disabled={disabled}>
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="메시지 또는 /명령어를 입력하세요. Ctrl+Enter로 전송"
          className="min-h-11 flex-1 resize-none py-2.5"
        />
        <Button variant="secondary" size="icon" aria-label="이모지" disabled={disabled}>
          <Smile className="size-4" />
        </Button>
        <Button size="icon" tone="brand" onClick={handleSend} disabled={disabled || !value.trim()} aria-label="전송">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function MessageArea({
  room,
  messages,
  currentUserId,
  onlineCount,
  isSending,
  isLoading,
  onSend,
}: {
  room: MeetingRoom
  messages: MeetingMessage[]
  currentUserId: string
  onlineCount: number
  isSending?: boolean
  isLoading?: boolean
  onSend: (content: string) => void
}) {
  return (
    <section className="ui-panel flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-raised">
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border-soft bg-surface-raised px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <RoomIcon type={room.roomType} className="size-4 text-brand-primary" />
            <h2 className="text-lg font-black ui-text-primary">{room.name}</h2>
            <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-bold ui-text-muted">
              {room.roomType}
            </span>
          </div>
          <p className="mt-1 text-sm ui-text-secondary">{room.description ?? '회의 로그를 남기는 채널입니다.'}</p>
        </div>
        <div className="hidden items-center gap-2 text-xs ui-text-muted sm:flex">
          <Users className="size-4" />
          {onlineCount} online
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-surface-muted px-5 py-5">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted">
              <MessagesSquare className="size-5 ui-text-muted" />
            </div>
            <p className="text-sm font-bold ui-text-primary">메시지를 불러오는 중입니다</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted">
              <MessagesSquare className="size-5 ui-text-muted" />
            </div>
            <p className="text-sm font-bold ui-text-primary">아직 메시지가 없습니다</p>
            <p className="mt-1 text-xs ui-text-secondary">첫 메시지를 남겨 회의 로그를 시작하세요.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} isMine={message.senderId === currentUserId} />
          ))
        )}
      </div>

      <MessageInput onSend={onSend} disabled={isSending} />
    </section>
  )
}

function MemberPanel({
  rooms,
  selectedRoom,
  members,
  currentUserId,
  onOpenDm,
}: {
  rooms: MeetingRoom[]
  selectedRoom: MeetingRoom | null
  members: MeetingMember[]
  currentUserId: string
  onOpenDm: (member: MeetingMember) => void
}) {
  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms])
  const onlineMembers = useMemo(
    () =>
      members
        .filter((member) => member.online)
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [members],
  )

  return (
    <aside className="ui-panel hidden min-h-0 w-64 flex-col overflow-hidden bg-surface-raised xl:flex">
      <div className="space-y-3 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
        <CurrentRoomCard room={selectedRoom} />
        <div className="flex items-center justify-between border-t border-surface-border-soft pt-3">
          <h2 className="text-sm font-black ui-text-primary">멤버</h2>
          <span className="text-xs ui-text-muted">{onlineMembers.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <MemberList
          members={onlineMembers}
          currentUserId={currentUserId}
          selectedRoom={selectedRoom}
          roomById={roomById}
          onOpenDm={onOpenDm}
        />
      </div>
    </aside>
  )
}

function CurrentRoomCard({ room }: { room: MeetingRoom | null }) {
  return (
    <section className="rounded-md border border-surface-border-soft bg-surface-raised px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] ui-text-muted">
        <MapPin className="size-3.5" />
        현재 채널
      </div>
      {room ? (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <RoomIcon type={room.roomType} className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black ui-text-primary">{room.name}</span>
            <span className="mt-0.5 block truncate text-xs ui-text-secondary">{roomTypeLabel(room.roomType)}</span>
          </span>
        </div>
      ) : (
        <p className="text-xs ui-text-muted">입장한 채널이 없습니다.</p>
      )}
    </section>
  )
}

function MemberList({
  members,
  currentUserId,
  selectedRoom,
  roomById,
  onOpenDm,
}: {
  members: MeetingMember[]
  currentUserId: string
  selectedRoom: MeetingRoom | null
  roomById: Map<string, MeetingRoom>
  onOpenDm: (member: MeetingMember) => void
}) {
  const [menu, setMenu] = useState<{
    member: MeetingMember
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', close)
    }
  }, [menu])

  return (
    <div>
      <div className="space-y-1">
        {members.length === 0 ? (
          <p className="rounded-md px-2 py-2 text-xs ui-text-muted">접속 중인 멤버가 없습니다.</p>
        ) : null}
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId
          const currentRoom = member.currentRoomId ? roomById.get(member.currentRoomId) : null
          const displayRoom = currentRoom ?? (isCurrentUser ? selectedRoom : null)
          return (
            <div
              key={member.id}
              className={`flex items-center gap-2 rounded-md border px-2 py-2 ${
                isCurrentUser
                  ? 'border-brand-border bg-surface-strong'
                  : 'border-transparent hover:bg-surface-muted'
              }`}
              onContextMenu={(event) => {
                if (isCurrentUser) return
                event.preventDefault()
                setMenu({ member, x: event.clientX, y: event.clientY })
              }}
            >
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-xs font-bold ui-text-primary">
                {initials(member.name)}
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-surface-raised bg-status-online shadow-sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold ui-text-primary">{member.name}</span>
                  {isCurrentUser ? (
                    <span className="shrink-0 rounded-sm border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
                      나
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs ui-text-muted">{member.role}</span>
              </span>
              <span
                title={displayRoom ? `현재 위치: ${displayRoom.name}` : '현재 위치: 대기 중'}
                className="ml-auto max-w-24 shrink-0 truncate rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-right text-[11px] font-bold ui-text-secondary"
              >
                {displayRoom ? displayRoom.name : '대기 중'}
              </span>
            </div>
          )
        })}
      </div>
      {menu ? (
        <div
          className="fixed z-[200] w-36 rounded-md border border-surface-border bg-surface-raised p-1 shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ui-text-primary hover:bg-surface-muted"
            onClick={() => {
              onOpenDm(menu.member)
              setMenu(null)
            }}
          >
            <MessageSquare className="size-4" />
            DM 열기
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function MeetingPage() {
  const currentUserId = useSessionStore((state) => state.userId)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const [requestedRoomId, setRequestedRoomId] = useState<string | null>(null)
  const roomsQuery = useMeetingRooms()
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data])
  const selectedRoomId =
    requestedRoomId && rooms.some((room) => room.id === requestedRoomId)
      ? requestedRoomId
      : rooms[0]?.id ?? null
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null
  const roomId = selectedRoom?.id ?? null
  const messagesQuery = useMeetingMessages(roomId)
  const membersQuery = useMeetingMembers(roomId)
  const sendMutation = useSendMeetingMessage(roomId)
  const startDmMutation = useStartMeetingDm()
  useMeetingWebSocket(roomId)

  const members = membersQuery.data ?? []
  const messages = messagesQuery.data ?? []
  const onlineCount = members.filter((member) => member.online).length

  const handleSend = (content: string) => {
    sendMutation.mutate(content)
  }

  const handleOpenDm = (member: MeetingMember) => {
    startDmMutation.mutate(member.id, {
      onSuccess: (room) => {
        setRequestedRoomId(room.id)
      },
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="ui-panel flex min-h-[420px] items-center justify-center text-center">
        <div>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted">
            <MessagesSquare className="size-5 ui-text-muted" />
          </div>
          <p className="text-sm font-bold ui-text-primary">로그인이 필요합니다</p>
          <p className="mt-1 text-xs ui-text-secondary">워크룸 메시지는 로그인 후 확인할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-132px)] min-h-[680px] overflow-hidden rounded-md bg-surface-muted p-1">
      <div className="grid h-full gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <ChannelSidebar
          rooms={rooms}
          selectedRoomId={selectedRoom?.id ?? null}
          isLoading={roomsQuery.isLoading}
          onSelect={setRequestedRoomId}
        />
        {selectedRoom ? (
          <MessageArea
            room={selectedRoom}
            messages={messages}
            currentUserId={currentUserId}
            onlineCount={onlineCount}
            isSending={sendMutation.isPending}
            isLoading={messagesQuery.isLoading}
            onSend={handleSend}
          />
        ) : (
          <section className="ui-panel flex min-h-0 flex-1 items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted">
                <MessagesSquare className="size-5 ui-text-muted" />
              </div>
              <p className="text-sm font-bold ui-text-primary">워크룸을 준비하는 중입니다</p>
              <p className="mt-1 text-xs ui-text-secondary">기본 채널이 생성되면 바로 입장됩니다.</p>
            </div>
          </section>
        )}
        <MemberPanel
          rooms={rooms}
          selectedRoom={selectedRoom}
          members={members}
          currentUserId={currentUserId}
          onOpenDm={handleOpenDm}
        />
      </div>
    </div>
  )
}
