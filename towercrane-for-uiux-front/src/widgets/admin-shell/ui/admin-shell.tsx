import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
  Activity,
  ArrowUpRight,
  Blocks,
  ChartColumnBig,
  FileText,
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
  UserRoundPlus,
  Workflow,
} from 'lucide-react'
import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
    </svg>
  )
}

function FigmaIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
      <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
      <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
      <path d="M12 9h3.5a3.5 3.5 0 1 1 0 7H12V9z" />
      <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
    </svg>
  )
}
import { DeleteCategoryButton } from '../../../features/category-management/ui/delete-category-button'
import { EditCategoryDialog } from '../../../features/category-management/ui/edit-category-dialog'
import { AddPrototypeDialog } from '../../../features/prototype-management/ui/add-prototype-dialog'
import { EditPrototypeDialog } from '../../../features/prototype-management/ui/edit-prototype-dialog'
import { DeletePrototypeButton } from '../../../features/prototype-management/ui/delete-prototype-button'
import { WorkbenchFilterForm } from '../../../features/workbench-filter/ui/workbench-filter-form'
import { useCatalogCategories } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { useSessionStore } from '../../../shared/store/session-store'
import { Card } from '../../../shared/ui/card'
import { MetricsOverview } from '../../metrics-overview/ui/metrics-overview'
import { OrderTable } from '../../order-table/ui/order-table'
import { useEffect } from 'react'

export function AdminShell() {
  const {
    data: categories = [],
    isLoading,
    isError,
  } = useCatalogCategories()
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const activeCategoryId = useUiStore((state) => state.activeCategoryId)
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const setActivePrototypeId = useUiStore((state) => state.setActivePrototypeId)

  const selectedCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0]
  const fallbackCategoryId =
    categories.find((category) => category.id !== activeCategoryId)?.id

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

  const entryActionButtonClassName =
    'inline-flex size-9 items-center justify-center rounded-xl border transition-all duration-200'
  const entryActionGhostButtonClassName =
    `${entryActionButtonClassName} border-white/10 bg-white/5 text-slate-400 hover:border-white/15 hover:bg-white/8 hover:text-white`
  const entryActionBrandButtonClassName =
    `${entryActionButtonClassName} border-brand-border bg-brand-glass text-brand-primary shadow-[0_10px_30px_rgba(16,185,129,0.12)] hover:border-brand-border hover:bg-brand-glass/80 hover:text-white`

  return (
    <div className="pb-4">
      <div className="grid min-h-[calc(100vh-8rem)] gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[28px]">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full p-5">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/70">
                    categories
                  </p>
                  <h1 className="mt-2 text-xl font-semibold text-white">
                    Prototype Sidebar
                  </h1>
                </div>
                <div className="rounded-2xl border border-brand-border bg-brand-glass p-2.5 text-brand-primary">
                  <UserRoundPlus className="size-5" />
                </div>
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
                      className={`flex w-full items-center gap-3 rounded-[18px] px-3.5 py-2.5 text-left transition ${
                        isActive
                          ? 'bg-white text-slate-950'
                          : 'bg-white/4 text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <Icon className="size-4" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                      </div>
                      <span className="rounded-full bg-slate-950/10 px-2 py-0.5 text-xs">
                        {item.prototypes.length}
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                <p className="text-sm text-slate-400">현재 선택</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedCategory?.title}</p>
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

        <div className="flex flex-col min-w-0 min-h-0">
          {isError ? (
            <Card className="mb-4 rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              카테고리 데이터를 불러오지 못했습니다. 서버(`:3000`) 상태를 확인하세요.
            </Card>
          ) : null}

          {selectedCategory ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Category Detail Header */}
              <Card className="rounded-[28px] p-7 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {selectedCategory.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-2xl">
                      {selectedCategory.summary}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedCategory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/5 bg-slate-950/50 px-3 py-1 text-[11px] text-slate-300 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <EditCategoryDialog category={selectedCategory} asIcon />
                    <DeleteCategoryButton
                      categoryId={selectedCategory.id}
                      fallbackCategoryId={fallbackCategoryId}
                      asIcon
                    />
                  </div>
                </div>
              </Card>

              {/* Prototype Timeline List */}
              <Card className="rounded-[28px] p-7 flex-1 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-300 font-medium">
                    <GitBranch className="size-4 text-brand-primary" />
                    <span className="text-[11px] uppercase tracking-widest">Prototype Entries</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-full border border-white/5 bg-white/4 px-3 py-1 text-[11px] text-slate-400 uppercase tracking-tighter">
                      {selectedCategory.prototypes.length} prototypes
                    </div>
                    <AddPrototypeDialog
                      categoryId={selectedCategory.id}
                      categoryTitle={selectedCategory.title}
                      asIcon
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedCategory.prototypes.length > 0 ? (
                    selectedCategory.prototypes.map((proto) => (
                      <div
                        key={proto.id}
                        className="relative pl-7 border-l border-white/10 py-1 transition-all hover:border-brand-primary/30 group"
                      >
                        <div className="absolute left-[-5px] top-3 size-2 rounded-full bg-white/20 border border-slate-950 group-hover:bg-brand-primary transition-colors" />
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <div className="flex items-center gap-3 mb-1.5">
                              <h3 className="text-base font-semibold text-white tracking-tight">
                                {proto.title}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(proto.updatedAt).toLocaleDateString()}
                              </span>
                              <span className="rounded-full bg-brand-glass px-2 py-0.5 text-[10px] uppercase text-brand-primary font-bold border border-brand-border">
                                {proto.status}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400 max-w-2xl">
                              {proto.summary}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(selectedCategory.userId === currentUserId || userRole === 'admin') && (
                              <>
                                <EditPrototypeDialog
                                  categoryId={selectedCategory.id}
                                  prototype={proto}
                                  asIcon
                                />
                                <DeletePrototypeButton
                                  categoryId={selectedCategory.id}
                                  prototypeId={proto.id}
                                  asIcon
                                />
                              </>
                            )}
                             <button
                               onClick={() => {
                                 setActivePrototypeId(proto.id)
                                 setActiveSection('docu')
                                 window.scrollTo({ top: 0, behavior: 'smooth' })
                               }}
                               className={entryActionBrandButtonClassName}
                               title="문서 보기"
                               aria-label="문서 보기"
                             >
                               <FileText className="size-4" />
                             </button>
                             <a
                               href={proto.repoUrl}
                               target="_blank"
                               rel="noreferrer"
                               className={entryActionGhostButtonClassName}
                               title="GitHub 열기"
                               aria-label="GitHub 열기"
                             >
                               <GithubIcon className="size-4" />
                             </a>
                             {proto.figmaUrl && (
                               <a
                                 href={proto.figmaUrl}
                                 target="_blank"
                                 rel="noreferrer"
                                 className={entryActionGhostButtonClassName}
                                 title="Figma 열기"
                                 aria-label="Figma 열기"
                               >
                                 <FigmaIcon className="size-4" />
                               </a>
                             )}
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center rounded-3xl border border-dashed border-white/5 bg-white/2">
                      <p className="text-sm text-slate-500">등록된 프로토타입이 없습니다.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-[32px] border border-white/5 bg-white/4 p-10 flex flex-col items-center">
                <GitBranch className="size-12 text-brand-primary/40 mb-6" />
                <h2 className="text-xl font-semibold text-white mb-2">시작할 카테고리를 선택하세요</h2>
                <p className="text-sm text-slate-400 text-center max-w-xs">
                  왼쪽 사이드바에서 기존 카테고리를 선택하거나,<br />새로운 패턴 카테고리를 추가하여 작업을 시작하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
