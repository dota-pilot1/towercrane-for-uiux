import { createElement, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as LucideIcons from 'lucide-react'
import { clsx } from 'clsx'
import type { MenuItem } from '../../../entities/menu/model/types'

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return LucideIcons.FileText
  const icons = LucideIcons as unknown as Record<string, React.ElementType>
  const Icon = icons[iconName]
  return Icon || LucideIcons.FileText
}

function MobileMenuBranch({
  item,
  depth,
  activeSection,
  onPick,
}: {
  item: MenuItem
  depth: number
  activeSection: string
  onPick: (sectionId: string) => void
}) {
  const Icon = getIcon(item.icon)
  const pad = 12 + depth * 14
  const hasChildren = item.children.length > 0

  if (hasChildren) {
    return (
      <li className="border-b border-surface-border-soft last:border-b-0">
        <div
          className="flex items-center gap-2 py-2.5 text-sm font-semibold text-text-primary"
          style={{ paddingLeft: pad, paddingRight: 12 }}
        >
          {createElement(Icon, {
            className: 'size-4 shrink-0 text-text-secondary',
            'aria-hidden': true,
          })}
          <span className="min-w-0 break-words">{item.name}</span>
        </div>
        <ul>
          {item.children.map((child) => (
            <MobileMenuBranch
              key={child.id}
              item={child}
              depth={depth + 1}
              activeSection={activeSection}
              onPick={onPick}
            />
          ))}
        </ul>
      </li>
    )
  }

  const isActive = item.sectionId != null && item.sectionId === activeSection
  return (
    <li className="border-b border-surface-border-soft last:border-b-0">
      <button
        type="button"
        disabled={!item.sectionId}
        className={clsx(
          'flex w-full min-w-0 items-center gap-2 py-2.5 pr-3 text-left text-sm transition-colors',
          item.sectionId
            ? 'ui-text-secondary hover:bg-surface-muted hover:ui-text-primary active:bg-surface-strong'
            : 'cursor-not-allowed opacity-50',
          isActive && 'bg-brand-glass font-semibold text-brand-primary hover:text-brand-primary',
        )}
        style={{ paddingLeft: pad }}
        onClick={() => item.sectionId && onPick(item.sectionId)}
      >
        {createElement(Icon, { className: 'size-4 shrink-0', 'aria-hidden': true })}
        <span className="min-w-0 break-words">{item.name}</span>
      </button>
    </li>
  )
}

type AppHeaderMobileNavProps = {
  menuTree: MenuItem[]
  activeSection: string
  pathname: string
  onNavigate: (sectionId: string) => void
}

export function AppHeaderMobileNav({
  menuTree,
  activeSection,
  pathname,
  onNavigate,
}: AppHeaderMobileNavProps) {
  const [open, setOpen] = useState(false)

  const handlePick = (sectionId: string) => {
    onNavigate(sectionId)
    setOpen(false)
  }

  return (
    <Dialog.Root key={pathname} open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="ui-icon-button size-9 shrink-0 lg:hidden"
          aria-label="메뉴 열기"
        >
          <LucideIcons.Menu className="size-4" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] ui-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <Dialog.Content
          className={clsx(
            'glass-panel fixed inset-y-0 right-0 z-[111] flex w-[min(20rem,calc(100vw-2.5rem))] flex-col border-l border-surface-border shadow-2xl outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-right-4 data-[state=open]:slide-in-from-right-4 duration-200 lg:hidden',
          )}
        >
          <Dialog.Title className="sr-only">사이트 메뉴</Dialog.Title>
          <Dialog.Description className="sr-only">
            페이지 이동을 위한 내비게이션 목록입니다.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-2 border-b border-surface-border-soft px-3 py-3">
            <span className="text-sm font-semibold text-text-primary">메뉴</span>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button flex size-8 shrink-0 items-center justify-center"
                aria-label="메뉴 닫기"
              >
                <LucideIcons.X className="size-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2">
            <ul>
              {menuTree.map((item) => (
                <MobileMenuBranch
                  key={item.id}
                  item={item}
                  depth={0}
                  activeSection={activeSection}
                  onPick={handlePick}
                />
              ))}
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
