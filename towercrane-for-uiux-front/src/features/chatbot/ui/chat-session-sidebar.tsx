import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, MessageSquare, Trash2, History, MoreHorizontal, Pencil } from 'lucide-react'
import type { Session } from '../model/use-history-chat'

type Props = {
  sessions: Session[]
  activeId: string
  onAdd: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

type MenuPos = { top: number; right: number }

export function ChatSessionSidebar({ sessions, activeId, onAdd, onSwitch, onDelete, onRename }: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    <div className="flex w-60 shrink-0 flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <History className="size-4 text-brand-primary" />
        <span className="text-sm font-semibold ui-text-primary">대화 목록</span>
        <button onClick={onAdd} className="ml-auto ui-icon-button rounded-md p-1">
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => { if (editingId !== s.id) onSwitch(s.id) }}
            className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              s.id === activeId
                ? 'bg-brand-glass border border-brand-border text-brand-primary'
                : 'hover:bg-(--surface-muted) ui-text-secondary'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MessageSquare className="size-3.5 shrink-0" />
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
                  className="w-full bg-transparent outline-none border-b border-brand-border text-brand-primary"
                />
              ) : (
                <span className="truncate">{s.title}</span>
              )}
            </div>

            {editingId !== s.id && (
              <button
                onClick={(e) => openMenu(e, s.id)}
                className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-(--surface-strong)"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 드롭다운 — overflow 영역 밖으로 portal */}
      {menuOpenId && menuPos && createPortal(
        <div
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="z-50 w-32 rounded-lg border border-surface-border bg-popover py-1 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
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
