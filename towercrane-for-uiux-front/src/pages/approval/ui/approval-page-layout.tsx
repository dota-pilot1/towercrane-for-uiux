import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { APPROVAL_MENUS, APPROVAL_PATHS } from '../config/approval-navigation'

export function ApprovalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="size-5 text-brand-primary" strokeWidth={2} />
        <h1 className="text-lg font-black tracking-tight text-text-primary">전자결재</h1>
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
