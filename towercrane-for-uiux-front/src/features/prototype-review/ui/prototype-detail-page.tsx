// build-fix: 2024-04-20
import { useEffect, useState } from 'react'
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
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  GitBranch,
  GripVertical,
  Image as ImageIcon,
  Info,
  ListChecks,
  MessageSquareText,
  Pencil,
  Plus,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useUpdatePrototype,
  type PrototypeListItem,
  type UpdatePrototypePayload,
} from '../../../shared/api/catalog'
import { DeletePrototypeButton } from '../../prototype-management/ui/delete-prototype-button'
import { EditPrototypeDialog } from '../../prototype-management/ui/edit-prototype-dialog'
import { useNavigate, useParams, Link } from '@tanstack/react-router'
import { useSessionStore } from '../../../shared/store/session-store'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { ReviewForm } from './review-form'
import { ReviewList } from './review-list'
import { useCategory } from '../../../shared/api/catalog'

type ButtonProps = {
  prototype: PrototypeListItem
  size?: 'icon' | 'sm-icon'
}

type PageProps = {
  prototype: PrototypeListItem
  canManagePrototype: boolean
  onBack: () => void
}

export function PrototypeDetailDialog({ prototype, size = 'icon' }: ButtonProps) {
  const navigate = useNavigate()
  const { categoryId } = useParams({ strict: false })

  return (
    <ActionIconButton
      icon={Info}
      title="상세 보기"
      aria-label="상세 보기"
      size={size}
      onClick={() => {
        if (categoryId) {
          navigate({
            to: '/prototype/$categoryId',
            params: { categoryId },
            search: { prototypeId: prototype.id },
          })
        }
      }}
    />
  )
}

export function PrototypeDetailPage({
  prototype,
  canManagePrototype,
  onBack,
}: PageProps) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const updatePrototype = useUpdatePrototype(prototype.categoryId, prototype.id)
  const { data: category } = useCategory(prototype.categoryId)

  const [copyState, setCopyState] = useState('idle')
  const [checklistDraft, setChecklistDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingDraft, setEditingDraft] = useState('')

  const checklist = prototype.checklist ?? []
  const tags = prototype.tags ?? []
  const images = prototype.images ?? []
  const activeImageUrl = activeImageIndex === null ? null : images[activeImageIndex]
  const hasMultipleImages = images.length > 1
  const checklistItemIds = checklist.map((item, index) => getChecklistItemId(item, index))
  const checklistSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [copyState])

  useEffect(() => {
    if (activeImageIndex === null) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImageIndex(null)
        return
      }
      if (!hasMultipleImages) return
      if (event.key === 'ArrowLeft') {
        setActiveImageIndex((current) =>
          current === null ? current : (current - 1 + images.length) % images.length,
        )
      }
      if (event.key === 'ArrowRight') {
        setActiveImageIndex((current) =>
          current === null ? current : (current + 1) % images.length,
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeImageIndex, hasMultipleImages, images.length])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('done')
      toast.success('링크가 클립보드에 복사되었습니다.')
    } catch {
      setCopyState('error')
      toast.error('링크 복사에 실패했습니다.')
    }
  }

  const addChecklistItem = async () => {
    const nextItem = checklistDraft.trim()
    if (!nextItem || updatePrototype.isPending) return
    try {
      await updatePrototype.mutateAsync(preserveImages({ checklist: [...checklist, nextItem] }, images))
      setChecklistDraft('')
    } catch (error) {
      console.error(error)
    }
  }

  const toggleChecklistItem = async (index: number) => {
    const nextChecklist = [...checklist]
    const item = nextChecklist[index]
    if (item.startsWith('[x] ')) {
      nextChecklist[index] = item.replace('[x] ', '')
    } else {
      nextChecklist[index] = '[x] ' + item
    }
    await updatePrototype.mutateAsync(preserveImages({ checklist: nextChecklist }, images))
  }

  const removeChecklistItem = async (index: number) => {
    const nextChecklist = checklist.filter((_, i) => i !== index)
    await updatePrototype.mutateAsync(preserveImages({ checklist: nextChecklist }, images))
  }

  const reorderChecklistItems = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || updatePrototype.isPending) return

    const oldIndex = checklistItemIds.findIndex((id) => id === active.id)
    const newIndex = checklistItemIds.findIndex((id) => id === over.id)

    if (oldIndex < 0 || newIndex < 0) return

    try {
      await updatePrototype.mutateAsync(
        preserveImages({ checklist: arrayMove(checklist, oldIndex, newIndex) }, images),
      )
    } catch (error) {
      console.error(error)
      toast.error('체크리스트 순서 변경에 실패했습니다.')
    }
  }

  const startEditingItem = (index: number, item: string) => {
    const text = item.startsWith('[x] ') ? item.slice(4) : item
    setEditingIndex(index)
    setEditingDraft(text)
  }

  const commitEditingItem = async () => {
    if (editingIndex === null) return
    const newText = editingDraft.trim()
    if (newText) {
      const item = checklist[editingIndex]
      const prefix = item.startsWith('[x] ') ? '[x] ' : ''
      const nextChecklist = [...checklist]
      nextChecklist[editingIndex] = prefix + newText
      await updatePrototype.mutateAsync(preserveImages({ checklist: nextChecklist }, images))
    }
    setEditingIndex(null)
    setEditingDraft('')
  }

  const cancelEditingItem = () => {
    setEditingIndex(null)
    setEditingDraft('')
  }

  const addTag = async () => {
    const nextTag = tagDraft.trim()
    if (!nextTag || tags.includes(nextTag) || updatePrototype.isPending) return
    try {
      await updatePrototype.mutateAsync(preserveImages({ tags: [...tags, nextTag] }, images))
      setTagDraft('')
    } catch (error) {
      console.error(error)
    }
  }

  const removeTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    await updatePrototype.mutateAsync(preserveImages({ tags: nextTags }, images))
  }

  const showPreviousImage = () => {
    if (!hasMultipleImages) return
    setActiveImageIndex((current) =>
      current === null ? current : (current - 1 + images.length) % images.length,
    )
  }

  const showNextImage = () => {
    if (!hasMultipleImages) return
    setActiveImageIndex((current) =>
      current === null ? current : (current + 1) % images.length,
    )
  }

  let copyButtonText = 'Copy Link'
  if (copyState === 'done') copyButtonText = 'Copied'
  if (copyState === 'error') copyButtonText = 'Error'
  const demoUrl = prototype.demoUrl || prototype.figmaUrl

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-8">
      {/* Expanded Image Modal */}
      {activeImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[rgba(0,0,0,0.72)] p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveImageIndex(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised text-text-primary shadow-lg transition-colors hover:bg-surface-muted"
            onClick={() => setActiveImageIndex(null)}
            aria-label="이미지 닫기"
          >
            <X className="size-5" />
          </button>
          <div
            className="relative flex h-[min(76vh,820px)] w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {hasMultipleImages && (
              <button
                type="button"
                className="absolute left-0 z-10 flex size-10 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised text-text-primary shadow-lg transition-colors hover:bg-surface-muted md:-left-14"
                onClick={showPreviousImage}
                aria-label="이전 이미지"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="h-full w-full overflow-hidden">
              <div
                className="flex h-full transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
              >
                {images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="flex h-full w-full shrink-0 items-center justify-center px-1"
                  >
                    <img
                      src={url}
                      alt={`프로젝트 이미지 ${i + 1}`}
                      className="max-h-full max-w-full rounded-sm object-contain shadow-2xl"
                    />
                  </div>
                ))}
              </div>
            </div>
            {hasMultipleImages && (
              <button
                type="button"
                className="absolute right-0 z-10 flex size-10 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised text-text-primary shadow-lg transition-colors hover:bg-surface-muted md:-right-14"
                onClick={showNextImage}
                aria-label="다음 이미지"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>
          {hasMultipleImages && (
            <div
              className="mt-4 flex max-w-full items-center gap-2 overflow-x-auto rounded-sm border border-surface-border-soft bg-surface-raised/95 p-2 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  className={`h-14 w-24 shrink-0 overflow-hidden rounded-sm border transition-all ${
                    i === activeImageIndex
                      ? 'border-brand-border ring-2 ring-brand-border'
                      : 'border-surface-border-soft opacity-70 hover:opacity-100'
	                  }`}
	                  onClick={() => setActiveImageIndex(i)}
	                  aria-label={`${i + 1}번째 이미지 보기`}
	                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs font-bold text-text-on-brand">
            {activeImageIndex + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Main Info Section */}
      <div className="ui-panel relative flex flex-col gap-4 overflow-visible px-6 py-5">
        <div className="relative z-10 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2 lg:pr-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-primary">
              <Tag className="size-3.5" />
              {category?.title ?? 'Category'}
            </div>
            <h1 className="text-2xl font-black leading-snug tracking-tight text-text-primary">
              {prototype.title}
            </h1>
            {prototype.summary.trim() ? (
              <p className="max-w-4xl text-sm leading-relaxed text-text-secondary">
                {prototype.summary}
              </p>
            ) : null}

            {/* Tags area */}
            {(tags.length > 0 || canManagePrototype) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
              {tags.length > 0 ? (
                tags.map(tag => (
                  <div key={tag} className="flex items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-xs font-bold text-text-secondary">
                    #{tag}
                    {canManagePrototype && (
                      <button onClick={() => removeTag(tag)} className="ml-0.5 text-text-muted transition-colors hover:text-danger-500">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : null}
              {canManagePrototype && (
                <div className="relative">
                  <input 
                    value={tagDraft} 
                    onChange={e => setTagDraft(e.target.value)} 
                    placeholder="+ Tag..." 
                    className="h-8 w-24 rounded-sm border border-dashed border-surface-border bg-transparent px-3 text-xs font-medium outline-none transition-all focus:w-32 focus:border-brand-border focus:border-solid"
                    onKeyDown={e => e.key === 'Enter' && addTag()} 
                  />
                </div>
              )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 lg:max-w-[620px] lg:justify-end">
            <Link
              to="/issues"
              search={{ prototypeId: prototype.id }}
              className="flex h-9 items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3.5 text-sm font-bold text-brand-primary shadow-sm transition-all hover:bg-surface-muted"
              title="이슈 관리"
            >
              <ShieldAlert className="size-4" />
              이슈 관리
            </Link>
            {demoUrl ? (
              <a
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${prototype.title} 운영 데모 새 창으로 열기`}
                className="flex h-9 items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3.5 text-sm font-bold text-brand-primary shadow-sm transition-all hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
                onClick={() => toast.info('운영 데모로 이동합니다.')}
              >
                <ExternalLink className="size-4 text-brand-primary" aria-hidden />
                운영 데모
              </a>
            ) : null}
            {prototype.repoUrl ? (
              <a
                href={prototype.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center gap-2 rounded-sm border border-surface-border bg-surface-raised px-3.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
                onClick={() => toast.info('소스 코드 저장소로 이동합니다.')}
              >
                <GitBranch className="size-4 text-text-secondary" aria-hidden />
                Source Code
              </a>
            ) : null}
            <ActionIconButton
              icon={Copy}
              onClick={handleCopyLink}
              title={copyButtonText}
              aria-label="상세 링크 복사"
            />
            {canManagePrototype && (
              <>
                <EditPrototypeDialog
                  categoryId={prototype.categoryId}
                  prototype={prototype}
                  asIcon
                  size="icon"
                  className="rounded-sm border-surface-border!"
                />
                <DeletePrototypeButton
                  categoryId={prototype.categoryId}
                  prototypeId={prototype.id}
                  asIcon
                  size="icon"
                  className="rounded-sm border-surface-border!"
                />
              </>
            )}
            <ActionIconButton
              icon={ArrowLeft}
              onClick={onBack}
              tone="brand"
              title="목록으로 돌아가기"
              aria-label="목록으로 돌아가기"
            />
          </div>
        </div>
      </div>

      {/* Visuals Section */}
      <div className="ui-panel p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-sm bg-primary/5 text-primary">
              <ImageIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-0.5">Visual Discovery</h3>
              <div className="text-xs font-black underline decoration-primary underline-offset-4 text-primary">PROJECT VISUALS</div>
            </div>
          </div>
          {images.length > 0 && (
            <div className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {images.length} Imagery Assets
            </div>
          )}
        </div>
        
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {images.map((url, i) => (
              <button
                type="button"
                key={`${url}-${i}`}
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-sm border border-border bg-muted shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.99]"
                onClick={() => setActiveImageIndex(i)}
                aria-label={`${i + 1}번째 이미지 크게 보기`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-24 w-full flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted/20 text-xs font-bold text-muted-foreground/30">
            <ImageIcon className="mb-1.5 size-6 opacity-10" />
            이미지 데이터가 아직 업로드되지 않았습니다
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="ui-panel p-5 bg-muted/10 border-none">
           <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-7 items-center justify-center rounded-sm bg-background border border-border text-primary shadow-sm">
                <ListChecks className="size-3.5" />
              </div>
              작업 체크리스트
            </h3>
          </div>
          <div className="space-y-2.5">
            {canManagePrototype && checklist.length > 1 ? (
              <DndContext
                sensors={checklistSensors}
                collisionDetection={closestCenter}
                onDragEnd={reorderChecklistItems}
              >
                <SortableContext
                  items={checklistItemIds}
                  strategy={verticalListSortingStrategy}
                >
                  {checklist.map((item, i) => (
                    <SortableChecklistItem
                      key={checklistItemIds[i]}
                      id={checklistItemIds[i]}
                      index={i}
                      item={item}
                      isEditing={editingIndex === i}
                      editingDraft={editingDraft}
                      canManagePrototype={canManagePrototype}
                      onToggle={() => toggleChecklistItem(i)}
                      onStartEdit={() => startEditingItem(i, item)}
                      onRemove={() => removeChecklistItem(i)}
                      onEditingDraftChange={setEditingDraft}
                      onCommitEdit={commitEditingItem}
                      onCancelEdit={cancelEditingItem}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              checklist.map((item, i) => (
                <ChecklistItem
                  key={checklistItemIds[i]}
                  item={item}
                  isEditing={editingIndex === i}
                  editingDraft={editingDraft}
                  canManagePrototype={canManagePrototype}
                  onToggle={() => toggleChecklistItem(i)}
                  onStartEdit={() => startEditingItem(i, item)}
                  onRemove={() => removeChecklistItem(i)}
                  onEditingDraftChange={setEditingDraft}
                  onCommitEdit={commitEditingItem}
                  onCancelEdit={cancelEditingItem}
                />
              ))
            )}
            {canManagePrototype && (
              <div className="relative mt-4">
                <input 
                  value={checklistDraft} 
                  onChange={e => setChecklistDraft(e.target.value)} 
                  placeholder="New goal..." 
                  className="h-10 w-full rounded-sm bg-background border border-dashed border-border px-4 text-xs font-medium transition-all focus:border-primary focus:border-solid focus:ring-2 focus:ring-primary/5 outline-none" 
                  onKeyDown={e => e.key === 'Enter' && addChecklistItem()} 
                />
                <button onClick={addChecklistItem} className="absolute right-2.5 top-2.5 size-5 flex items-center justify-center rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col ui-panel p-6">
           <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-8 items-center justify-center rounded-sm bg-primary/5 text-primary">
                <MessageSquareText className="size-4" />
              </div>
              Peer Reviews
            </h3>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
             <div className="mb-4 grid grid-cols-2 gap-2">
               <div className="rounded-sm bg-primary/5 border border-primary/10 p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-1">Health Score</div>
                <div className="text-2xl font-black text-primary">{prototype.avgRating.toFixed(1)}</div>
              </div>
               <div className="rounded-sm bg-muted p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Total Feedback</div>
                <div className="text-2xl font-black text-foreground">{prototype.reviewCount}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
               <ReviewList prototypeId={prototype.id} headerAction={<ReviewForm prototypeId={prototype.id} disabled={!isAuthenticated} inlineTrigger />} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function getChecklistItemId(item: string, index: number) {
  return `checklist-${index}-${item}`
}

function preserveImages(
  payload: UpdatePrototypePayload,
  images: string[],
): UpdatePrototypePayload {
  return { ...payload, images }
}

type ChecklistItemProps = {
  canManagePrototype: boolean
  editingDraft: string
  isEditing: boolean
  item: string
  onCancelEdit: () => void
  onCommitEdit: () => void
  onEditingDraftChange: (value: string) => void
  onRemove: () => void
  onStartEdit: () => void
  onToggle: () => void
}

function ChecklistItem({
  canManagePrototype,
  editingDraft,
  isEditing,
  item,
  onCancelEdit,
  onCommitEdit,
  onEditingDraftChange,
  onRemove,
  onStartEdit,
  onToggle,
}: ChecklistItemProps) {
  const checked = item.startsWith('[x] ')

  return (
    <div className="group flex items-center gap-3 rounded-sm border border-border/40 bg-background p-3 transition-all hover:border-primary/20 hover:shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`flex size-5 shrink-0 items-center justify-center rounded-[2px] border-2 transition-all ${
          checked
            ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
            : 'border-border bg-muted/30 hover:border-primary/40'
        }`}
        aria-label={checked ? '체크리스트 완료 해제' : '체크리스트 완료'}
      >
        <Check className={`size-3 ${checked ? 'opacity-100' : 'opacity-0'}`} />
      </button>
      {isEditing ? (
        <input
          autoFocus
          value={editingDraft}
          onChange={(event) => onEditingDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onCommitEdit()
            if (event.key === 'Escape') onCancelEdit()
          }}
          onBlur={onCommitEdit}
          className="flex-1 border-b border-primary bg-transparent text-sm font-medium text-foreground outline-none focus:border-primary"
        />
      ) : (
        <span className={`flex-1 text-sm font-medium ${checked ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'}`}>
          {checked ? item.slice(4) : item}
        </span>
      )}
      {canManagePrototype && !isEditing && (
        <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
          {!checked && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="체크리스트 수정"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label="체크리스트 삭제"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

type SortableChecklistItemProps = ChecklistItemProps & {
  id: string
  index: number
}

function SortableChecklistItem({
  id,
  index,
  ...props
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const checked = props.item.startsWith('[x] ')
  const style = {
    opacity: isDragging ? 0.55 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-sm border border-border/40 bg-background p-3 transition-all hover:border-primary/20 hover:shadow-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex size-5 shrink-0 cursor-grab items-center justify-center text-text-muted transition-colors hover:text-text-primary active:cursor-grabbing"
        aria-label={`${index + 1}번째 체크리스트 순서 변경`}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={props.onToggle}
        className={`flex size-5 shrink-0 items-center justify-center rounded-[2px] border-2 transition-all ${
          checked
            ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
            : 'border-border bg-muted/30 hover:border-primary/40'
        }`}
        aria-label={checked ? '체크리스트 완료 해제' : '체크리스트 완료'}
      >
        <Check className={`size-3 ${checked ? 'opacity-100' : 'opacity-0'}`} />
      </button>
      {props.isEditing ? (
        <input
          autoFocus
          value={props.editingDraft}
          onChange={(event) => props.onEditingDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') props.onCommitEdit()
            if (event.key === 'Escape') props.onCancelEdit()
          }}
          onBlur={props.onCommitEdit}
          className="flex-1 border-b border-primary bg-transparent text-sm font-medium text-foreground outline-none focus:border-primary"
        />
      ) : (
        <span className={`flex-1 text-sm font-medium ${checked ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'}`}>
          {checked ? props.item.slice(4) : props.item}
        </span>
      )}
      {props.canManagePrototype && !props.isEditing && (
        <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
          {!checked && (
            <button
              type="button"
              onClick={props.onStartEdit}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="체크리스트 수정"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={props.onRemove}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label="체크리스트 삭제"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
