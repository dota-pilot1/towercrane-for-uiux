import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenCheck, X } from 'lucide-react'

type SqlExamplesDialogProps = {
  open: boolean
  seedFileName: string
  tableCount: number
  onClose: () => void
}

export function SqlExamplesDialog({
  open,
  seedFileName,
  tableCount,
  onClose,
}: SqlExamplesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[86vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border-soft shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="ui-icon-button-brand size-9 shrink-0">
                <BookOpenCheck className="size-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-text-primary">
                  SQL 예제
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-text-secondary">
                  현재 ERD에 맞춘 난이도별 실습 문제는 구현 예정입니다.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
              <p className="text-sm font-bold text-text-primary">
                {seedFileName || '현재 seed'} 기준 예제 패널
              </p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                현재 연습 DB의 {tableCount}개 테이블과 ERD 관계를 기준으로 초보, 중수, 고수
                각 10개 문제를 제공할 예정입니다.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {['초보', '중수', '고수'].map((level) => (
                <div
                  key={level}
                  className="rounded-md border border-surface-border-soft bg-background p-3"
                >
                  <p className="text-sm font-bold text-text-primary">{level}</p>
                  <p className="mt-1 text-[11px] leading-5 text-text-secondary">
                    10개 문제, 정답 SQL, 해설 표시 예정
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
