import { BookOpenCheck, NotebookPen, Share2, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// 개발 강의 — 강의 학습·공유·노트 코너 (준비 중 stub)
function MarketPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center gap-3 border-b border-surface-border-soft py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass text-brand-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-text-primary">{title}</h1>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-surface-border-soft bg-surface-raised py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
          <Store className="size-7" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">준비 중입니다</p>
          <p className="mt-1 text-xs text-text-muted">개발 강의 기능은 곧 제공됩니다.</p>
        </div>
      </div>
    </div>
  )
}

export function RequiredLecturesPage() {
  return (
    <MarketPlaceholder
      icon={BookOpenCheck}
      title="필수 강의"
      description="업무에 필요한 필수 개발 강의를 확인하고 수강합니다."
    />
  )
}

export function LectureSharePage() {
  return (
    <MarketPlaceholder
      icon={Share2}
      title="강의 공유"
      description="유용한 개발 강의를 팀원들과 공유합니다."
    />
  )
}

export function LectureNotesPage() {
  return (
    <MarketPlaceholder
      icon={NotebookPen}
      title="강의 노트"
      description="수강한 강의의 핵심 내용과 학습 기록을 정리합니다."
    />
  )
}
