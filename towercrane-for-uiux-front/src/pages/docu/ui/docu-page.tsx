import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Check,
  FileText,
  GripVertical,
  Hash,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { useUiStore } from '../../../shared/store/ui-store'
import { useCatalogCategories } from '../../../shared/api/catalog'
import {
  useCreateDocument,
  useCreateSection,
  useDeleteDocument,
  useDeleteSection,
  useDocuDocument,
  useDocuTree,
  useReorderDocuments,
  useReorderSections,
  useUpdateDocument,
  useUpdateSection,
  type DocDocumentSummary,
  type DocSection,
} from '../../../shared/api/docu'
import { BlockEditor } from '../../../features/docu/ui/block-editor'

export function DocuPage() {
  const activePrototypeId = useUiStore((state) => state.activePrototypeId)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const categoriesQuery = useCatalogCategories()

  const prototypeInfo = useMemo(() => {
    if (!activePrototypeId || !categoriesQuery.data) return null
    for (const category of categoriesQuery.data) {
      const proto = category.prototypes.find((p) => p.id === activePrototypeId)
      if (proto) return { prototype: proto, category }
    }
    return null
  }, [activePrototypeId, categoriesQuery.data])

  const treeQuery = useDocuTree(activePrototypeId)
  const sections = treeQuery.data ?? []

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSectionId(null)
      setActiveDocumentId(null)
      return
    }
    if (!sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sections[0].id)
    }
  }, [sections, activeSectionId])

  const currentSection = sections.find((s) => s.id === activeSectionId) ?? null
  const documents = currentSection?.documents ?? []

  useEffect(() => {
    if (documents.length === 0) {
      setActiveDocumentId(null)
      return
    }
    if (!documents.some((d) => d.id === activeDocumentId)) {
      setActiveDocumentId(documents[0].id)
    }
  }, [documents, activeDocumentId])

  if (!activePrototypeId) {
    return (
      <Card className="rounded-[28px] p-12 flex flex-col items-center justify-center text-center">
        <FileText className="size-12 ui-text-muted mb-4" />
        <p className="text-lg font-semibold ui-text-primary mb-2">
          프로토타입을 먼저 선택해주세요
        </p>
        <p className="text-sm ui-text-secondary mb-6">
          Prototype 화면에서 DOCU 버튼을 눌러 접근할 수 있습니다.
        </p>
        <button
          onClick={() => setActiveSection('prototype')}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--surface-border-soft)] bg-[var(--surface-muted)] px-4 py-2 text-sm ui-text-primary hover:bg-[var(--surface-muted)]"
        >
          <ArrowLeft className="size-4" /> Prototype 목록으로
        </button>
      </Card>
    )
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] min-h-0 grid-cols-[240px_260px_minmax(0,1fr)] gap-3 animate-in fade-in">
      <SectionSidebar
        prototypeId={activePrototypeId}
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={(id) => {
          setActiveSectionId(id)
          setActiveDocumentId(null)
        }}
        prototypeTitle={prototypeInfo?.prototype.title ?? null}
        isLoading={treeQuery.isLoading}
      />
      <DocumentSidebar
        prototypeId={activePrototypeId}
        section={currentSection}
        activeDocumentId={activeDocumentId}
        onSelect={setActiveDocumentId}
      />
      <MainPanel
        prototypeId={activePrototypeId}
        section={currentSection}
        documentId={activeDocumentId}
        documents={documents}
        onBack={() => setActiveSection('prototype')}
      />
    </div>
  )
}

/* =========================================================
 * Section sidebar (1st column)
 * =======================================================*/
function SectionSidebar({
  prototypeId,
  sections,
  activeSectionId,
  onSelect,
  prototypeTitle,
  isLoading,
}: {
  prototypeId: string
  sections: DocSection[]
  activeSectionId: string | null
  onSelect: (id: string) => void
  prototypeTitle: string | null
  isLoading: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const createMutation = useCreateSection(prototypeId)
  const updateMutation = useUpdateSection(prototypeId)
  const deleteMutation = useDeleteSection(prototypeId)
  const reorderMutation = useReorderSections(prototypeId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(sections, oldIndex, newIndex)
    reorderMutation.mutate({
      items: reordered.map((s, i) => ({ id: s.id, orderIdx: i })),
    })
  }

  const submitAdd = () => {
    if (!newTitle.trim()) {
      setAdding(false)
      return
    }
    createMutation.mutate(
      { title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle('')
          setAdding(false)
        },
      },
    )
  }

  const submitRename = (sectionId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      { sectionId, title: editingTitle.trim() },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised p-4 shadow-sm">
      <div className="space-y-2.5">

        <div
          className="group w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5 text-left shadow-sm transition-all hover:border-brand-border/40 hover:bg-brand-glass/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
          title={prototypeTitle ?? ''}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
                Docs of
              </div>
              <div className="mt-1 truncate text-base font-bold ui-text-primary transition-colors group-hover:text-brand-primary">
                {prototypeTitle ?? '—'}
              </div>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted transition-colors group-hover:border-brand-border group-hover:bg-surface-raised group-hover:text-brand-primary">
              <Layers className="size-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
            Sections
          </div>
          <div className="mt-0.5 text-[11px] font-medium ui-text-muted">
            {sections.length} items
          </div>
        </div>
        <button
          onClick={() => {
            setAdding(true)
            setNewTitle('')
          }}
          className="flex size-8 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-secondary transition-all hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary hover:shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
          title="섹션 추가"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-surface-border-soft bg-[var(--surface-muted)]/60 p-1.5">
        <div className="flex h-full flex-col gap-1 overflow-y-auto pr-1">
          {isLoading && sections.length === 0 ? (
            <div className="text-xs ui-text-muted text-center py-6">로딩 중...</div>
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((sec) => (
                <SortableSectionItem
                  key={sec.id}
                  section={sec}
                  isActive={activeSectionId === sec.id}
                  isEditing={editingId === sec.id}
                  editingTitle={editingTitle}
                  onSelect={() => onSelect(sec.id)}
                  onStartEdit={() => {
                    setEditingId(sec.id)
                    setEditingTitle(sec.title)
                  }}
                  onChangeTitle={setEditingTitle}
                  onSubmitEdit={() => submitRename(sec.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `섹션 "${sec.title}" 를 삭제할까요? 하위 문서/블록도 함께 삭제됩니다.`,
                      )
                    ) {
                      deleteMutation.mutate(sec.id)
                    }
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {adding ? (
            <div className="flex items-center gap-1.5 rounded-[12px] border border-brand-border bg-brand-glass px-2 py-1.5 mt-1">
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm ui-text-primary placeholder:ui-text-muted outline-none"
                placeholder="섹션 이름"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') submitAdd()
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
              <button
                onClick={submitAdd}
                className="text-brand-primary hover:brightness-110"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => setAdding(false)}
                className="ui-text-muted hover:ui-text-secondary"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          {!isLoading && sections.length === 0 && !adding ? (
            <div className="text-xs ui-text-muted text-center py-6">
              섹션이 없습니다. + 버튼으로 추가하세요.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SortableSectionItem({
  section,
  isActive,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onChangeTitle,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}: {
  section: DocSection
  isActive: boolean
  isEditing: boolean
  editingTitle: string
  onSelect: () => void
  onStartEdit: () => void
  onChangeTitle: (v: string) => void
  onSubmitEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2 py-1.5 shadow-sm"
      >
        <input
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-sm ui-text-primary outline-none"
          value={editingTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') onSubmitEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
        />
        <button onClick={onSubmitEdit} className="rounded-md p-1 text-brand-primary transition-colors hover:bg-brand-glass hover:brightness-110">
          <Check className="size-3.5" />
        </button>
        <button onClick={onCancelEdit} className="rounded-md p-1 ui-text-muted transition-colors hover:bg-surface-muted hover:ui-text-secondary">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1.5 overflow-hidden rounded-md border transition-all duration-200 ${
        isActive
          ? 'translate-x-0.5 border-brand-border bg-brand-glass text-brand-primary shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_10%,transparent)]'
          : 'border-transparent ui-text-secondary hover:translate-x-0.5 hover:border-brand-border/40 hover:bg-brand-glass/60 hover:text-text-primary hover:shadow-[0_8px_22px_color-mix(in_srgb,var(--primary)_7%,transparent)]'
      }`}
    >
      <span
        className={`absolute left-0 top-[18%] h-[64%] w-1 rounded-r-full bg-brand-primary transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
        }`}
      />
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing pl-2 py-2.5 ui-text-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Drag"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 py-2.5 text-left text-sm font-medium min-w-0 focus-visible:outline-none"
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
            isActive
              ? 'border-brand-border bg-surface-raised text-brand-primary'
              : 'border-surface-border-soft bg-surface-muted text-text-muted group-hover:border-brand-border group-hover:bg-surface-raised group-hover:text-brand-primary'
          }`}
        >
          <Layers className="size-3.5" />
        </span>
        <span className="truncate">{section.title}</span>
      </button>
      <div className="flex translate-x-2 items-center gap-0.5 pr-1.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        <button
          onClick={onStartEdit}
          className="rounded-md p-1 ui-text-secondary transition-colors hover:bg-surface-raised hover:text-brand-primary"
          title="이름 변경"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1 ui-text-secondary transition-colors hover:bg-danger-glass hover:text-destructive"
          title="삭제"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

/* =========================================================
 * Document sidebar (2nd column)
 * =======================================================*/
function DocumentSidebar({
  prototypeId,
  section,
  activeDocumentId,
  onSelect,
}: {
  prototypeId: string
  section: DocSection | null
  activeDocumentId: string | null
  onSelect: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const createMutation = useCreateDocument(prototypeId)
  const updateMutation = useUpdateDocument(prototypeId)
  const deleteMutation = useDeleteDocument(prototypeId)
  const reorderMutation = useReorderDocuments(prototypeId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const documents = section?.documents ?? []

  const handleDragEnd = (event: DragEndEvent) => {
    if (!section) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = documents.findIndex((d) => d.id === active.id)
    const newIndex = documents.findIndex((d) => d.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(documents, oldIndex, newIndex)
    reorderMutation.mutate({
      sectionId: section.id,
      items: reordered.map((d, i) => ({ id: d.id, orderIdx: i })),
    })
  }

  const submitAdd = () => {
    if (!section || !newTitle.trim()) {
      setAdding(false)
      return
    }
    createMutation.mutate(
      { sectionId: section.id, title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle('')
          setAdding(false)
        },
      },
    )
  }

  const submitRename = (documentId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    updateMutation.mutate(
      { documentId, title: editingTitle.trim() },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5 shadow-sm transition-colors hover:border-brand-border/60 hover:bg-brand-glass/50">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
            Documents
          </div>
          <div className="mt-1 truncate text-sm font-bold tracking-wide ui-text-primary">
            {section?.title ?? '섹션을 선택하세요'}
          </div>
          {section ? (
            <div className="mt-0.5 text-[11px] font-medium ui-text-muted">
              {documents.length} documents
            </div>
          ) : null}
        </div>
        {section ? (
          <button
            onClick={() => {
              setAdding(true)
              setNewTitle('')
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted ui-text-secondary transition-all hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary hover:shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
            title="문서 추가"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-surface-border-soft bg-[var(--surface-muted)]/60 p-1.5">
        <div className="flex h-full flex-col gap-1 overflow-y-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={documents.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {documents.map((doc) => (
                <SortableDocumentItem
                  key={doc.id}
                  document={doc}
                  isActive={activeDocumentId === doc.id}
                  isEditing={editingId === doc.id}
                  editingTitle={editingTitle}
                  onSelect={() => onSelect(doc.id)}
                  onStartEdit={() => {
                    setEditingId(doc.id)
                    setEditingTitle(doc.title)
                  }}
                  onChangeTitle={setEditingTitle}
                  onSubmitEdit={() => submitRename(doc.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `문서 "${doc.title}" 를 삭제할까요? 블록도 함께 삭제됩니다.`,
                      )
                    ) {
                      deleteMutation.mutate(doc.id)
                    }
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {adding && section ? (
            <div className="flex items-center gap-1.5 rounded-[12px] border border-brand-border bg-brand-glass px-2 py-1.5 mt-1">
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm ui-text-primary placeholder:ui-text-muted outline-none"
                placeholder="문서 제목"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') submitAdd()
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
              <button
                onClick={submitAdd}
                className="text-brand-primary hover:brightness-110"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => setAdding(false)}
                className="ui-text-muted hover:ui-text-secondary"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          {section && documents.length === 0 && !adding ? (
            <div className="text-xs ui-text-muted text-center py-6">
              문서가 없습니다.
            </div>
          ) : null}
          {!section ? (
            <div className="text-xs ui-text-muted text-center py-6">
              왼쪽에서 섹션을 선택하세요.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SortableDocumentItem({
  document: doc,
  isActive,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onChangeTitle,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}: {
  document: DocDocumentSummary
  isActive: boolean
  isEditing: boolean
  editingTitle: string
  onSelect: () => void
  onStartEdit: () => void
  onChangeTitle: (v: string) => void
  onSubmitEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2 py-1.5 shadow-sm"
      >
        <input
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-sm ui-text-primary outline-none"
          value={editingTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') onSubmitEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
        />
        <button onClick={onSubmitEdit} className="rounded-md p-1 text-brand-primary transition-colors hover:bg-brand-glass hover:brightness-110">
          <Check className="size-3.5" />
        </button>
        <button onClick={onCancelEdit} className="rounded-md p-1 ui-text-muted transition-colors hover:bg-surface-muted hover:ui-text-secondary">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1 overflow-hidden rounded-md border transition-all duration-200 ${
        isActive
          ? 'translate-x-0.5 border-brand-border bg-brand-glass font-bold text-brand-primary shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_10%,transparent)]'
          : 'border-transparent ui-text-secondary hover:translate-x-0.5 hover:border-brand-border/40 hover:bg-brand-glass/60 hover:text-text-primary hover:shadow-[0_8px_22px_color-mix(in_srgb,var(--primary)_7%,transparent)]'
      }`}
    >
      <span
        className={`absolute left-0 top-[18%] h-[64%] w-1 rounded-r-full bg-brand-primary transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
        }`}
      />
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing py-2 pl-2 ui-text-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Drag"
      >
        <GripVertical className="size-3" />
      </button>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 py-2 text-left text-[13px] min-w-0 focus-visible:outline-none"
      >
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
            isActive
              ? 'border-brand-border bg-surface-raised text-brand-primary'
              : 'border-surface-border-soft bg-surface-muted text-text-muted group-hover:border-brand-border group-hover:bg-surface-raised group-hover:text-brand-primary'
          }`}
        >
          <Hash className="size-3.5" />
        </span>
        <span className="truncate">{doc.title}</span>
      </button>
      <div className="flex translate-x-2 items-center gap-0.5 pr-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        <button
          onClick={onStartEdit}
          className="rounded-md p-1 ui-text-secondary transition-colors hover:bg-surface-raised hover:text-brand-primary"
          title="이름 변경"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1 ui-text-secondary transition-colors hover:bg-danger-glass hover:text-destructive"
          title="삭제"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

/* =========================================================
 * Main panel — block editor
 * =======================================================*/
function MainPanel({
  prototypeId,
  section,
  documentId,
  documents,
  onBack,
}: {
  prototypeId: string
  section: DocSection | null
  documentId: string | null
  documents: DocDocumentSummary[]
  onBack: () => void
}) {
  const activeDoc = documents.find((d) => d.id === documentId) ?? null
  const documentQuery = useDocuDocument(documentId)
  const updateDocMutation = useUpdateDocument(prototypeId)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [isEditingBlocks, setIsEditingBlocks] = useState(false)

  useEffect(() => {
    setIsEditingTitle(false)
    setIsEditingBlocks(false)
  }, [documentId])

  const startEditTitle = () => {
    if (!activeDoc) return
    setTitleDraft(activeDoc.title)
    setIsEditingTitle(true)
  }

  const commitTitle = () => {
    if (!activeDoc) return
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === activeDoc.title) {
      setIsEditingTitle(false)
      return
    }
    updateDocMutation.mutate(
      { documentId: activeDoc.id, title: trimmed },
      { onSuccess: () => setIsEditingTitle(false) },
    )
  }

  return (
    <div className="flex-1 ui-panel p-0 flex flex-col min-w-0 overflow-hidden shadow-sm relative">
      {activeDoc ? (
        <>
          <div className="flex items-center gap-3 px-8 py-5 border-b border-border bg-background/50 backdrop-blur-md shrink-0">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-brand-primary/70 font-bold mb-1">
                {section?.title}
              </div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') commitTitle()
                      if (e.key === 'Escape') setIsEditingTitle(false)
                    }}
                    className="flex-1 text-xl font-bold ui-text-primary bg-[var(--input-bg)] border border-brand-border rounded-lg px-3 py-1 outline-none focus:border-brand-border"
                  />
                  <button
                    onClick={commitTitle}
                    disabled={updateDocMutation.isPending}
                    className="p-1.5 text-brand-primary hover:brightness-110 hover:bg-brand-glass rounded-lg transition-colors disabled:opacity-50"
                    title="저장 (Enter)"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1.5 ui-text-secondary hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
                    title="취소 (Esc)"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1
                    onDoubleClick={isEditingBlocks ? startEditTitle : undefined}
                    className="text-xl font-bold ui-text-primary tracking-tight"
                  >
                    {activeDoc.title}
                  </h1>
                  {isEditingBlocks ? (
                    <button
                      onClick={startEditTitle}
                      className="p-1.5 ui-text-muted hover:text-brand-primary hover:bg-brand-glass rounded-lg transition-colors opacity-0 group-hover/title:opacity-100"
                      title="이름 변경"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={onBack}
                className="group flex items-center gap-2 rounded-xl border border-surface-border-soft bg-surface-muted px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-brand-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-glass hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Go Back
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {documentQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-sm ui-text-muted">
                문서 불러오는 중...
              </div>
            ) : documentQuery.data ? (
              <BlockEditor
                key={documentQuery.data.id}
                documentId={documentQuery.data.id}
                initialBlocks={documentQuery.data.blocks}
                isEditing={isEditingBlocks}
                onEnterEdit={() => setIsEditingBlocks(true)}
                onExitEdit={() => setIsEditingBlocks(false)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-rose-300">
                문서를 불러오지 못했습니다.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center ui-text-secondary p-8">
          <FileText className="size-16 opacity-20 mb-6" />
          <p className="text-lg font-medium ui-text-primary mb-2">문서를 선택해주세요</p>
          <p className="text-sm text-center max-w-xs">
            왼쪽 섹션과 문서 목록에서 선택하거나 새로 추가하세요.
          </p>
        </div>
      )}
    </div>
  )
}
