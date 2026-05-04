import { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { 
  LayoutGrid, Plus, Trash2, Save, FilePlus,
  Settings2, ShieldAlert, GripVertical,
  ChevronDown, ChevronRight, MoveRight, X
} from 'lucide-react'
import { useMenus, useCreateMenu, useUpdateMenu, useDeleteMenu } from '../../../entities/menu/api/menu-api'
import { buildTree } from '../../../entities/menu/lib/build-tree'
import type { MenuItem, MenuRecord } from '../../../entities/menu/model/types'
import { toast } from 'sonner'
import { 
  DndContext, 
  pointerWithin, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function MenuAdminPage() {
  const { data: flatMenus = [], isLoading } = useMenus()
  const createMutation = useCreateMenu()
  const updateMutation = useUpdateMenu()
  const deleteMutation = useDeleteMenu()

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  
  const menuTree = useMemo(() => {
    return buildTree(flatMenus, 'admin')
  }, [flatMenus])

  const selectedMenu = flatMenus.find(m => m.id === selectedMenuId) || null

  const handleCreateRoot = () => {
    createMutation.mutate({
      name: '새 메뉴',
      displayOrder: flatMenus.length,
    }, {
      onSuccess: (data) => setSelectedMenuId(data.id)
    })
  }

  const handleCreateChild = (parentId: string) => {
    const childrenCount = flatMenus.filter(m => m.parentId === parentId).length
    createMutation.mutate({
      name: '새 하위 메뉴',
      parentId,
      displayOrder: childrenCount,
    }, {
      onSuccess: (data) => setSelectedMenuId(data.id)
    })
  }

  const handleMoveMenu = (menu: MenuRecord, nextParentId: string | null) => {
    if (menu.parentId === nextParentId) return

    const displayOrder = flatMenus.filter(
      (m) => m.id !== menu.id && m.parentId === nextParentId
    ).length

    updateMutation.mutate({
      id: menu.id,
      parentId: nextParentId,
      displayOrder,
    }, {
      onSuccess: () => toast.success('메뉴 소속이 변경되었습니다.')
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('이 메뉴를 삭제하시겠습니까? 하위 메뉴도 함께 삭제될 수 있습니다.')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('메뉴가 삭제되었습니다.')
          if (selectedMenuId === id) setSelectedMenuId(null)
        }
      })
    }
  }

  // Set up DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeMenu = flatMenus.find(m => m.id === active.id);
    const overMenu = flatMenus.find(m => m.id === over.id);

    // Allow sorting only within the same parent
    if (activeMenu && overMenu && activeMenu.parentId === overMenu.parentId) {
      const siblings = flatMenus
        .filter(m => m.parentId === activeMenu.parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      
      const oldIndex = siblings.findIndex(m => m.id === active.id);
      const newIndex = siblings.findIndex(m => m.id === over.id);
      
      const newSiblings = arrayMove(siblings, oldIndex, newIndex);
      
      // Update the display orders in the backend
      let hasChanges = false;
      newSiblings.forEach((m, idx) => {
        if (m.displayOrder !== idx) {
          hasChanges = true;
          // Fire mutation for each changed item
          updateMutation.mutate({ id: m.id, displayOrder: idx });
        }
      });
      if (hasChanges) {
        toast.success('메뉴 순서가 변경되었습니다.');
      }
    }
  }

  const renderTree = (items: MenuItem[], level = 0) => {
    return (
      <SortableContext 
        items={items.map(i => i.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col w-full">
          {items.map((item) => (
            <SortableTreeItem 
              key={item.id} 
              item={item} 
              level={level} 
              isSelected={selectedMenuId === item.id}
              onSelect={() => setSelectedMenuId(item.id)}
              onAddChild={() => handleCreateChild(item.id)}
              onDelete={() => handleDelete(item.id)}
              renderChildren={() => item.children.length > 0 ? renderTree(item.children, level + 1) : null}
            />
          ))}
        </div>
      </SortableContext>
    )
  }

  return (
    <Card className="rounded-xl p-0 overflow-hidden border border-surface-border shadow-sm">
      <div className="flex items-center gap-4 p-6 border-b border-surface-border bg-surface-muted/30">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-inner">
          <LayoutGrid className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold ui-text-primary tracking-tight">메뉴 관리</h2>
          <p className="text-[13px] ui-text-secondary mt-0.5">헤더 메뉴를 추가·수정·삭제하고 드래그로 순서를 변경합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Tree Sidebar */}
        <div className="lg:col-span-4 lg:border-r border-surface-border bg-surface-muted/20 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-xs font-black uppercase tracking-widest ui-text-secondary">메뉴 트리</h3>
            <button 
              onClick={handleCreateRoot}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary bg-brand-glass hover:bg-brand-primary hover:text-primary-foreground px-2 py-1.5 rounded-md transition-colors shadow-sm"
            >
              <Plus className="size-3" /> 루트 추가
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background border border-surface-border-soft rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="size-5 border-2 border-surface-border border-t-brand-primary rounded-full animate-spin" />
              </div>
            ) : flatMenus.length === 0 ? (
              <div className="text-center py-10 px-4">
                <LayoutGrid className="size-10 mx-auto mb-3 ui-text-muted opacity-50" />
                <p className="text-sm ui-text-secondary">생성된 메뉴가 없습니다.</p>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragEnd={handleDragEnd}
              >
                {renderTree(menuTree)}
              </DndContext>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-8 bg-surface-muted/5 p-6 lg:p-12 relative">
          {selectedMenu ? (
            <MenuEditor 
              key={`${selectedMenu.id}:${selectedMenu.updatedAt}`}
              menu={selectedMenu} 
              allMenus={flatMenus}
              onMove={(nextParentId) => handleMoveMenu(selectedMenu, nextParentId)}
              onSave={(data) => {
                updateMutation.mutate({ id: selectedMenu.id, ...data }, {
                  onSuccess: () => toast.success('성공적으로 저장되었습니다.')
                })
              }} 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center ui-text-muted pointer-events-none">
              <Settings2 className="size-32 opacity-[0.03] mb-6" />
              <p className="text-sm font-medium opacity-60">왼쪽 메뉴 트리에서 수정할 항목을 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// Separate component for sortable items
function SortableTreeItem({ 
  item, 
  level, 
  isSelected, 
  onSelect, 
  onAddChild, 
  onDelete,
  renderChildren
}: { 
  item: MenuItem; 
  level: number; 
  isSelected: boolean; 
  onSelect: () => void; 
  onAddChild: () => void; 
  onDelete: () => void;
  renderChildren: () => React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const hasChildren = item.children.length > 0;
  const dotOpacity = ['opacity-100', 'opacity-80', 'opacity-60', 'opacity-50', 'opacity-40'][level % 5];

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col w-full relative">
      <div 
        className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-surface-border-soft transition-colors ${
          isSelected 
            ? 'bg-brand-glass/50' 
            : isDragging 
              ? 'bg-surface-raised shadow-md'
              : 'bg-transparent hover:bg-surface-muted/30'
        }`}
        style={{ paddingLeft: `${(level * 0.95) + 0.5}rem` }}
        onClick={onSelect}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners} 
            className="shrink-0 -ml-0.5 p-0.5 rounded ui-text-muted hover:ui-text-primary cursor-grab active:cursor-grabbing transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-3.5" />
          </div>

          <div className="flex items-center gap-1 min-w-0 flex-1">
            {hasChildren ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="flex size-5 items-center justify-center rounded ui-text-secondary hover:text-brand-primary hover:bg-surface-muted transition-colors shrink-0"
              >
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : (
              <div className="size-5 shrink-0" />
            )}
            <div className={`size-1.5 rounded-full bg-brand-primary ${dotOpacity} shrink-0`} />
            <span className={`text-[13px] truncate ${isSelected ? 'font-bold text-brand-primary' : 'font-medium ui-text-primary'}`}>
              {item.name}
            </span>
          </div>
          
          <div className="flex gap-1.5 shrink-0 ml-1">
            {!item.isVisible && (
              <span className="text-[9px] bg-surface-muted px-1.5 py-0.5 rounded-sm ui-text-secondary font-medium tracking-wider uppercase">
                Hidden
              </span>
            )}
            {item.requiredRole === 'admin' && (
              <span className="text-[9px] bg-danger-glass text-[var(--destructive)] px-1.5 py-0.5 rounded-sm font-medium tracking-wider uppercase">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddChild(); }}
              className="flex size-6 items-center justify-center rounded text-surface-border hover:text-brand-primary transition-colors"
              title="하위 메뉴 추가"
            >
              <FilePlus className="size-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex size-6 items-center justify-center rounded text-surface-border hover:text-[var(--destructive)] transition-colors"
              title="삭제"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && renderChildren()}
    </div>
  )
}

function MenuEditor({
  menu,
  allMenus,
  onMove,
  onSave,
}: {
  menu: MenuRecord
  allMenus: MenuRecord[]
  onMove: (parentId: string | null) => void
  onSave: (data: Partial<MenuRecord>) => void
}) {
  const [formData, setFormData] = useState<Partial<MenuRecord>>({
    name: menu.name,
    sectionId: menu.sectionId || '',
    icon: menu.icon || '',
    isVisible: menu.isVisible,
    requiredRole: menu.requiredRole || '',
    displayOrder: menu.displayOrder,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      sectionId: formData.sectionId === '' ? null : formData.sectionId,
      icon: formData.icon === '' ? null : formData.icon,
      requiredRole: formData.requiredRole === '' ? null : formData.requiredRole,
      displayOrder: Number(formData.displayOrder),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold ui-text-primary tracking-tight">{formData.name || '메뉴 편집'}</h3>
          <p className="text-sm ui-text-secondary mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] bg-surface-muted px-1.5 py-0.5 rounded text-brand-primary">{menu.id}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MoveMenuDialog menu={menu} allMenus={allMenus} onMove={onMove} />
          <Button type="submit" className="min-w-[120px] shadow-sm flex items-center justify-center h-10 px-4">
            <Save className="size-4 mr-2 shrink-0" /> 
            <span className="font-semibold">변경사항 저장</span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-8 flex-1">
        {/* Basic Settings */}
        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] ui-text-secondary flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-brand-primary" />
            Basic Configuration
          </h4>
          <div className="ui-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold ui-text-primary">메뉴 표시 이름</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name || ''} 
                onChange={handleChange} 
                className="ui-input shadow-sm" 
                required 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold ui-text-primary">아이콘 이름 <span className="text-[10px] font-normal ui-text-muted ml-1">(Lucide)</span></label>
              <input 
                type="text" 
                name="icon" 
                value={formData.icon || ''} 
                onChange={handleChange} 
                className="ui-input shadow-sm" 
                placeholder="ex: GitBranch, LayoutGrid" 
              />
            </div>
          </div>
        </section>

        {/* Routing & Order */}
        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] ui-text-secondary flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-brand-primary" />
            Navigation & Layout
          </h4>
          <div className="ui-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold ui-text-primary">Section ID <span className="text-[10px] font-normal ui-text-muted ml-1">(SPA State)</span></label>
              <input 
                type="text" 
                name="sectionId" 
                value={formData.sectionId || ''} 
                onChange={handleChange} 
                className="ui-input shadow-sm font-mono text-xs" 
                placeholder="ex: prototype, users" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold ui-text-primary">정렬 순서</label>
              <input 
                type="number" 
                name="displayOrder" 
                value={formData.displayOrder || 0} 
                onChange={handleChange} 
                className="ui-input shadow-sm" 
              />
              <p className="text-[10px] ui-text-muted">드래그 앤 드롭으로도 자동 변경됩니다.</p>
            </div>
          </div>
        </section>

        {/* Access Control */}
        <section className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] ui-text-secondary flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-brand-primary" />
            Security & Visibility
          </h4>
          
          <div className="ui-panel p-6 flex flex-col gap-6">
            {/* Visibility Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[13px] font-bold ui-text-primary block">헤더에 표시 (Visibility)</label>
                <p className="text-[11px] ui-text-secondary mt-0.5">이 옵션을 끄면 사용자가 메뉴를 볼 수 없습니다.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  name="isVisible" 
                  checked={formData.isVisible} 
                  onChange={handleChange} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--primary-foreground)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--primary-foreground)] after:border-surface-border-soft after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            <div className="h-[1px] bg-surface-border-soft w-full" />

            {/* Required Role Select (Fixed Layout) */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-bold ui-text-primary flex items-center gap-1.5 whitespace-nowrap">
                필요 권한 <ShieldAlert className="size-3 text-[var(--destructive)] shrink-0" />
              </label>
              <p className="text-[11px] ui-text-secondary leading-relaxed">
                특정 역할을 가진 사용자만 메뉴에 접근할 수 있도록 제한합니다.
              </p>
              <select 
                name="requiredRole" 
                value={formData.requiredRole || ''} 
                onChange={handleChange} 
                className="ui-input w-full max-w-xs text-xs font-semibold shadow-sm mt-1"
              >
                <option value="">Public (All Users)</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </form>
  )
}

function MoveMenuDialog({
  menu,
  allMenus,
  onMove,
}: {
  menu: MenuRecord
  allMenus: MenuRecord[]
  onMove: (parentId: string | null) => void
}) {
  const rootValue = '__root__'
  const [open, setOpen] = useState(false)
  const [nextParentValue, setNextParentValue] = useState(menu.parentId ?? rootValue)

  const parentOptions = useMemo(() => {
    const excludedIds = new Set<string>([menu.id])
    let changed = true

    while (changed) {
      changed = false
      allMenus.forEach((item) => {
        if (item.parentId && excludedIds.has(item.parentId) && !excludedIds.has(item.id)) {
          excludedIds.add(item.id)
          changed = true
        }
      })
    }

    const childrenByParent = new Map<string | null, MenuRecord[]>()
    allMenus.forEach((item) => {
      if (excludedIds.has(item.id)) return
      const siblings = childrenByParent.get(item.parentId) ?? []
      siblings.push(item)
      childrenByParent.set(item.parentId, siblings)
    })

    childrenByParent.forEach((siblings) => {
      siblings.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    })

    const rows: Array<{ id: string; name: string; level: number }> = []
    const append = (parentId: string | null, level: number) => {
      ;(childrenByParent.get(parentId) ?? []).forEach((item) => {
        rows.push({ id: item.id, name: item.name, level })
        append(item.id, level + 1)
      })
    }

    append(null, 0)
    return rows
  }, [allMenus, menu.id])

  const currentParentName = allMenus.find((item) => item.id === menu.parentId)?.name ?? '루트'
  const nextParentId = nextParentValue === rootValue ? null : nextParentValue
  const hasChanged = nextParentId !== menu.parentId

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setNextParentValue(menu.parentId ?? rootValue)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!hasChanged) {
      setOpen(false)
      return
    }

    onMove(nextParentId)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" className="h-10 px-4">
          <MoveRight className="size-4 mr-2 shrink-0" />
          <span className="font-semibold">소속 바꾸기</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border-soft p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                소속 바꾸기
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-text-secondary">
                현재 소속: {currentParentName}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button flex size-8 items-center justify-center rounded-sm"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold ui-text-primary">새 상위 메뉴</label>
              <select
                value={nextParentValue}
                onChange={(event) => setNextParentValue(event.target.value)}
                className="ui-input w-full text-sm shadow-sm"
              >
                <option value={rootValue}>루트 메뉴</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {'--'.repeat(option.level)} {option.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] ui-text-muted">
                자기 자신과 하위 메뉴는 상위 메뉴로 선택할 수 없습니다.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  취소
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!hasChanged}>
                소속 변경
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
