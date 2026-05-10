import { Trophy } from 'lucide-react'
import { Card } from '../../../shared/ui/card'

export function ChallengePage() {
  return (
    <Card className="rounded-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <Trophy className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary">Challenge with GPT</h2>
          <p className="text-xs ui-text-secondary">자기 주도적 학습 챌린지 및 스터디 노트</p>
        </div>
      </div>
      <div className="rounded-md border border-dashed border-[var(--surface-border-soft)] bg-[var(--surface-muted)] py-16 text-center">
        <p className="ui-text-muted text-sm">M1: 기본 페이지 레이아웃 구현 중...</p>
      </div>
    </Card>
  )
}
