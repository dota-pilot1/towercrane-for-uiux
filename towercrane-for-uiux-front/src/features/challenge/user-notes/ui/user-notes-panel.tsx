import { useState } from 'react'
import { Plus } from 'lucide-react'
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
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  isDeletingNoteId,
  deleteNoteError,
  loading = false,
}: UserNotesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-md border border-dashed border-surface-border ui-text-secondary hover:bg-surface-muted hover:border-brand-border hover:text-brand-primary transition-colors"
        >
          <Plus className="size-4" />
          <span className="text-sm font-medium">노트 추가</span>
        </button>

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
