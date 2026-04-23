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

import { AddCategoryDialog } from '../../../features/category-management/ui/add-category-dialog'
import { useReorderCategories } from '../../../shared/api/catalog'
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
  isAuthenticated: boolean
  isLoading: boolean
  onCategoriesReorder: (categories: ScenarioCategory[]) => void
  onSelectCategory: (categoryId: string) => void
}

export function AdminShellSidebar({
  activeCategoryId,
  categories,
  isAuthenticated,
  isLoading,
  onCategoriesReorder,
  onSelectCategory,
}: AdminShellSidebarProps) {
  const reorderCategories = useReorderCategories()
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
    const nextCategories = arrayMove(categories, oldIndex, newIndex)

    onCategoriesReorder(nextCategories)
    reorderCategories.mutate(nextCategories.map((category) => category.id))
  }

  return (
    <div className="ui-panel overflow-hidden border-none bg-surface-muted/20 shadow-none">
      <ScrollArea.Root className="relative h-full">
        <ScrollArea.Viewport className="h-full">
          <div className="px-4 py-4">
            <div className="mx-auto w-full max-w-[212px]">
              {isAuthenticated ? (
                <div className="mb-3">
                  <AddCategoryDialog />
                </div>
              ) : null}

              <nav className="space-y-2">
                {isLoading ? (
                  <div className="rounded-xl border border-surface-border-soft bg-surface-muted px-4 py-8 text-center text-xs font-bold text-text-muted">
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
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <SortableCategoryItem
                            key={category.id}
                            item={category}
                            isActive={activeCategoryId === category.id}
                            onSelect={() => onSelectCategory(category.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => {
                      const Icon = iconMap[category.iconKey] ?? Package

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => onSelectCategory(category.id)}
                          className={`group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-md border px-4 transition-all duration-200 ${
                            activeCategoryId === category.id
                              ? 'border-brand-border/50 bg-brand-glass text-brand-primary shadow-sm'
                              : 'border-transparent text-text-muted hover:bg-surface-muted/50 hover:text-text-primary'
                          }`}
                        >
                          {activeCategoryId === category.id ? (
                            <div className="absolute left-0 top-[15%] h-[70%] w-1 rounded-r-full bg-brand-primary" />
                          ) : null}
                          <div className="shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1 truncate text-sm font-medium">
                            {category.title}
                          </div>
                          <span
                            className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-black ${
                              activeCategoryId === category.id
                                ? 'bg-brand-primary text-text-on-brand'
                                : 'border border-surface-border-soft/50 bg-surface-muted text-text-muted'
                            }`}
                          >
                            {category.prototypes.length}
                          </span>
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
          className="absolute bottom-4 right-4 top-4 flex w-1.5 touch-none select-none bg-transparent"
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
  onSelect: () => void
}

function SortableCategoryItem({
  item,
  isActive,
  onSelect,
}: SortableCategoryItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-md border transition-all duration-200 ${
        isActive
          ? 'translate-x-0.5 border-brand-border/50 bg-brand-glass text-brand-primary shadow-sm'
          : 'border-transparent text-text-muted hover:bg-surface-muted/50 hover:text-text-primary'
      }`}
    >
      {isActive ? (
        <div className="absolute left-0 top-[15%] h-[70%] w-1 rounded-r-full bg-brand-primary" />
      ) : null}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={`flex h-full w-9 shrink-0 cursor-grab items-center justify-center transition-colors active:cursor-grabbing ${
          isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex h-full min-w-0 flex-1 items-center gap-3 pr-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-sm transition-all ${
              isActive ? 'font-black tracking-tight' : 'font-medium'
            }`}
          >
            {item.title}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-black transition-colors ${
            isActive
              ? 'bg-brand-primary text-text-on-brand'
              : 'border border-surface-border-soft/50 bg-surface-muted text-text-muted'
          }`}
        >
          {item.prototypes.length}
        </span>
      </button>
    </div>
  )
}
