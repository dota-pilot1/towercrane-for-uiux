import { FolderKanban, GitBranch, PanelLeftOpen, SquareActivity } from 'lucide-react'
import { useCatalogCategories } from '../../../shared/api/catalog'
import { Card } from '../../../shared/ui/card'

const metricMeta = [
  { key: 'categoryCount', label: '사이드바 카테고리', icon: PanelLeftOpen },
  { key: 'prototypeCount', label: 'GitHub 프로토타입', icon: GitBranch },
  { key: 'readyCount', label: 'Ready 상태', icon: SquareActivity },
  { key: 'customCount', label: '사용자 추가 카테고리', icon: FolderKanban },
] as const

export function MetricsOverview() {
  const { data: categories = [] } = useCatalogCategories()
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metricMeta.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.key} className="rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {metrics[item.key]}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/10 bg-emerald-300/10 p-3 text-emerald-200">
                <Icon className="size-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
