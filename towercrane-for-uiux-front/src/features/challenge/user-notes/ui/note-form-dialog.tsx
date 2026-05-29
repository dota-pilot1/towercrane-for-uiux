import * as Dialog from '@radix-ui/react-dialog'
import { X, BookOpen, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { NoteForm } from './note-form'

type NoteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => Promise<void>
  loading?: boolean
}

export function NoteFormDialog({ open, onOpenChange, onSubmit, loading }: NoteFormDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: { title?: string; content: string; visibility: string; pinned: boolean }) => {
    setError(null)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.'
      const is413 = message.includes('413') || message.includes('too large') || message.includes('Payload')
      setError(is413 ? '내용이 너무 큽니다. 이미지나 내용을 줄여보세요.' : message)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setError(null); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(1100px,calc(100vw-2rem))] h-[90vh] flex flex-col -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-2xl">
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

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <NoteForm
              onSubmit={handleSubmit}
              onCancel={() => { setError(null); onOpenChange(false) }}
              loading={loading}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
