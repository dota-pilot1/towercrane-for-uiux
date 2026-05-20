import { useState } from 'react'
import { Check, Copy, Plus } from 'lucide-react'
import { NoteCard } from './note-card'
import { NoteFormDialog } from './note-form-dialog'

interface Note {
  id: string
  title?: string
  content: string
  visibility: 'private' | 'shared' | 'public'
  pinned: boolean
  createdAt: string
  updatedAt: string
  userName?: string
}

interface UserNotesPanelProps {
  sectionId: string
  myNotes: Note[]
  shareUrl?: string
  onCreateNote: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => Promise<void>
  onUpdateNote: (id: string, data: Partial<Note>) => Promise<void>
  onDeleteNote: (id: string) => void
  isDeletingNoteId?: string | null
  deleteNoteError?: string | null
  loading?: boolean
}

export function UserNotesPanel({
  sectionId,
  myNotes,
  shareUrl,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  isDeletingNoteId,
  deleteNoteError,
  loading = false,
}: UserNotesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl ?? window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const byOldest = (a: Note, b: Note) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  const pinnedNotes = myNotes.filter((n) => n.pinned).sort(byOldest)
  const unpinnedNotes = myNotes.filter((n) => !n.pinned).sort(byOldest)
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <NoteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={onCreateNote}
        loading={loading}
      />

      <div className="flex items-center justify-end gap-2 border-b border-surface-border px-3 py-2">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 rounded-md border border-surface-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-muted ui-text-secondary"
        >
          {copied ? <Check className="size-3.5 text-brand-primary" /> : <Copy className="size-3.5" />}
          {copied ? '복사됨' : '링크'}
        </button>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-surface-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-muted ui-text-secondary"
        >
          <Plus className="size-3.5" />
          노트 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedNotes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs ui-text-muted">첫 노트를 남겨보세요.</p>
          </div>
        )}

        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isMine={true}
              onUpdate={(updates) => onUpdateNote(note.id, updates)}
              onDelete={() => onDeleteNote(note.id)}
              isDeleting={isDeletingNoteId === note.id}
              deleteError={isDeletingNoteId === note.id ? deleteNoteError : null}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
