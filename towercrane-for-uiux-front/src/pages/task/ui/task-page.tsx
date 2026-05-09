import { CheckSquare } from 'lucide-react'
import { Card } from '../../../shared/ui/card'

export function TaskPage() {
  return (
    <Card className="rounded-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="ui-icon-button-brand rounded-md p-2.5">
          <CheckSquare className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary">Task 관리</h2>
          <p className="text-xs ui-text-secondary">프로젝트 작업과 할 일을 관리합니다.</p>
        </div>
      </div>
      <div className="rounded-md border border-dashed border-[var(--surface-border-soft)] bg-[var(--surface-muted)] py-16 text-center">
        <p className="ui-text-muted text-sm">Task 기능이 곧 구현될 예정입니다.</p>
      </div>
    </Card>
  )
}
