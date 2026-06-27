import { GraduationCap, LayoutTemplate, NotebookPen, Star, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// 개발 마켓 — 유료 콘텐츠 판매 코너 (준비 중 stub)
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
          <p className="mt-1 text-xs text-text-muted">개발 마켓 콘텐츠는 곧 오픈됩니다.</p>
        </div>
      </div>
    </div>
  )
}

export function MarketLecturesPage() {
  return (
    <MarketPlaceholder
      icon={GraduationCap}
      title="유료 강의"
      description="개발 실무 강의를 구매하고 수강합니다."
    />
  )
}

export function MarketRecommendPage() {
  return (
    <MarketPlaceholder
      icon={Star}
      title="강의 추천"
      description="엄선한 추천 강의를 큐레이션합니다."
    />
  )
}

export function MarketNotesPage() {
  return (
    <MarketPlaceholder
      icon={NotebookPen}
      title="유료 노트"
      description="정리된 개발 노트·자료를 구매합니다."
    />
  )
}

export function MarketPrototypesPage() {
  return (
    <MarketPlaceholder
      icon={LayoutTemplate}
      title="유료 프로토타입"
      description="바로 쓰는 프로토타입 템플릿을 구매합니다."
    />
  )
}
