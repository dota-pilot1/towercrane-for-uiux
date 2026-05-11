import * as Dialog from '@radix-ui/react-dialog'
import { X, BookOpen } from 'lucide-react'
import { NoteForm } from './note-form'

type NoteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => void
  loading?: boolean
}

export function NoteFormDialog({ open, onOpenChange, onSubmit, loading }: NoteFormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <BookOpen className="size-4" />
              </div>
              <Dialog.Title className="text-base font-bold text-text-primary">새 노트</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md ui-text-secondary hover:bg-surface-muted hover:ui-text-primary transition-colors"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <NoteForm
            onSubmit={(data) => {
              onSubmit(data)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
            loading={loading}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
