// build-fix: 2024-04-20
import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  MessageSquareText,
  Plus,
  Star,
  Tag,
  X,
} from 'lucide-react'
import {
  useUpdatePrototype,
  type PrototypeListItem,
} from '../../../shared/api/catalog'
import { DeletePrototypeButton } from '../../prototype-management/ui/delete-prototype-button'
import { EditPrototypeDialog } from '../../prototype-management/ui/edit-prototype-dialog'
import { useSessionStore } from '../../../shared/store/session-store'
import { useUiStore } from '../../../shared/store/ui-store'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { ReviewForm } from './review-form'
import { ReviewList } from './review-list'
import { useCategory } from '../../../shared/api/catalog'

type ButtonProps = {
  prototype: PrototypeListItem
}

type PageProps = {
  prototype: PrototypeListItem
  canManagePrototype: boolean
  onBack: () => void
}

export function PrototypeDetailDialog({ prototype }: ButtonProps) {
  const setActivePrototypeId = useUiStore((state) => state.setActivePrototypeId)

  return (
    <ActionIconButton
      icon={Info}
      title="상세 보기"
      aria-label="상세 보기"
      onClick={() => setActivePrototypeId(prototype.id)}
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
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null)

  const checklist = prototype.checklist ?? []
  const tags = prototype.tags ?? []

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('done')
    } catch {
      setCopyState('error')
    }
  }

  const addChecklistItem = async () => {
    const nextItem = checklistDraft.trim()
    if (!nextItem || updatePrototype.isPending) return
    try {
      await updatePrototype.mutateAsync({ checklist: [...checklist, nextItem] } as any)
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
    await updatePrototype.mutateAsync({ checklist: nextChecklist } as any)
  }

  const removeChecklistItem = async (index: number) => {
    const nextChecklist = checklist.filter((_, i) => i !== index)
    await updatePrototype.mutateAsync({ checklist: nextChecklist } as any)
  }

  const addTag = async () => {
    const nextTag = tagDraft.trim()
    if (!nextTag || tags.includes(nextTag) || updatePrototype.isPending) return
    try {
      await updatePrototype.mutateAsync({ tags: [...tags, nextTag] } as any)
      setTagDraft('')
    } catch (error) {
      console.error(error)
    }
  }

  const removeTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    await updatePrototype.mutateAsync({ tags: nextTags } as any)
  }

  let copyButtonText = 'Copy Link'
  if (copyState === 'done') copyButtonText = 'Copied'
  if (copyState === 'error') copyButtonText = 'Error'

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col gap-4">
      {/* Expanded Image Modal */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-10 animate-in fade-in duration-200"
          onClick={() => setExpandedImageUrl(null)}
        >
          <button 
            className="absolute right-6 top-6 text-white/60 hover:text-white transition-colors"
            onClick={() => setExpandedImageUrl(null)}
          >
            <X className="size-8" />
          </button>
          <img 
            src={expandedImageUrl} 
            alt="Expanded visual" 
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
          />
        </div>
      )}

      {/* Main Info Card */}
      <div className="overflow-hidden rounded-3xl border border-surface-border-soft bg-surface-raised shadow-sm p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
              <Tag className="size-3" />
              {category?.title ?? 'Category'}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-primary leading-tight">
              {prototype.title}
            </h1>
            <p className="text-base text-text-secondary leading-relaxed max-w-4xl">
              {prototype.summary}
            </p>

            {/* Tags area */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {tags.length > 0 ? (
                tags.map(tag => (
                  <div key={tag} className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                    #{tag}
                    {canManagePrototype && (
                      <button onClick={() => removeTag(tag)} className="text-text-muted hover:text-rose-500 transition-colors">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : null}
              {canManagePrototype && (
                <div className="relative group">
                  <Input 
                    value={tagDraft} 
                    onChange={e => setTagDraft(e.target.value)} 
                    placeholder="Add tag..." 
                    className="h-7 w-24 rounded-full px-3 text-[10px] transition-all focus:w-32" 
                    onKeyDown={e => e.key === 'Enter' && addTag()} 
                  />
                  <button onClick={addTag} className="absolute right-2 top-1.5 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-brand-primary px-3.5 py-1.5 text-[10px] font-black uppercase text-white shadow-sm shadow-brand-primary/20">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                {prototype.status}
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-muted/50 px-3.5 py-1.5 text-[10px] font-bold text-text-muted">
                {prototype.visibility === 'public' ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {prototype.visibility}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-[10px] font-black text-white shadow-sm shadow-amber-500/20">
                <Star className="size-3 fill-white" />
                {prototype.avgRating.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleCopyLink}
              className="h-10 min-w-[110px] justify-center rounded-xl bg-surface-muted/50 text-[11px] font-bold transition-all hover:bg-surface-strong"
            >
              <Copy className="mr-2 size-3.5" />
              {copyButtonText}
            </Button>
            {canManagePrototype && (
              <>
                <EditPrototypeDialog
                  categoryId={prototype.categoryId}
                  prototype={prototype}
                  asIcon
                  className="h-10 w-10 rounded-xl"
                />
                <DeletePrototypeButton
                  categoryId={prototype.categoryId}
                  prototypeId={prototype.id}
                  asIcon
                  className="h-10 w-10 rounded-xl"
                />
              </>
            )}
            <Button
              variant="secondary"
              onClick={onBack}
              size="icon"
              className="h-10 w-10 rounded-xl bg-surface-muted/50"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {prototype.repoUrl && (
            <a href={prototype.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-surface-border-soft bg-surface-muted px-3 py-1.5 text-[10px] font-bold text-text-primary transition-all hover:bg-surface-strong">
              <ExternalLink className="size-3 text-text-muted" /> Source
            </a>
          )}
          {prototype.figmaUrl && (
            <a href={prototype.figmaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-surface-border-soft bg-surface-muted px-3 py-1.5 text-[10px] font-bold text-text-primary transition-all hover:bg-surface-strong">
              <ExternalLink className="size-3 text-text-muted" /> Design
            </a>
          )}
          {prototype.demoUrl && (
            <a href={prototype.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-glass px-4 py-1.5 text-[10px] font-black text-brand-primary transition-all hover:bg-brand-primary hover:text-white">
              <Globe className="size-3" /> Live Preview
            </a>
          )}
        </div>
      </div>

      {/* Separate Visuals Card */}
      <div className="rounded-3xl border border-surface-border-soft bg-surface-raised p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-text-primary">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
              <ImageIcon className="size-4" />
            </div>
            Project Visuals
          </div>
          {prototype.images && prototype.images.length > 0 && (
            <div className="text-[10px] font-bold text-text-muted">
              {prototype.images.length} images • Click to expand
            </div>
          )}
        </div>
        
        {prototype.images && prototype.images.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {prototype.images.map((url, i) => (
              <div 
                key={i} 
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-xl border border-surface-border-soft bg-surface-strong shadow-sm transition-all hover:scale-[1.05] hover:shadow-md hover:ring-2 hover:ring-brand-primary/20"
                onClick={() => setExpandedImageUrl(url)}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border-soft bg-surface-muted/20 text-[11px] font-medium text-text-muted/50">
            <ImageIcon className="mb-2 size-5 opacity-20" />
            No images uploaded yet
          </div>
        )}
      </div>

      <div className="grid min-h-[500px] gap-4 xl:grid-cols-2">
        <section className="flex flex-col rounded-3xl border border-surface-border-soft bg-surface-raised p-6 shadow-sm">
           <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-text-primary">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
                <CheckCircle2 className="size-4" />
              </div>
              Project Checklist
            </h3>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            <div className="space-y-2.5">
              {checklist.map((item, i) => {
                const checked = item.startsWith('[x] ')
                return (
                  <div key={i} className="group flex items-center gap-3 rounded-2xl bg-surface-muted/30 p-3.5 transition-all hover:bg-surface-muted/60">
                    <button onClick={() => toggleChecklistItem(i)} className={`flex size-5.5 items-center justify-center rounded-lg border-2 transition-all ${checked ? 'border-brand-primary bg-brand-primary text-white shadow-sm shadow-brand-primary/20' : 'border-surface-border bg-white hover:border-brand-primary/50'}`}>
                      <CheckCircle2 className={`size-3.5 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                    <span className={`text-[13px] font-medium flex-1 ${checked ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                      {checked ? item.slice(4) : item}
                    </span>
                    {canManagePrototype && (
                      <button onClick={() => removeChecklistItem(i)} className="opacity-0 text-text-muted hover:text-rose-500 transition-all group-hover:opacity-100">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })}
              {canManagePrototype && (
                <div className="relative mt-4">
                  <Input 
                    value={checklistDraft} 
                    onChange={e => setChecklistDraft(e.target.value)} 
                    placeholder="Add a new task..." 
                    className="h-12 rounded-2xl border-surface-border-soft bg-surface-muted/20 px-4 transition-all focus:bg-white" 
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()} 
                  />
                  <button onClick={addChecklistItem} className="absolute right-3.5 top-3.5 text-brand-primary hover:scale-110 transition-transform">
                    <Plus className="size-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-3xl border border-surface-border-soft bg-surface-raised p-6 shadow-sm">
           <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-text-primary">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand-glass text-brand-primary">
                <MessageSquareText className="size-4" />
              </div>
              User Feedback
            </h3>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
             <div className="mb-4 grid grid-cols-2 gap-3">
               <div className="rounded-2xl border border-brand-border bg-brand-glass p-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-primary opacity-50">Score</div>
                <div className="text-2xl font-black text-brand-primary">{prototype.avgRating.toFixed(1)}</div>
              </div>
               <div className="rounded-2xl border border-surface-border-soft bg-surface-muted p-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-text-muted">Volume</div>
                <div className="text-2xl font-black text-text-primary">{prototype.reviewCount}</div>
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
