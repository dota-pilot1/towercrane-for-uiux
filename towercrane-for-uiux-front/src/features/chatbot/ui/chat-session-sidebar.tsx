import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, MoreHorizontal, Pencil, Clock } from 'lucide-react'
import type { Session } from '../model/use-history-chat'
import { useSessionStore } from '../../../shared/store/session-store'

type Props = {
  sessions: Session[]
  activeId: string
  onAdd: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

type MenuPos = { top: number; right: number }

function formatDate(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function ChatSessionSidebar({ sessions, activeId, onAdd, onSwitch, onDelete, onRename }: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const userName = useSessionStore((s) => s.userName)
  const userEmail = useSessionStore((s) => s.userEmail)
  const initial = userName ? userName[0].toUpperCase() : '?'

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    function handleClickOutside() { setMenuOpenId(null) }
    if (menuOpenId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId])

  function openMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuOpenId(menuOpenId === id ? null : id)
  }

  function startEdit(s: Session) {
    setEditingId(s.id)
    setEditingTitle(s.title)
    setMenuOpenId(null)
  }

  function commitEdit(id: string) {
    const trimmed = editingTitle.trim()
    if (trimmed) onRename(id, trimmed)
    setEditingId(null)
  }

  return (
    <div className="flex w-56 shrink-0 flex-col rounded-lg border border-surface-border bg-surface-raised overflow-hidden">

      {/* 섹션 헤더 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-strong border-b border-surface-border">
        <div className="size-5 rounded-full bg-brand-glass border border-brand-border flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-brand-primary">{initial}</span>
        </div>
        <span className="text-xs font-semibold ui-text-secondary truncate">
          {userName || '사용자'}님
        </span>
        <button
          onClick={onAdd}
          className="ml-auto size-5 flex items-center justify-center rounded ui-icon-button-brand"
          title="새 대화"
        >
          <Plus className="size-3" />
        </button>
      </div>

      {/* 세션 목록 */}
      <div className="flex flex-col overflow-y-auto p-1.5 gap-0.5">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => { if (editingId !== s.id) onSwitch(s.id) }}
            className={`group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
              s.id === activeId
                ? 'bg-brand-glass text-brand-primary'
                : 'hover:bg-surface-muted ui-text-secondary'
            }`}
          >
            <Clock className="size-3 shrink-0 opacity-40" />

            <div className="min-w-0 flex-1">
              {editingId === s.id ? (
                <input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => commitEdit(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(s.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent outline-none text-xs border-b border-brand-border"
                />
              ) : (
                <span className="block truncate text-xs">{s.title}</span>
              )}
              {editingId !== s.id && (
                <span className="block text-[10px] opacity-40">{formatDate(s.updatedAt)}</span>
              )}
            </div>

            {editingId !== s.id && (
              <button
                onClick={(e) => openMenu(e, s.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-surface-strong"
              >
                <MoreHorizontal className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 드롭다운 — overflow 영역 밖으로 portal */}
      {menuOpenId && menuPos && createPortal(
        <div
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="z-[9999] w-32 rounded-lg border border-surface-border bg-popover py-1 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { const s = sessions.find(s => s.id === menuOpenId); if (s) startEdit(s) }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs ui-text-primary hover:bg-surface-muted transition-colors rounded"
          >
            <Pencil className="size-3" />
            이름 변경
          </button>
          <button
            onClick={() => { const id = menuOpenId; setMenuOpenId(null); onDelete(id) }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-surface-muted transition-colors rounded"
          >
            <Trash2 className="size-3" />
            삭제
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}
