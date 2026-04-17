import { FolderKanban, GitBranch, PanelLeftOpen, SquareActivity } from 'lucide-react'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { Card } from '../../../shared/ui/card'

const metricMeta = [
  { key: 'categoryCount', label: '사이드바 카테고리', icon: PanelLeftOpen },
  { key: 'prototypeCount', label: 'GitHub 프로토타입', icon: GitBranch },
  { key: 'readyCount', label: 'Ready 상태', icon: SquareActivity },
  { key: 'customCount', label: '사용자 추가 카테고리', icon: FolderKanban },
] as const

type MetricsOverviewProps = {
  categories: ScenarioCategory[]
}

export function MetricsOverview({ categories }: MetricsOverviewProps) {
  const prototypeCount = categories.reduce(
    (sum, category) => sum + category.prototypes.length,
    0,
  )
  const readyCount = categories.reduce(
    (sum, category) =>
      sum + category.prototypes.filter((prototype) => prototype.status === 'ready').length,
    0,
  )
  const customCount = categories.filter((category) => category.iconKey === 'custom').length

  const metrics = {
    categoryCount: `${categories.length}개`,
    prototypeCount: `${prototypeCount}개`,
    readyCount: `${readyCount}개`,
    customCount: `${customCount}개`,
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metricMeta.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.key} className="rounded-[22px] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-text-primary">
                  {metrics[item.key]}
                </p>
              </div>
              <div className="rounded-[18px] border border-brand-border bg-brand-glass p-2.5 text-brand-primary">
                <Icon className="size-4.5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
