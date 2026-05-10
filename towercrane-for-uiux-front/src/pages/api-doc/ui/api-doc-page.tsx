import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, FileJson, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import type {
  ApiDocCategory,
  ApiDocEndpoint,
  ApiEnvironmentVariable,
} from '../../../entities/api-doc/model/types'
import { Button } from '../../../shared/ui/button'
import { useSessionStore } from '../../../shared/store/session-store'
import {
  useApiDocBlocks,
  useApiDocCategories,
  useApiDocEndpoints,
  useCreateApiDocCategory,
  useCreateApiDocEndpoint,
  useDeleteApiDocCategory,
  useDeleteApiDocEndpoint,
  useReorderApiDocCategories,
  useReorderApiDocEndpoints,
  useReplaceApiDocBlocks,
  useUpdateApiDocCategory,
  useUpdateApiDocEndpoint,
} from '../../../features/api-doc/model/use-api-doc-queries'
import { useApiEnvStore } from '../../../features/api-doc/model/api-env-store'
import { ApiTesterPanel } from '../../../features/api-doc/ui/api-tester-panel'

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: string
  disabled?: boolean
  children: (dragHandleProps: Record<string, unknown>) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

export function ApiDocPage() {
  const userRole = useSessionStore((state) => state.userRole)
  const isAdmin = userRole === 'admin'

  const categoriesQuery = useApiDocCategories()
  const categories = categoriesQuery.data ?? []
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const endpointsQuery = useApiDocEndpoints(selectedCategoryId)
  const endpoints = endpointsQuery.data ?? []
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null)
  const blocksQuery = useApiDocBlocks(selectedEndpointId)
  const replaceBlocksMutation = useReplaceApiDocBlocks(selectedEndpointId)
  const [envModalOpen, setEnvModalOpen] = useState(false)

  const selectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  )

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null)
      setSelectedEndpointId(null)
      return
    }
    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id)
      setSelectedEndpointId(null)
    }
  }, [categories, selectedCategoryId])

  useEffect(() => {
    if (endpoints.length === 0) {
      setSelectedEndpointId(null)
      return
    }
    if (!endpoints.some((endpoint) => endpoint.id === selectedEndpointId)) {
      setSelectedEndpointId(endpoints[0].id)
    }
  }, [endpoints, selectedEndpointId])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="ui-icon-button-brand size-10 shrink-0">
            <FileJson className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-text-primary">Postman Lite</h2>
            <p className="mt-1 text-xs text-text-secondary">
              API 스펙을 정리하고 브라우저에서 요청을 실행합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid h-[calc(100vh-10rem)] min-h-[640px] grid-cols-1 gap-3 lg:grid-cols-[240px_300px_minmax(0,1fr)]">
        <CategorySidebar
          categories={categories}
          activeId={selectedCategoryId}
          isAdmin={isAdmin}
          isLoading={categoriesQuery.isLoading}
          onSelect={(id) => {
            setSelectedCategoryId(id)
            setSelectedEndpointId(null)
          }}
        />
        <EndpointSidebar
          categoryId={selectedCategoryId}
          endpoints={endpoints}
          activeId={selectedEndpointId}
          isAdmin={isAdmin}
          isLoading={endpointsQuery.isLoading}
          onSelect={setSelectedEndpointId}
        />
        <ApiTesterPanel
          endpoint={selectedEndpoint}
          blocks={blocksQuery.data ?? []}
          isAdmin={isAdmin}
          isBlocksLoading={blocksQuery.isLoading}
          isSaving={replaceBlocksMutation.isPending}
          onSave={(content) => replaceBlocksMutation.mutate(content)}
          onOpenEnv={() => setEnvModalOpen(true)}
        />
      </div>

      {envModalOpen ? <EnvironmentDialog onClose={() => setEnvModalOpen(false)} /> : null}
    </section>
  )
}

function CategorySidebar({
  categories,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  categories: ApiDocCategory[]
  activeId: string | null
  isAdmin: boolean
  isLoading: boolean
  onSelect: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const createMutation = useCreateApiDocCategory()
  const updateMutation = useUpdateApiDocCategory()
  const deleteMutation = useDeleteApiDocCategory()
  const reorderMutation = useReorderApiDocCategories()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const submitAdd = () => {
    const name = newName.trim()
    if (!name) {
      setAdding(false)
      return
    }
    createMutation.mutate(
      { name, icon: 'Folder', emoji: null },
      {
        onSuccess: (category) => {
          setNewName('')
          setAdding(false)
          onSelect(category.id)
        },
      },
    )
  }

  const submitRename = (categoryId: string) => {
    const name = editingName.trim()
    if (!name) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      { id: categoryId, body: { name } },
      { onSuccess: () => setEditingId(null) },
    )
  }

  const handleDelete = (category: ApiDocCategory) => {
    if (!window.confirm(`'${category.name}' 카테고리를 삭제할까요?`)) return
    deleteMutation.mutate(category.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex((category) => category.id === active.id)
    const newIndex = categories.findIndex((category) => category.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(categories, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map((category, index) => ({ id: category.id, orderIdx: index })))
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border-soft bg-surface-muted/50 px-4">
        <div>
          <p className="text-sm font-black text-text-primary">컬렉션</p>
          <p className="text-[11px] text-text-muted">{categories.length} items</p>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            tone="brand"
            onClick={() => {
              setAdding(true)
              setNewName('')
            }}
            aria-label="카테고리 추가"
            title="카테고리 추가"
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {adding ? (
          <div className="mb-2 rounded-md border border-brand-border bg-brand-glass p-2">
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) submitAdd()
                if (event.key === 'Escape') setAdding(false)
              }}
              placeholder="새 컬렉션"
              className="ui-input text-sm"
            />
            <div className="mt-2 flex justify-end gap-1">
              <Button type="button" size="sm-icon" variant="ghost" onClick={() => setAdding(false)} aria-label="취소">
                <X className="size-3.5" />
              </Button>
              <Button type="button" size="sm-icon" tone="brand" onClick={submitAdd} aria-label="추가">
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : categories.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            {isAdmin ? '컬렉션을 추가하세요.' : '등록된 API 문서가 없습니다.'}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {categories.map((category) => (
                  <SortableItem key={category.id} id={category.id} disabled={!isAdmin}>
                    {(dragHandleProps) => (
                      <div
                        className={`group flex items-center gap-2 rounded-md border px-2 py-2 transition-colors ${
                          activeId === category.id
                            ? 'border-brand-border bg-brand-glass'
                            : 'border-transparent hover:border-surface-border-soft hover:bg-surface-muted'
                        }`}
                      >
                        {isAdmin ? (
                          <button
                            type="button"
                            {...dragHandleProps}
                            className="cursor-grab text-text-muted opacity-50 transition-opacity group-hover:opacity-100"
                            aria-label="드래그"
                          >
                            <GripVertical className="size-3.5" />
                          </button>
                        ) : null}
                        {editingId === category.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                submitRename(category.id)
                              }
                              if (event.key === 'Escape') setEditingId(null)
                            }}
                            className="ui-input h-8 min-w-0 flex-1 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelect(category.id)}
                            className="min-w-0 flex-1 truncate text-left text-sm font-bold text-text-primary"
                            title={category.name}
                          >
                            {category.name}
                          </button>
                        )}
                        {isAdmin ? (
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {editingId === category.id ? (
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                tone="brand"
                                onClick={() => submitRename(category.id)}
                                aria-label="저장"
                              >
                                <Check className="size-3.5" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(category.id)
                                  setEditingName(category.name)
                                }}
                                aria-label="수정"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm-icon"
                              variant="ghost"
                              tone="danger"
                              onClick={() => handleDelete(category)}
                              aria-label="삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  )
}

function EndpointSidebar({
  categoryId,
  endpoints,
  activeId,
  isAdmin,
  isLoading,
  onSelect,
}: {
  categoryId: string | null
  endpoints: ApiDocEndpoint[]
  activeId: string | null
  isAdmin: boolean
  isLoading: boolean
  onSelect: (id: string | null) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const createMutation = useCreateApiDocEndpoint(categoryId)
  const updateMutation = useUpdateApiDocEndpoint(categoryId)
  const deleteMutation = useDeleteApiDocEndpoint(categoryId)
  const reorderMutation = useReorderApiDocEndpoints(categoryId)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const resetAddForm = () => {
    setNewTitle('')
  }

  const submitAdd = () => {
    if (!categoryId) return
    const title = newTitle.trim()
    if (!title) {
      setAdding(false)
      resetAddForm()
      return
    }
    createMutation.mutate(
      {
        categoryId,
        title,
        method: 'GET',
        path: '',
      },
      {
        onSuccess: (endpoint) => {
          resetAddForm()
          setAdding(false)
          onSelect(endpoint.id)
        },
      },
    )
  }

  const startEdit = (endpoint: ApiDocEndpoint) => {
    setEditingId(endpoint.id)
    setEditingTitle(endpoint.title)
  }

  const submitEdit = (endpointId: string) => {
    const title = editingTitle.trim()
    if (!title) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      {
        id: endpointId,
        body: {
          title,
        },
      },
      { onSuccess: () => setEditingId(null) },
    )
  }

  const handleDelete = (endpoint: ApiDocEndpoint) => {
    if (!window.confirm(`'${endpoint.title}' 엔드포인트를 삭제할까요?`)) return
    deleteMutation.mutate(endpoint.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = endpoints.findIndex((endpoint) => endpoint.id === active.id)
    const newIndex = endpoints.findIndex((endpoint) => endpoint.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(endpoints, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map((endpoint, index) => ({ id: endpoint.id, orderIdx: index })))
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-sm">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border-soft bg-surface-muted/50 px-4">
        <div>
          <p className="text-sm font-black text-text-primary">API 항목</p>
          <p className="text-[11px] text-text-muted">{endpoints.length} items</p>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            size="sm-icon"
            variant="ghost"
            tone="brand"
            disabled={!categoryId}
            onClick={() => setAdding(true)}
            aria-label="API 항목 추가"
            title="API 항목 추가"
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {adding && categoryId ? (
          <div className="mb-2 rounded-md border border-brand-border bg-brand-glass p-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) submitAdd()
                if (event.key === 'Escape') {
                  setAdding(false)
                  resetAddForm()
                }
              }}
              placeholder="API 항목 이름"
              className="ui-input min-w-0 text-sm"
            />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="sm-icon"
                variant="ghost"
                onClick={() => {
                  setAdding(false)
                  resetAddForm()
                }}
                aria-label="취소"
              >
                <X className="size-3.5" />
              </Button>
              <Button type="button" size="sm-icon" tone="brand" onClick={submitAdd} aria-label="추가">
                <Check className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        {!categoryId ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            컬렉션을 먼저 선택하세요.
          </div>
        ) : isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : endpoints.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-3 py-10 text-center text-sm text-text-muted">
            {isAdmin ? 'API 항목을 추가하세요.' : '등록된 API 항목이 없습니다.'}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={endpoints.map((endpoint) => endpoint.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {endpoints.map((endpoint) => (
                  <SortableItem key={endpoint.id} id={endpoint.id} disabled={!isAdmin}>
                    {(dragHandleProps) => (
                      <div
                        className={`group rounded-md border px-2 py-2 transition-colors ${
                          activeId === endpoint.id
                            ? 'border-brand-border bg-brand-glass'
                            : 'border-transparent hover:border-surface-border-soft hover:bg-surface-muted'
                        }`}
                      >
                        {editingId === endpoint.id ? (
                          <div className="space-y-2">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                  submitEdit(endpoint.id)
                                }
                                if (event.key === 'Escape') setEditingId(null)
                              }}
                              className="ui-input h-9 min-w-0 text-sm"
                            />
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm-icon"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                aria-label="취소"
                              >
                                <X className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm-icon"
                                tone="brand"
                                onClick={() => submitEdit(endpoint.id)}
                                aria-label="저장"
                              >
                                <Check className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            {isAdmin ? (
                              <button
                                type="button"
                                {...dragHandleProps}
                                className="mt-1 cursor-grab text-text-muted opacity-50 transition-opacity group-hover:opacity-100"
                                aria-label="드래그"
                              >
                                <GripVertical className="size-3.5" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onSelect(endpoint.id)}
                              className="min-w-0 flex-1 truncate text-left text-sm font-bold text-text-primary"
                              title={endpoint.title}
                            >
                              {endpoint.title}
                            </button>
                            {isAdmin ? (
                              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  type="button"
                                  size="sm-icon"
                                  variant="ghost"
                                  onClick={() => startEdit(endpoint)}
                                  aria-label="수정"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm-icon"
                                  variant="ghost"
                                  tone="danger"
                                  onClick={() => handleDelete(endpoint)}
                                  aria-label="삭제"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  )
}

function EnvironmentDialog({ onClose }: { onClose: () => void }) {
  const environments = useApiEnvStore((state) => state.environments)
  const activeEnvId = useApiEnvStore((state) => state.activeEnvId)
  const setActiveEnv = useApiEnvStore((state) => state.setActiveEnv)
  const updateEnvironments = useApiEnvStore((state) => state.updateEnvironments)
  const activeEnv = environments.find((env) => env.id === activeEnvId) ?? environments[0]
  const [draft, setDraft] = useState<ApiEnvironmentVariable[]>(() =>
    activeEnv ? activeEnv.variables.map((item) => ({ ...item })) : [],
  )

  useEffect(() => {
    if (activeEnv) {
      setDraft(activeEnv.variables.map((item) => ({ ...item })))
    }
  }, [activeEnv])

  const updateRow = (index: number, field: keyof ApiEnvironmentVariable, value: string) => {
    setDraft((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)))
  }

  const save = () => {
    if (!activeEnv) return
    updateEnvironments(
      environments.map((env) =>
        env.id === activeEnv.id
          ? {
              ...env,
              variables: draft.filter((item) => item.key.trim()).map((item) => ({ ...item, key: item.key.trim() })),
            }
          : env,
      ),
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--background)_35%,transparent)] p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border-soft bg-surface-muted px-5 py-4">
          <div>
            <p className="text-base font-black text-text-primary">환경 변수</p>
            <p className="mt-1 text-xs text-text-muted">`{{API_BASE}}`처럼 요청 URL, header, body에서 사용할 수 있습니다.</p>
          </div>
          <Button type="button" size="sm-icon" variant="ghost" onClick={onClose} aria-label="닫기">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {environments.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setActiveEnv(env.id)}
                className={`rounded-md border px-3 py-2 text-xs font-bold transition-colors ${
                  activeEnvId === env.id
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:text-text-primary'
                }`}
              >
                {env.name}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-surface-border-soft">
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_40px] gap-2 border-b border-surface-border-soft bg-surface-muted px-3 py-2 text-[11px] font-black uppercase tracking-widest text-text-muted">
              <span>Key</span>
              <span>Value</span>
              <span>Description</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--surface-border-soft)]">
              {draft.map((row, index) => (
                <div
                  key={`${row.key}-${index}`}
                  className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_40px] items-center gap-2 px-3 py-2"
                >
                  <input
                    value={row.key}
                    onChange={(event) => updateRow(index, 'key', event.target.value)}
                    className="ui-input font-mono text-xs"
                  />
                  <input
                    value={row.value}
                    onChange={(event) => updateRow(index, 'value', event.target.value)}
                    className="ui-input font-mono text-xs"
                  />
                  <input
                    value={row.description ?? ''}
                    onChange={(event) => updateRow(index, 'description', event.target.value)}
                    className="ui-input text-xs"
                  />
                  <Button
                    type="button"
                    size="sm-icon"
                    variant="ghost"
                    tone="danger"
                    onClick={() => setDraft((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                    aria-label="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setDraft((prev) => [...prev, { key: '', value: '', description: '' }])}
          >
            <Plus className="mr-1.5 size-3.5" />
            변수 추가
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border-soft bg-surface-muted px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
