import { Edit2, Trash2, Lock, Users, Globe, Pin } from 'lucide-react'
import { useState } from 'react'

interface NoteCardProps {
  note: {
    id: string
    title?: string
    content: string
    visibility: 'private' | 'shared' | 'public'
    pinned: boolean
    updatedAt: string
    userName?: string
  }
  isMine: boolean
  onUpdate: (updates: Partial<any>) => void
  onDelete: () => void
}

const visibilityIcons = {
  private: <Lock className="size-3.5" />,
  shared: <Users className="size-3.5" />,
  public: <Globe className="size-3.5" />,
}

export function NoteCard({ note, isMine, onUpdate, onDelete }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <article className="ui-panel-soft rounded-md p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold ui-text-primary text-sm truncate">{note.title || '(제목 없음)'}</h4>
            {note.pinned && <Pin className="size-3.5 text-brand-primary shrink-0" />}
          </div>
          <p className="text-xs ui-text-secondary truncate">
            {note.userName || '나'} · {new Date(note.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {isMine && (
          <div className="flex items-center gap-1 shrink-0">
            <div className={`text-xs p-1 rounded ${
              note.visibility === 'private'
                ? 'text-text-secondary'
                : 'text-brand-primary'
            }`}>
              {visibilityIcons[note.visibility]}
            </div>
            <button className="ui-icon-button" onClick={() => onUpdate({ pinned: !note.pinned })}>
              <Pin className="size-3.5" />
            </button>
            <button className="ui-icon-button text-brand-primary">
              <Edit2 className="size-3.5" />
            </button>
            <button
              className={`ui-icon-button transition-colors ${
                isDeleting ? 'text-red-500' : 'text-surface-border hover:text-red-500'
              }`}
              onClick={() => setIsDeleting(!isDeleting)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm ui-text-secondary line-clamp-3 whitespace-pre-wrap">{note.content}</p>

      {isDeleting && (
        <div className="mt-2 flex items-center gap-2 pt-2 border-t border-surface-border">
          <p className="text-xs ui-text-muted flex-1">정말 삭제하시겠습니까?</p>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            삭제
          </button>
          <button
            onClick={() => setIsDeleting(false)}
            className="text-xs px-2 py-1 rounded border border-surface-border ui-text-secondary hover:bg-surface-muted"
          >
            취소
          </button>
        </div>
      )}
    </article>
  )
}
