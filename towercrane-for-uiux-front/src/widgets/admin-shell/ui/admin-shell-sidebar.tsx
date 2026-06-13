import {
  Activity,
  Blocks,
  ChartColumnBig,
  FolderPlus,
  FormInput,
  Gauge,
  GripVertical,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MoreVertical,
  MousePointerClick,
  Move3D,
  Package,
  PanelLeft,
  Plus,
  Radio,
  Search,
  Shield,
  Sparkles,
  TableProperties,
  TriangleAlert,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'
import { DeleteCategoryButton } from '../../../features/category-management/ui/delete-category-button'
import { EditCategoryDialog } from '../../../features/category-management/ui/edit-category-dialog'
import {
  useReorderCategories,
  useReorderWorkspaceCategories,
} from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'

const iconMap: Record<string, LucideIcon> = {
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
}

type AdminShellSidebarProps = {
  activeCategoryId: string | null
  categories: ScenarioCategory[]
  workspaceId?: string
  isAuthenticated: boolean
  isLoading: boolean
  onCategoriesReorder: (categories: ScenarioCategory[]) => void
  onSelectCategory: (categoryId: string) => void
}

export function AdminShellSidebar({
  activeCategoryId,
  categories,
  workspaceId,
  isAuthenticated,
  isLoading,
  onCategoriesReorder,
  onSelectCategory,
}: AdminShellSidebarProps) {
  const reorderCategories = useReorderCategories()
  const reorderWorkspaceCategories = useReorderWorkspaceCategories(workspaceId ?? '')
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((category) => category.id === active.id)
    const newIndex = categories.findIndex((category) => category.id === over.id)
    const prevCategories = categories
    const nextCategories = arrayMove(categories, oldIndex, newIndex)

    onCategoriesReorder(nextCategories)
    const onError = () => {
      onCategoriesReorder(prevCategories)
      toast.error('순서 저장에 실패했어요. 다시 시도해 주세요.')
    }
    const onSuccess = () => {
      toast.success('카테고리 순서가 저장됐어요')
    }

    if (workspaceId) {
      reorderWorkspaceCategories.mutate(
        nextCategories.map((category, idx) => ({
          id: category.id,
          orderIdx: idx,
        })),
        { onSuccess, onError },
      )
      return
    }

    reorderCategories.mutate(nextCategories.map((category) => category.id), {
      onSuccess: () => {
        toast.success('카테고리 순서가 저장됐어요')
      },
      onError: () => {
        onCategoriesReorder(prevCategories)
        toast.error('순서 저장에 실패했어요. 다시 시도해 주세요.')
      },
    })
  }

  return (
    <div className="ui-panel overflow-hidden border-brand-border/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_5%,var(--card))_0%,var(--card)_9rem)] shadow-[0_14px_40px_color-mix(in_srgb,var(--primary)_5%,transparent)]">
      <ScrollArea.Root className="relative h-full">
        <ScrollArea.Viewport className="h-full">
          <div className="px-3 py-3">
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-primary">
                    Library
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-text-primary">
                    카테고리
                  </div>
                </div>
                <div className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-[10px] font-black text-text-muted">
                  {categories.length}
                </div>
              </div>

              {isAuthenticated ? (
                <div className="mb-2">
                  <AddCategoryDialog workspaceId={workspaceId}>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-md border border-surface-border-soft bg-surface-raised/70 px-3 text-xs font-bold text-text-secondary shadow-sm transition-all hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
                    >
                      <span>새 카테고리</span>
                      <Plus className="size-4" />
                    </button>
                  </AddCategoryDialog>
                </div>
              ) : null}

              <nav className="space-y-1">
                {isLoading ? (
                  <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-6 text-center text-xs font-bold text-text-muted">
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
                      items={categories.map((category) => category.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {categories.map((category) => (
                          <SortableCategoryItem
                            key={category.id}
                            item={category}
                            workspaceId={workspaceId}
                            isActive={activeCategoryId === category.id}
                            onSelect={() => onSelectCategory(category.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const Icon = iconMap[category.iconKey] ?? Package

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => onSelectCategory(category.id)}
                          className={`group relative flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-md border px-3 transition-all duration-200 ${
                            activeCategoryId === category.id
                              ? 'border-brand-border bg-brand-glass text-text-primary shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_10%,transparent)] before:absolute before:left-0 before:top-2 before:h-7 before:w-1 before:rounded-r-sm before:bg-brand-primary'
                              : 'border-transparent text-text-muted hover:border-surface-border-soft hover:bg-surface-muted/60 hover:text-text-primary'
                          }`}
                        >
                          <div className="shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1 truncate text-left">
                            <div className="truncate text-sm font-bold">{category.title}</div>
                            <div className="truncate text-[10px] ui-text-muted opacity-70">
                              {category.summary}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </nav>
            </div>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="absolute bottom-3 right-2 top-3 flex w-1.5 touch-none select-none bg-transparent"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-surface-border" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}

type SortableCategoryItemProps = {
  isActive: boolean
  item: ScenarioCategory
  workspaceId?: string
  onSelect: () => void
}

function SortableCategoryItem({
  item,
  workspaceId,
  isActive,
  onSelect,
}: SortableCategoryItemProps) {
  const Icon = iconMap[item.iconKey] ?? Package
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    opacity: isDragging ? 0.5 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  useEffect(() => {
    if (!actionsOpen) return

    const closeActions = (event: MouseEvent) => {
      if (actionsRef.current?.contains(event.target as Node)) return
      setActionsOpen(false)
    }

    window.addEventListener('click', closeActions)
    return () => window.removeEventListener('click', closeActions)
  }, [actionsOpen])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex h-11 w-full items-center gap-1.5 rounded-md border transition-all duration-200 ${
        isActive
          ? 'border-brand-border bg-brand-glass text-text-primary shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_10%,transparent)] before:absolute before:left-0 before:top-2 before:h-7 before:w-1 before:rounded-r-sm before:bg-brand-primary'
          : 'border-transparent text-text-muted hover:border-surface-border-soft hover:bg-surface-muted/60 hover:text-text-primary'
      }`}
    >
      <div className="flex items-center gap-1 pl-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded-sm transition-colors active:cursor-grabbing ${
            isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="flex h-full min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
      >
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-all ${
          isActive
            ? 'border-brand-border bg-surface-raised text-brand-primary'
            : 'border-surface-border-soft bg-surface-muted text-text-muted group-hover:text-text-primary'
        }`}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[13px] leading-tight transition-all ${
              isActive ? 'font-black text-text-primary' : 'font-semibold'
            }`}
          >
            {item.title}
          </div>
          <div className="mt-0.5 truncate text-[10px] font-medium leading-tight text-text-muted">
            {item.summary}
          </div>
        </div>
      </button>

      <div
        ref={actionsRef}
        className="relative shrink-0 pr-2"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={`flex size-7 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised text-text-secondary shadow-sm transition-all hover:border-surface-border hover:bg-surface-muted hover:text-text-primary ${
            actionsOpen || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={`${item.title} 카테고리 작업`}
          aria-expanded={actionsOpen}
          onClick={() => setActionsOpen((open) => !open)}
        >
          <MoreVertical className="size-3.5" />
        </button>

        {actionsOpen ? (
          <div className="absolute right-2 top-[calc(100%+0.35rem)] z-50 flex items-center gap-1 rounded-md border border-surface-border bg-surface-raised p-1 shadow-2xl">
            <EditCategoryDialog category={item} asIcon size="sm-icon" />
            <DeleteCategoryButton
              categoryId={item.id}
              workspaceId={workspaceId}
              asIcon
              size="sm-icon"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
