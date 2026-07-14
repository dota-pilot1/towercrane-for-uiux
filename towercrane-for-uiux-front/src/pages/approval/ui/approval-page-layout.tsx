import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link } from '@tanstack/react-router'
import { ClipboardList, CircleHelp, X } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { APPROVAL_MENUS, APPROVAL_PATHS } from '../config/approval-navigation'

const statusRows = [
  {
    label: '결재 진행 중',
    tone: 'brand',
    description: '상신된 문서가 아직 최종 승인 또는 반려되지 않은 상태입니다.',
  },
  {
    label: '승인 완료',
    tone: 'brand',
    description: '모든 결재자가 승인해 문서 처리가 완료된 상태입니다.',
  },
  {
    label: '반려',
    tone: 'danger',
    description: '결재자 중 한 명이 반려해 문서 처리가 종료된 상태입니다.',
  },
  {
    label: '회수·취소',
    tone: 'muted',
    description: '기안자가 문서를 회수하거나 운영상 취소된 상태입니다.',
  },
] as const

const processingRows = [
  {
    label: '현재 결재자',
    tone: 'brand',
    description: '지금 승인 또는 반려를 처리해야 하는 결재자입니다.',
  },
  {
    label: '예정',
    tone: 'muted',
    description: '앞 결재자가 승인한 뒤 차례가 오는 결재자입니다.',
  },
  {
    label: '승인 완료',
    tone: 'brand',
    description: '해당 결재자가 승인 처리를 완료한 상태입니다.',
  },
  {
    label: '반려',
    tone: 'danger',
    description: '해당 결재자가 반려해 이후 결재 진행이 중단된 상태입니다.',
  },
  {
    label: '처리 제외',
    tone: 'muted',
    description: '앞 단계에서 반려되어 더 이상 처리하지 않는 이후 결재자입니다.',
  },
] as const

function statusLabelClass(tone: 'brand' | 'danger' | 'muted') {
  if (tone === 'danger') return 'text-destructive'
  if (tone === 'muted') return 'text-text-muted'
  return 'text-brand-primary'
}

function StatusDefinitionList({
  rows,
}: {
  rows: ReadonlyArray<{
    label: string
    tone: 'brand' | 'danger' | 'muted'
    description: string
  }>
}) {
  return (
    <dl className="mt-4 overflow-hidden rounded-lg border border-surface-border-soft">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid min-h-14 items-center gap-2 border-b border-surface-border-soft bg-surface-muted/50 px-3 py-3 last:border-b-0 sm:grid-cols-[7.5rem_1fr] sm:gap-4"
        >
          <dt
            className={`text-xs font-bold leading-5 ${statusLabelClass(row.tone)}`}
          >
            {row.label}
          </dt>
          <dd className="text-xs leading-5 text-text-secondary">
            {row.description}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ApprovalHelpDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm-icon"
          aria-label="전자결재 상태 설명"
          title="전자결재 상태 설명"
        >
          <CircleHelp className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 max-h-[min(720px,calc(100vh-2rem))] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-bold text-text-primary">
                전자결재 상태 안내
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-text-secondary">
                문서 전체의 결재 상태와 결재자별 처리 상태는 따로 관리됩니다.
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

          <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto px-5 py-5">
            <section className="rounded-lg border border-surface-border-soft bg-surface-raised p-4">
              <h2 className="text-sm font-bold text-text-primary">결재 상태</h2>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                문서 한 건이 최종적으로 어디까지 처리됐는지 나타냅니다.
              </p>
              <StatusDefinitionList rows={statusRows} />
            </section>

            <section className="rounded-lg border border-surface-border-soft bg-surface-raised p-4">
              <h2 className="text-sm font-bold text-text-primary">결재 처리 상태</h2>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                결재선에 있는 각 결재자가 현재 어떤 처리 단계인지 나타냅니다.
              </p>
              <StatusDefinitionList rows={processingRows} />
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ApprovalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ClipboardList className="size-5 text-brand-primary" strokeWidth={2} />
          <h1 className="text-lg font-black tracking-tight text-text-primary">전자결재</h1>
        </div>
        <ApprovalHelpDialog />
      </div>

      <nav
        className="mb-5 flex gap-1 overflow-x-auto border-b border-surface-border-soft"
        aria-label="전자결재 메뉴"
      >
        {APPROVAL_MENUS.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            activeOptions={{ exact: path === APPROVAL_PATHS.home }}
            className="flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors"
            activeProps={{
              className: 'border-brand-primary text-brand-primary',
            }}
            inactiveProps={{
              className:
                'border-transparent text-text-muted hover:text-text-secondary',
            }}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
