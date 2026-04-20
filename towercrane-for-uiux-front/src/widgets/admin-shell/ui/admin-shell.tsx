import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
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
  Workflow,
} from 'lucide-react'
import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'

import { DeleteCategoryButton } from '../../../features/category-management/ui/delete-category-button'
import { EditCategoryDialog } from '../../../features/category-management/ui/edit-category-dialog'
import { AddPrototypeDialog } from '../../../features/prototype-management/ui/add-prototype-dialog'
import { EditPrototypeDialog } from '../../../features/prototype-management/ui/edit-prototype-dialog'
import { DeletePrototypeButton } from '../../../features/prototype-management/ui/delete-prototype-button'
import {
  useCatalogCategories,
  useCategoryPrototypes,
  type PrototypeListSort,
} from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { useSessionStore } from '../../../shared/store/session-store'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Card } from '../../../shared/ui/card'
import { Select } from '../../../shared/ui/select'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import {
  PrototypeDetailDialog,
  PrototypeDetailPage,
} from '../../../features/prototype-review/ui/prototype-detail-dialog'

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
  const activePrototypeId = useUiStore((state) => state.activePrototypeId)
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

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const nextCategoryId = params.get('categoryId')
      const nextPrototypeId =
        params.get('view') === 'prototype-detail' ? params.get('prototypeId') : null

      if (nextCategoryId) {
        setActiveCategory(nextCategoryId)
      }

      setActivePrototypeId(nextPrototypeId)
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)

    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [setActiveCategory, setActivePrototypeId])

  // 검색/페이징/정렬 state
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<PrototypeListSort>('recent')
  const pageSize = 20

  // 카테고리 바뀌면 페이지/검색 초기화
  useEffect(() => {
    setPage(1)
    setSearch('')
    setSearchInput('')
  }, [selectedCategory?.id])

  const prototypesQuery = useCategoryPrototypes(selectedCategory?.id ?? null, {
    page,
    pageSize,
    q: search,
    sort,
  })
  const prototypeList = prototypesQuery.data?.items ?? []
  const totalPages = prototypesQuery.data?.totalPages ?? 1
  const totalCount = prototypesQuery.data?.total ?? 0
  const activePrototypeFromCategory =
    selectedCategory?.prototypes.find((prototype) => prototype.id === activePrototypeId) ?? null
  const activePrototype =
    prototypeList.find((prototype) => prototype.id === activePrototypeId) ??
    (activePrototypeFromCategory
      ? {
          ...activePrototypeFromCategory,
          categoryId: selectedCategory?.id ?? '',
          notes: null,
          tags: [],
          avgRating: 0,
          reviewCount: 0,
          createdAt: activePrototypeFromCategory.updatedAt,
        }
      : null)

  useEffect(() => {
    if (!selectedCategory?.id) return

    const params = new URLSearchParams(window.location.search)
    params.set('categoryId', selectedCategory.id)

    if (activePrototypeId) {
      params.set('view', 'prototype-detail')
      params.set('prototypeId', activePrototypeId)
    } else {
      params.delete('view')
      params.delete('prototypeId')
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', nextUrl)
  }, [activePrototypeId, selectedCategory?.id])

  useEffect(() => {
    if (!activePrototypeId || !selectedCategory) return
    const exists = selectedCategory.prototypes.some((prototype) => prototype.id === activePrototypeId)
    if (!exists) {
      setActivePrototypeId(null)
    }
  }, [activePrototypeId, selectedCategory, setActivePrototypeId])

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
    <div className="pb-4">
      <div className="grid min-h-[calc(100vh-8rem)] gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[16px]">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full p-5">
              <div className="mb-4">
                <AddCategoryDialog />
              </div>

              <nav className="space-y-2">
                {isLoading ? (
                  <div className="rounded-[10px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-6 text-sm ui-text-secondary">
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
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left transition ${
                        isActive
                          ? 'bg-[var(--surface-strong)] ui-text-primary ring-1 ring-brand-border'
                          : 'bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]'
                      }`}
                    >
                      <Icon className="size-4" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                      </div>
                      <span className="rounded-[999px] bg-surface-muted px-2 py-0.5 text-xs">
                        {item.prototypes.length}
                      </span>
                    </button>
                  )
                })}
              </nav>

            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2 touch-none select-none bg-transparent p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-surface-muted" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Card>

        <div className="flex flex-col min-w-0 min-h-0">
          {isError ? (
            <Card className="mb-4 rounded-[14px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              카테고리 데이터를 불러오지 못했습니다. 서버(`:3000`) 상태를 확인하세요.
            </Card>
          ) : null}

          {selectedCategory ? (
            <div className="flex flex-1 min-h-0 flex-col gap-3">
              {activePrototype ? (
                <PrototypeDetailPage
                  prototype={activePrototype}
                  categoryTitle={selectedCategory.title}
                  canManagePrototype={
                    selectedCategory.userId === currentUserId || userRole === 'admin'
                  }
                  onBack={() => setActivePrototypeId(null)}
                />
              ) : (
                <>
              {/* Category Detail Header */}
              <Card className="shrink-0 rounded-[16px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="ui-text-primary text-[2rem] font-bold tracking-tight">
                      {selectedCategory.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed ui-text-secondary">
                      {selectedCategory.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCategory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[999px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] ui-text-secondary font-medium"
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
              <Card className="flex-1 min-h-0 overflow-y-auto rounded-[16px] p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 ui-text-secondary font-medium">
                    <GitBranch className="size-4 text-brand-primary" />
                    <span className="text-[11px] uppercase tracking-widest">Prototype Entries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-9 items-center rounded-[10px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 text-[11px] font-semibold ui-text-secondary uppercase tracking-widest">
                      {totalCount} prototypes
                    </div>
                    <AddPrototypeDialog
                      categoryId={selectedCategory.id}
                      categoryTitle={selectedCategory.title}
                      asIcon
                    />
                  </div>
                </div>

                {/* Search + sort bar */}
                <div className="mb-4 flex items-center gap-2">
                  <form
                    className="relative flex-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setPage(1)
                      setSearch(searchInput)
                    }}
                  >
                    <Search className="ui-text-muted absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return
                        if (e.key === 'Escape') {
                          setSearchInput('')
                          setSearch('')
                          setPage(1)
                        }
                      }}
                      placeholder="제목·요약 검색..."
                      className="ui-input h-9 w-full rounded-[10px] border pl-9 pr-3 text-sm outline-none focus:border-brand-border"
                    />
                  </form>
                  <Select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as PrototypeListSort)
                      setPage(1)
                    }}
                    className="h-9! min-w-[7.5rem] rounded-[10px]! pl-3! pr-9! text-sm focus:border-brand-border focus:ring-emerald-500/15"
                  >
                    <option value="recent">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="title">제목순</option>
                  </Select>
                </div>

                <div className="space-y-5">
                  {prototypesQuery.isLoading ? (
                    <div className="py-12 text-center text-sm text-text-muted">
                      프로토타입 불러오는 중...
                    </div>
                  ) : prototypeList.length > 0 ? (
                    prototypeList.map((proto) => (
                      <div
                        key={proto.id}
                        className="group relative border-l border-[var(--surface-border)] py-1 pl-7 transition-all hover:border-brand-primary/30"
                      >
                        <div className="absolute left-[-5px] top-3 size-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] transition-colors group-hover:bg-brand-primary" />
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <div className="mb-1 flex flex-wrap items-center gap-3">
                              <h3 className="ui-text-primary text-base font-semibold tracking-tight">
                                {proto.title}
                              </h3>
                              <span className="ui-text-muted font-mono text-[10px]">
                                {new Date(proto.updatedAt).toLocaleDateString()}
                              </span>
                              <span className="rounded-[999px] border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase text-brand-primary">
                                {proto.status}
                              </span>
                              {proto.reviewCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-[999px] border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  <Star className="size-3 fill-amber-400 text-amber-400" />
                                  {proto.avgRating.toFixed(1)}
                                  <span className="text-amber-300/60 font-normal">
                                    ({proto.reviewCount})
                                  </span>
                                </span>
                              ) : null}
                            </div>
                            <p className="max-w-2xl text-sm leading-relaxed ui-text-secondary">
                              {proto.summary}
                            </p>
                            {proto.tags.length > 0 ? (
                              <div className="mt-2 flex max-w-2xl flex-wrap gap-1.5">
                                {proto.tags.map((tag) => (
                                  <span
                                    key={`${proto.id}-${tag}`}
                                    className="rounded-[999px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[10px] font-medium ui-text-secondary"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
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
                            <ActionIconButton
                              icon={FileText}
                              onClick={() => {
                                setActivePrototypeId(proto.id)
                                setActiveSection('docu')
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                              title="문서 보기"
                              aria-label="문서 보기"
                            />
                             <PrototypeDetailDialog prototype={proto} />
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)] py-12 text-center">
                      <p className="text-sm ui-text-muted">
                        {search
                          ? `"${search}" 에 해당하는 프로토타입이 없습니다.`
                          : '등록된 프로토타입이 없습니다.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pagination controls */}
                {totalCount > 0 ? (
                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--surface-border-soft)] pt-4">
                    <div className="ui-text-muted text-[11px] uppercase tracking-widest">
                      Page {page} / {totalPages} · {totalCount} total
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || prototypesQuery.isFetching}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
                        aria-label="이전 페이지"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || prototypesQuery.isFetching}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
                        aria-label="다음 페이지"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </Card>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col items-center rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-10">
                <GitBranch className="size-12 text-brand-primary/40 mb-6" />
                <h2 className="mb-2 text-xl font-semibold ui-text-primary">시작할 카테고리를 선택하세요</h2>
                <p className="max-w-xs text-center text-sm ui-text-secondary">
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
