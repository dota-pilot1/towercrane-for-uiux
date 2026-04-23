import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
  Activity,
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
  GripVertical,
} from 'lucide-react'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'

import { DeleteCategoryButton } from '../../../features/category-management/ui/delete-category-button'
import { EditCategoryDialog } from '../../../features/category-management/ui/edit-category-dialog'
import { AddPrototypeDialog } from '../../../features/prototype-management/ui/add-prototype-dialog'
import { EditPrototypeDialog } from '../../../features/prototype-management/ui/edit-prototype-dialog'
import { DeletePrototypeButton } from '../../../features/prototype-management/ui/delete-prototype-button'
import {
  useCatalogCategories,
  useCategoryPrototypes,
  useReorderCategories,
  type PrototypeListSort,
} from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { useSessionStore } from '../../../shared/store/session-store'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Card } from '../../../shared/ui/card'
import { Select } from '../../../shared/ui/select'
import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import {
  PrototypeDetailDialog,
  PrototypeDetailPage,
} from '../../../features/prototype-review/ui/prototype-detail-page'

export function AdminShell() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const reorderCategories = useReorderCategories()
  const {
    data: fetchedCategories = [],
    isLoading,
    isError,
  } = useCatalogCategories()
  
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (fetchedCategories.length > 0 && categories.length === 0) {
      setCategories(fetchedCategories)
    } else if (fetchedCategories.length > 0) {
      // Sync only if IDs changed or data refreshed and not dragging
      setCategories(fetchedCategories)
    }
  }, [fetchedCategories])

  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
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
    <div className="pb-8 bg-background">
      <div className="grid min-h-[calc(100vh-6rem)] gap-3 lg:grid-cols-[250px_minmax(0,1fr)] max-w-[1600px] mx-auto px-4">
        <div className="ui-panel overflow-hidden border-none shadow-none bg-muted/30">
          <ScrollArea.Root className="h-full">
            <ScrollArea.Viewport className="h-full p-4">
              {isAuthenticated && (
                <div className="mb-4">
                  <AddCategoryDialog />
                </div>
              )}

              <nav className="space-y-1.5">
                {isLoading ? (
                  <div className="rounded-xl border border-border/40 bg-background/50 px-4 py-8 text-xs font-bold text-muted-foreground/60 text-center">
                    데이터를 가져오는 중...
                  </div>
                ) : null}

                {isAuthenticated ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={categories.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <nav className="space-y-1">
                        {categories.map((item) => (
                          <SortableCategoryItem
                            key={item.id}
                            item={item}
                            isActive={activeCategoryId === item.id}
                            icon={iconMap[item.iconKey] || Package}
                            onSelect={() => setActiveCategory(item.id)}
                            isSortable={true}
                          />
                        ))}
                      </nav>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {categories.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveCategory(item.id)}
                        className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-sm border transition-all duration-200 px-2.5 py-1.5 ${
                          activeCategoryId === item.id
                            ? 'bg-brand-glass text-brand-primary border-brand-border/50 shadow-sm'
                            : 'border-transparent text-text-muted hover:bg-surface-muted/50 hover:text-text-primary'
                        }`}
                      >
                        {activeCategoryId === item.id && (
                          <div className="absolute left-0 top-[15%] h-[70%] w-1 rounded-r-full bg-brand-primary" />
                        )}
                        <div className="shrink-0">
                          {(() => {
                            const IconComp = iconMap[item.iconKey as keyof typeof iconMap] || Package
                            return <IconComp className="size-4" />
                          })()}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item.title}
                        </div>
                        <span className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-black ${
                          activeCategoryId === item.id ? 'bg-brand-primary text-text-on-brand' : 'bg-surface-muted text-text-muted border border-surface-border-soft/50'
                        }`}>
                          {item.prototypes.length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </nav>

            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="flex w-2 touch-none select-none bg-transparent p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-surface-muted" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>

        <div className="flex flex-col min-w-0 min-h-0">
          {isError ? (
            <Card className="mb-1.5 rounded-sm border border-danger-border bg-danger-glass p-2 text-xs text-danger-500">
              카테고리 데이터를 불러오지 못했습니다. 서버(`:3000`) 상태를 확인하세요.
            </Card>
          ) : null}

          {selectedCategory ? (
            <div className="flex flex-1 min-h-0 flex-col gap-2">
              {activePrototype ? (
                <PrototypeDetailPage
                  prototype={activePrototype}
                  canManagePrototype={
                    selectedCategory.userId === currentUserId || userRole === 'admin'
                  }
                  onBack={() => setActivePrototypeId(null)}
                />
              ) : (
                <>
              {/* Category Detail Header */}
              <div className="ui-panel p-3 sm:p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-text-primary text-3xl font-extrabold tracking-tight">
                      {selectedCategory.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                      {selectedCategory.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-brand-primary font-bold">
                      {selectedCategory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-brand-glass border border-brand-border/50 px-3 py-1 text-[11px] font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isAuthenticated && (
                    <div className="flex gap-2">
                      <EditCategoryDialog category={selectedCategory} asIcon />
                      <DeleteCategoryButton
                        categoryId={selectedCategory.id}
                        fallbackCategoryId={fallbackCategoryId}
                        asIcon
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Prototype Timeline List */}
              <div className="ui-panel flex-1 min-h-0 overflow-y-auto p-4">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-sm bg-primary/5 text-primary">
                      <GitBranch className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                        Infrastructure
                      </h3>
                      <div className="text-[10px] font-black underline decoration-primary underline-offset-4 text-primary">
                        PROTOTYPE LIBRARY
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black text-text-muted bg-surface-muted border border-surface-border-soft px-2.5 py-1 rounded-sm">
                      {totalCount} Items
                    </div>
                    {isAuthenticated && (
                      <AddPrototypeDialog
                        categoryId={selectedCategory.id}
                        categoryTitle={selectedCategory.title}
                        asIcon
                      />
                    )}
                  </div>
                </div>

                {/* Search + sort bar */}
                <div className="mb-3 flex items-center gap-2">
                  <form
                    className="relative flex-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setPage(1)
                      setSearch(searchInput)
                    }}
                  >
                    <Search className="ui-text-muted absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2" />
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
                      className="ui-input h-8 w-full rounded-sm border pl-11 pr-3 text-[12px] leading-none outline-none focus:border-brand-border"
                    />
                  </form>
                  <Select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as PrototypeListSort)
                      setPage(1)
                    }}
                    className="h-8 min-w-[100px] rounded-sm px-2 text-[12px] focus:border-brand-border focus:ring-brand-border/30"
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
                              <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase text-brand-primary">
                                {proto.status}
                              </span>
                              {proto.reviewCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-sm border border-[color:color-mix(in_srgb,var(--brand-500)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-glass)_80%,transparent)] px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                                  <Star className="size-3 fill-brand-primary text-brand-primary" />
                                  {proto.avgRating.toFixed(1)}
                                  <span className="font-normal text-brand-primary/60">
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
                                    className="rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium ui-text-secondary"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {isAuthenticated && (selectedCategory.userId === currentUserId || userRole === 'admin') && (
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
                    <div className="rounded-sm border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)] py-10 text-center">
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
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--surface-border-soft)] pt-3.5">
                    <div className="ui-text-muted text-[11px] uppercase tracking-widest">
                      Page {page} / {totalPages} · {totalCount} total
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || prototypesQuery.isFetching}
                        className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
                        aria-label="이전 페이지"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || prototypesQuery.isFetching}
                        className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] disabled:pointer-events-none disabled:opacity-40"
                        aria-label="다음 페이지"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col items-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-10">
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id)
      const newIndex = categories.findIndex((c) => c.id === over.id)
      const newOrder = arrayMove(categories, oldIndex, newIndex)
      
      // Update local state first
      setCategories(newOrder)

      // Update DB
      reorderCategories.mutate(newOrder.map((c) => c.id))
    }
  }
}

function SortableCategoryItem({
  item,
  isActive,
  icon: Icon,
  onSelect,
}: {
  item: any
  isActive: boolean
  icon: any
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-sm border transition-all duration-200 ${
        isActive
          ? 'bg-brand-glass text-brand-primary border-brand-border/50 shadow-sm translate-x-0.5'
          : 'border-transparent text-text-muted hover:bg-surface-muted/50 hover:text-text-primary'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-[15%] h-[70%] w-1 rounded-r-full bg-brand-primary" />
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={`flex h-10 w-8 shrink-0 cursor-grab items-center justify-center transition-colors active:cursor-grabbing ${
          isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <GripVertical className="size-3.5" />
      </button>
      
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm transition-all ${isActive ? 'font-black tracking-tight' : 'font-medium'}`}>
            {item.title}
          </div>
        </div>
        <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-black transition-colors ${
          isActive ? 'bg-brand-primary text-text-on-brand' : 'bg-surface-muted text-text-muted border border-surface-border-soft/50'
        }`}>
          {item.prototypes.length}
        </span>
      </button>
    </div>
  )
}
