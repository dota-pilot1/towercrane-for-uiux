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
        <FileText className="size-12 text-slate-600 mb-4" />
        <p className="text-lg font-semibold text-white mb-2">
          프로토타입을 먼저 선택해주세요
        </p>
        <p className="text-sm text-slate-400 mb-6">
          Prototype 화면에서 DOCU 버튼을 눌러 접근할 수 있습니다.
        </p>
        <button
          onClick={() => setActiveSection('prototype')}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          <ArrowLeft className="size-4" /> Prototype 목록으로
        </button>
      </Card>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-in fade-in">
      <SectionSidebar
        prototypeId={activePrototypeId}
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={(id) => {
          setActiveSectionId(id)
          setActiveDocumentId(null)
        }}
        prototypeTitle={prototypeInfo?.prototype.title ?? null}
        onBack={() => setActiveSection('prototype')}
        isLoading={treeQuery.isLoading}
      />
      <DocumentSidebar
        prototypeId={activePrototypeId}
        section={currentSection}
        activeDocumentId={activeDocumentId}
        onSelect={setActiveDocumentId}
      />
      <MainPanel
        section={currentSection}
        documentId={activeDocumentId}
        documents={documents}
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
  onBack,
  isLoading,
}: {
  prototypeId: string
  sections: DocSection[]
  activeSectionId: string | null
  onSelect: (id: string) => void
  prototypeTitle: string | null
  onBack: () => void
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
    <Card className="w-60 shrink-0 rounded-[28px] p-5 flex flex-col gap-4 overflow-hidden border border-white/5 bg-slate-950/40">
      <div>
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="size-3" /> Prototype
        </button>
        <div className="text-xs uppercase tracking-widest text-emerald-200/70 font-bold mb-1">
          Docs of
        </div>
        <div className="text-base font-bold text-white truncate" title={prototypeTitle ?? ''}>
          {prototypeTitle ?? '—'}
        </div>
      </div>

      <div className="h-px w-full bg-white/5" />

      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
          Sections
        </div>
        <button
          onClick={() => {
            setAdding(true)
            setNewTitle('')
          }}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
          title="섹션 추가"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
        {isLoading && sections.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">로딩 중...</div>
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
          <div className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 mt-1">
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
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
              className="text-emerald-300 hover:text-emerald-200"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {!isLoading && sections.length === 0 && !adding ? (
          <div className="text-xs text-slate-500 text-center py-6">
            섹션이 없습니다. + 버튼으로 추가하세요.
          </div>
        ) : null}
      </div>
    </Card>
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
        className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5"
      >
        <input
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none"
          value={editingTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') onSubmitEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
        />
        <button onClick={onSubmitEdit} className="text-emerald-300 hover:text-emerald-200">
          <Check className="size-3.5" />
        </button>
        <button onClick={onCancelEdit} className="text-slate-500 hover:text-slate-300">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1.5 rounded-[12px] border transition-colors ${
        isActive
          ? 'bg-white/10 text-white border-white/10 shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing pl-2 py-2.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 py-2.5 text-left text-sm font-medium min-w-0"
      >
        <Layers className="size-4 opacity-70 shrink-0" />
        <span className="truncate">{section.title}</span>
      </button>
      <div className="flex items-center gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onStartEdit}
          className="p-1 text-slate-400 hover:text-emerald-300"
          title="이름 변경"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-rose-400"
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
    <Card className="w-72 shrink-0 rounded-[28px] p-5 flex flex-col gap-4 overflow-hidden border border-white/5 bg-slate-950/40">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white tracking-wide truncate">
          {section?.title ?? '섹션을 선택하세요'}
        </div>
        {section ? (
          <button
            onClick={() => {
              setAdding(true)
              setNewTitle('')
            }}
            className="text-slate-400 hover:text-emerald-300 transition-colors"
            title="문서 추가"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="h-px w-full bg-white/5" />

      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
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
          <div className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 mt-1">
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
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
              className="text-emerald-300 hover:text-emerald-200"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {section && documents.length === 0 && !adding ? (
          <div className="text-xs text-slate-500 text-center py-6">
            문서가 없습니다.
          </div>
        ) : null}
        {!section ? (
          <div className="text-xs text-slate-500 text-center py-6">
            왼쪽에서 섹션을 선택하세요.
          </div>
        ) : null}
      </div>
    </Card>
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
        className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5"
      >
        <input
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none"
          value={editingTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') onSubmitEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
        />
        <button onClick={onSubmitEdit} className="text-emerald-300 hover:text-emerald-200">
          <Check className="size-3.5" />
        </button>
        <button onClick={onCancelEdit} className="text-slate-500 hover:text-slate-300">
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded-[12px] transition-all ${
        isActive
          ? 'text-emerald-300 bg-emerald-500/10 font-bold border-l-[3px] border-emerald-400 pl-[5px]'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-[3px] border-transparent pl-[5px]'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing py-2 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag"
      >
        <GripVertical className="size-3" />
      </button>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 py-2 text-left text-[13px] min-w-0"
      >
        <Hash className="size-3.5 opacity-60 shrink-0" />
        <span className="truncate">{doc.title}</span>
      </button>
      <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onStartEdit}
          className="p-1 text-slate-400 hover:text-emerald-300"
          title="이름 변경"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-rose-400"
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
  section,
  documentId,
  documents,
}: {
  section: DocSection | null
  documentId: string | null
  documents: DocDocumentSummary[]
}) {
  const activeDoc = documents.find((d) => d.id === documentId) ?? null
  const documentQuery = useDocuDocument(documentId)

  return (
    <Card className="flex-1 rounded-[28px] p-0 flex flex-col min-w-0 overflow-hidden bg-slate-950/60 shadow-2xl relative">
      {activeDoc ? (
        <>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2 backdrop-blur-md shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70 font-bold mb-1">
                {section?.title}
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {activeDoc.title}
              </h1>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {documentQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                문서 불러오는 중...
              </div>
            ) : documentQuery.data ? (
              <BlockEditor
                key={documentQuery.data.id}
                documentId={documentQuery.data.id}
                initialBlocks={documentQuery.data.blocks}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-rose-300">
                문서를 불러오지 못했습니다.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
          <FileText className="size-16 opacity-20 mb-6" />
          <p className="text-lg font-medium text-white mb-2">문서를 선택해주세요</p>
          <p className="text-sm text-center max-w-xs">
            왼쪽 섹션과 문서 목록에서 선택하거나 새로 추가하세요.
          </p>
        </div>
      )}
    </Card>
  )
}
