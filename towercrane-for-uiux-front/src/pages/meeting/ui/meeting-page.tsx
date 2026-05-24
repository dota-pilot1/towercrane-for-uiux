import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Bot,
  Bug,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  FileText,
  GitBranch,
  Hash,
  ListChecks,
  Lock,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Plus,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import {
  useCreateMeetingRoom,
  useCreateMeetingWorkspaceRoom,
  useDeleteMeetingRoom,
  useMeetingMembers,
  useMeetingMessages,
  useMeetingRooms,
  useMeetingWebSocket,
  useMeetingWorkspaceRooms,
  useMeetingWorkspaces,
  useSendMeetingMessage,
  useStartMeetingDm,
} from '../../../entities/meeting/model/use-meeting'
import type { MeetingMember, MeetingMessage, MeetingRoom, MeetingRoomType } from '../../../entities/meeting/model/types'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { useSessionStore } from '../../../shared/store/session-store'

const slashCommands = [
  {
    command: '/도움말',
    title: '명령어 보기',
    description: '사용 가능한 회의실 명령어를 표시합니다.',
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
  isAdmin,
  isLoading,
  workspaceId,
  workspaceName,
  onSelect,
  onDelete,
}: {
  rooms: MeetingRoom[]
  selectedRoomId: string | null
  isAdmin?: boolean
  isLoading?: boolean
  workspaceId?: string | null
  workspaceName?: string | null
  onSelect: (roomId: string) => void
  onDelete: (roomId: string) => void
}) {
  const navigate = useNavigate()
  const publicRooms = rooms.filter((room) => room.roomType !== 'DM')
  const dmRooms = rooms.filter((room) => room.roomType === 'DM')

  return (
    <aside className="ui-panel flex min-h-0 w-full flex-col overflow-hidden bg-surface-raised lg:w-72">
      <div className="border-b border-surface-border-soft bg-surface-muted px-5 py-4">
        {workspaceId ? (
          <button
            type="button"
            onClick={() => navigate({ to: '/meeting' })}
            className="mb-2 flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-brand-primary"
          >
            <ChevronLeft className="size-3.5" />
            Workspaces / {workspaceName ?? '회의실'}
          </button>
        ) : null}
        <p className="text-[11px] font-black uppercase tracking-[0.22em] ui-text-muted">Meetingroom</p>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-lg font-black ui-text-primary">회의실</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
              LIVE
            </span>
            {isAdmin ? <CreateChannelDialog workspaceId={workspaceId} /> : null}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
            채널을 불러오는 중입니다.
          </div>
        ) : null}
        {!isLoading && publicRooms.length === 0 ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3 text-sm ui-text-muted">
            생성된 회의실 채널이 없습니다.
          </div>
        ) : null}
        {publicRooms.map((room) => {
          const isActive = selectedRoomId === room.id
          const canDelete = isAdmin && room.roomType !== 'ANNOUNCE'
          return (
            <div key={room.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                  isActive
                    ? 'border-brand-border bg-brand-glass text-brand-primary shadow-sm'
                    : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
                } ${canDelete ? 'pr-8' : ''}`}
              >
                <RoomIcon type={room.roomType} className={`size-4 shrink-0 ${isActive ? 'text-brand-primary' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-bold ${isActive ? 'text-brand-primary' : ''}`}>{room.name}</span>
                  <span className={`block truncate text-xs ${isActive ? 'text-brand-primary/70' : 'ui-text-muted'}`}>{room.description ?? '프로젝트 채널'}</span>
                </span>
                {room.messageCount > 0 ? (
                  <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-text-on-brand">
                    {room.messageCount}
                  </span>
                ) : null}
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(room.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 hidden size-6 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-surface-strong hover:text-status-danger group-hover:flex group-hover:opacity-100"
                  aria-label={`${room.name} 채널 삭제`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          )
        })}
        {dmRooms.length > 0 ? (
          <div className="pt-4">
            <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.18em] ui-text-muted">DM</p>
            <div className="space-y-1">
              {dmRooms.map((room) => {
                const isActive = selectedRoomId === room.id
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onSelect(room.id)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-brand-border bg-brand-glass text-brand-primary shadow-sm'
                        : 'border-transparent ui-text-secondary hover:border-surface-border-soft hover:bg-surface-muted'
                    }`}
                  >
                    <RoomIcon type={room.roomType} className={`size-4 shrink-0 ${isActive ? 'text-brand-primary' : ''}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-bold ${isActive ? 'text-brand-primary' : ''}`}>{room.name}</span>
                      <span className={`block truncate text-xs ${isActive ? 'text-brand-primary/70' : 'ui-text-muted'}`}>{room.description ?? '1:1 DM'}</span>
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

const ROOM_TYPE_OPTIONS: { value: MeetingRoomType; label: string }[] = [
  { value: 'FREE', label: '일반' },
  { value: 'ANNOUNCE', label: '공지' },
  { value: 'PROTOTYPE', label: '프로토타입' },
  { value: 'FEEDBACK', label: '피드백' },
  { value: 'ISSUE', label: '이슈' },
  { value: 'DECISION', label: '결정사항' },
  { value: 'RESOURCE', label: '자료' },
  { value: 'QNA', label: 'Q&A' },
]

function CreateChannelDialog({ workspaceId }: { workspaceId?: string | null }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roomType, setRoomType] = useState<MeetingRoomType>('FREE')
  const createRoom = useCreateMeetingRoom()
  const createWorkspaceRoom = useCreateMeetingWorkspaceRoom(workspaceId ?? '')
  const isPending = workspaceId ? createWorkspaceRoom.isPending : createRoom.isPending
  const inputRef = useRef<HTMLInputElement>(null)

  const canSubmit = name.trim().length >= 1

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('')
      setDescription('')
      setRoomType('FREE')
    }
    setOpen(next)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const payload = { name: name.trim(), description: description.trim() || null, roomType }
    if (workspaceId) {
      await createWorkspaceRoom.mutateAsync(payload)
    } else {
      await createRoom.mutateAsync(payload)
    }
    handleOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="ui-icon-button size-6"
          aria-label="채널 추가"
        >
          <Plus className="size-3.5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-black text-text-primary">채널 추가</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-7" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">채널 이름</span>
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 스프린트 회고"
                autoFocus
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">유형</span>
              <Select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as MeetingRoomType)}
              >
                {ROOM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">설명 (선택)</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="채널 용도를 간단히 설명합니다"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-surface-border-soft pt-4">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>취소</Button>
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending ? '생성 중...' : '채널 생성'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteChannelConfirm({
  room,
  onConfirm,
  onCancel,
}: {
  room: MeetingRoom
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(380px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl">
          <Dialog.Title className="text-base font-black text-text-primary">채널 삭제</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-text-secondary">
            <span className="font-bold text-text-primary">#{room.name}</span> 채널을 삭제하면 모든 메시지가 사라집니다. 계속할까요?
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>취소</Button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md border border-status-danger bg-status-danger/10 px-4 py-2 text-sm font-bold text-status-danger transition-colors hover:bg-status-danger hover:text-background"
            >
              삭제
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

export function MeetingPage({ workspaceId }: { workspaceId?: string }) {
  const currentUserId = useSessionStore((state) => state.userId)
  const currentUserRole = useSessionStore((state) => state.userRole)
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const isAdmin = currentUserRole === 'admin'
  const [requestedRoomId, setRequestedRoomId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MeetingRoom | null>(null)
  const allRoomsQuery = useMeetingRooms()
  const workspaceRoomsQuery = useMeetingWorkspaceRooms(workspaceId ?? null)
  const roomsQuery = workspaceId ? workspaceRoomsQuery : allRoomsQuery
  const workspacesQuery = useMeetingWorkspaces()
  const workspaceName = workspaceId
    ? (workspacesQuery.data?.find((w) => w.id === workspaceId)?.name ?? null)
    : null
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
  const deleteRoomMutation = useDeleteMeetingRoom()
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

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteRoomMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedRoomId === deleteTarget.id) setRequestedRoomId(null)
        setDeleteTarget(null)
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
          <p className="mt-1 text-xs ui-text-secondary">회의실 메시지는 로그인 후 확인할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4 ui-page-bg pb-4">
      <PageHeader
        icon={MessagesSquare}
        title={workspaceName ? `회의실 · ${workspaceName}` : '회의실'}
        description="팀 채널에서 실시간으로 소통합니다."
      />
    <div className="h-[calc(100vh-212px)] min-h-[600px] overflow-hidden rounded-md bg-surface-muted p-1">
      {deleteTarget ? (
        <DeleteChannelConfirm
          room={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
      <div className="grid h-full gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <ChannelSidebar
          rooms={rooms}
          selectedRoomId={selectedRoom?.id ?? null}
          isAdmin={isAdmin}
          isLoading={roomsQuery.isLoading}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          onSelect={setRequestedRoomId}
          onDelete={(roomId) => {
            const room = rooms.find((r) => r.id === roomId)
            if (room) setDeleteTarget(room)
          }}
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
              <p className="text-sm font-bold ui-text-primary">회의실을 준비하는 중입니다</p>
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
    </section>
  )
}
