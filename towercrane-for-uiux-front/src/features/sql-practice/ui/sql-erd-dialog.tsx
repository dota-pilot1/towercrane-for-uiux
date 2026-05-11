import * as Dialog from '@radix-ui/react-dialog'
import { GitFork, X } from 'lucide-react'
import { SqlErdView } from './sql-erd-view'

type SqlErdDialogProps = {
  open: boolean
  seedFileName: string
  mmd: string
  onClose: () => void
}

export function SqlErdDialog({ open, seedFileName, mmd, onClose }: SqlErdDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed inset-0 z-[211] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="ui-icon-button-brand size-9 shrink-0">
                <GitFork className="size-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text-primary">
                  ERD — {seedFileName}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-text-secondary">
                  현재 시드 파일의 테이블 관계도
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <SqlErdView mmd={mmd} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
