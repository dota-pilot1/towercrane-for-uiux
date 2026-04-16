import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
  Activity,
  ArrowUpRight,
  Blocks,
  ChartColumnBig,
  FolderPlus,
  FormInput,
  Gauge,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MousePointerClick,
  Move3D,
  Package,
  PanelLeft,
  Radio,
  Search,
  Shield,
  Sparkles,
  TableProperties,
  TriangleAlert,
  Workflow,
} from 'lucide-react'
import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'
import { WorkbenchFilterForm } from '../../../features/workbench-filter/ui/workbench-filter-form'
import { useCatalogCategories } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Card } from '../../../shared/ui/card'
import { MetricsOverview } from '../../metrics-overview/ui/metrics-overview'
import { OrderTable } from '../../order-table/ui/order-table'
import { useEffect } from 'react'

const principleSlides = [
  'FSD를 교과서적으로 유지하되, 관리자 화면 조립 속도를 떨어뜨리지 않는 실전형 레이어링',
  'Base44에 근접한 밀도와 완성도를 목표로 한 하이엔드 관리자 UI 톤',
  '카테고리와 GitHub 프로토타입을 함께 저장해 실무 패턴 카탈로그로 쓸 수 있는 구조',
]

export function AdminShell() {
  const { data: categories = [], isLoading } = useCatalogCategories()
  const activeCategoryId = useUiStore((state) => state.activeCategoryId)
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)
  const selectedCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0]

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategoryId) && categories[0]) {
      setActiveCategory(categories[0].id)
    }
  }, [activeCategoryId, categories, setActiveCategory])

  const iconMap = {
    fsd: Blocks,
    layout: LayoutDashboard,
    state: Workflow,
    server: Radio,
    table: TableProperties,
    form: FormInput,
    search: Search,
    component: Package,
    design: Sparkles,
    motion: MousePointerClick,
    lifecycle: ListChecks,
    workspace: PanelLeft,
    chart: ChartColumnBig,
    alert: TriangleAlert,
    rbac: Shield,
    realtime: Activity,
    loading: LoaderCircle,
    error: TriangleAlert,
    dnd: Move3D,
    performance: Gauge,
    custom: FolderPlus,
  } as const

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[36px]">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full p-6">
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/70">
                  towercrane-for-uiux
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-white">
                  Front Workbench
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  기본 시나리오를 시드로 두고, 필요한 카테고리를 왼쪽 사이드바에 계속 추가할 수 있는 패턴 허브입니다.
                </p>
              </div>

              <div className="mb-4">
                <AddCategoryDialog />
              </div>

              <nav className="space-y-2">
                {isLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-400">
                    카테고리 로딩 중...
                  </div>
                ) : null}

                {categories.map((item) => {
                  const Icon = iconMap[item.iconKey]
                  const isActive = activeCategoryId === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveCategory(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        isActive
                          ? 'bg-white text-slate-950'
                          : 'bg-white/4 text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <Icon className="size-4" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                        <div className="truncate text-xs opacity-70">{item.group}</div>
                      </div>
                      <span className="rounded-full bg-slate-950/10 px-2 py-0.5 text-xs">
                        {item.prototypes.length}
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
                <p className="text-sm text-slate-400">현재 선택</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedCategory?.title}</p>
                <p className="mt-3 text-sm text-slate-300">
                  선택 상태는 로컬에 유지되고, 카테고리와 프로토타입 데이터는 서버에서 가져옵니다.
                </p>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2 touch-none select-none bg-transparent p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/15" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[36px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                  <GitBranch className="size-3.5" />
                  category catalog + GitHub prototype registry
                </div>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white">
                  {selectedCategory?.title}를 기준으로 구현 포인트와 GitHub 프로토타입을 같은 화면에서 관리합니다.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                  {selectedCategory?.summary}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                Sidebar categories are user-extensible
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                GitHub prototype links live on the right
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                NestJS + Drizzle + SQLite backend planned
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {principleSlides.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <MetricsOverview />
          <WorkbenchFilterForm />
          <OrderTable />

          <Card className="rounded-[32px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">확장 가이드</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  백엔드는 SQLite 파일만 갈아끼워도 카탈로그를 복제할 수 있는 형태로 가져갑니다.
                </p>
              </div>
              <a
                href="#top"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                패턴 허브 확장
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
