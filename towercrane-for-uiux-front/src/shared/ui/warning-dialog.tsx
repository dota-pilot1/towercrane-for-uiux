import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './button'

type WarningDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onOpenChange: (open: boolean) => void
}

export function WarningDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  onOpenChange,
}: WarningDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border-soft p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-destructive bg-danger-glass text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-text-secondary">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => onOpenChange(false)}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
