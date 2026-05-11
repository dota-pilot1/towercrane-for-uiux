import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../shared/ui/tabs'
import { NoteCard } from './note-card'
import { NoteForm } from './note-form'

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
  sharedNotes: Note[]
  onCreateNote: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => Promise<void>
  onUpdateNote: (id: string, data: Partial<Note>) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
  loading?: boolean
}

export function UserNotesPanel({
  sectionId,
  myNotes,
  sharedNotes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  loading = false,
}: UserNotesPanelProps) {
  const [tab, setTab] = useState('mine')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const byOldest = (a: Note, b: Note) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  const pinnedNotes = myNotes.filter((n) => n.pinned).sort(byOldest)
  const unpinnedNotes = myNotes.filter((n) => !n.pinned).sort(byOldest)
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 border-b border-surface-border bg-surface-muted px-0">
          <TabsTrigger value="mine" className="text-xs py-2">
            내 노트 ({myNotes.length})
          </TabsTrigger>
          <TabsTrigger value="shared" className="text-xs py-2">
            공유 받음 ({sharedNotes.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="mine" className="p-4 space-y-3">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-md border border-surface-border ui-text-secondary hover:bg-surface-muted transition-colors"
              >
                <Plus className="size-4" />
                <span className="text-sm">노트 추가</span>
              </button>
            )}

            {showForm && (
              <NoteForm
                onSubmit={(data) => {
                  onCreateNote(data)
                  setShowForm(false)
                }}
                onCancel={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                loading={loading}
              />
            )}

            {sortedNotes.length === 0 && !showForm && (
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
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shared" className="p-4 space-y-3">
            {sharedNotes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs ui-text-muted">공유받은 노트가 없습니다.</p>
              </div>
            )}

            {sharedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isMine={false}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
