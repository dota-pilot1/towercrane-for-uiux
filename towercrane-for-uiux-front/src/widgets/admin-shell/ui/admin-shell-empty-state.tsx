import { GitBranch } from 'lucide-react'

export function AdminShellEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col items-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-10">
        <GitBranch className="mb-6 size-12 text-brand-primary/40" />
        <h2 className="mb-2 text-xl font-semibold ui-text-primary">시작할 카테고리를 선택하세요</h2>
        <p className="max-w-xs text-center text-sm ui-text-secondary">
          왼쪽 사이드바에서 기존 카테고리를 선택하거나,
          <br />
          새로운 패턴 카테고리를 추가하여 작업을 시작하세요.
        </p>
      </div>
    </div>
  )
}
