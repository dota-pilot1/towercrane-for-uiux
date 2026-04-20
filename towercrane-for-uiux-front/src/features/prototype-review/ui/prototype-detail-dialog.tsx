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
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const updatePrototype = useUpdatePrototype(prototype.categoryId, prototype.id)
  
  const { data: category } = useCategory(prototype.categoryId)

  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle')
  const [checklistDraft, setChecklistDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')

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
      console.error('Checklist add failed:', error)
    }
  }

  const toggleChecklistItem = async (index: number) => {
    const nextChecklist = [...checklist]
    const item = nextChecklist[index]
    if (item.startsWith('[x] ')) {
      nextChecklist[index] = item.replace('[x] ', '')
    } else {
      nextChecklist[index] = `[x] ${item}`
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
      console.error('Tag add failed:', error)
    }
  }

  const removeTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    await updatePrototype.mutateAsync({ tags: nextTags } as any)
  }

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col gap-4">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-primary">
              <Tag className="size-3" />
              {category?.title ?? 'Category'}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary">
              {prototype.title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
              {prototype.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-glass px-3 py-1 text-[11px] font-bold uppercase text-brand-primary">
                <span className="size-1.5 rounded-full bg-brand-primary animate-pulse" />
                {prototype.status}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-bold uppercase text-text-muted">
                {prototype.visibility === 'public' ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {prototype.visibility}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500 bg-amber-500 px-3 py-1 text-[11px] font-bold text-white">
                <Star className="size-3 fill-white" />
                {prototype.avgRating.toFixed(1)} ({prototype.reviewCount})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-medium text-text-secondary">
                <Clock className="size-3" />
                {new Date(prototype.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button
                variant="secondary"
                onClick={handleCopyLink}
                className="h-10 min-w-[100px] justify-center rounded-xl bg-surface-muted"
              >
                <Copy className="mr-2 size-4" />
                {copyState === 'done' ? 'Copied' : 'Copy'}
              </Button>
              {canManagePrototype && (
                <>
                  <div className="h-6 w-px bg-surface-border-soft mx-1" />
                  <EditPrototypeDialog categoryId={prototype.categoryId} prototype={prototype} asIcon />
                  <DeletePrototypeButton categoryId={prototype.categoryId} prototypeId={prototype.id} asIcon />
                </>
              )}
              <Button variant="secondary" onClick={onBack} size="icon">
                <ArrowLeft className="size-5" />
              </Button>
          </div>
        </div>

        {/* Links Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {prototype.repoUrl && (
            <a 
              href={prototype.repoUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-surface-border-soft bg-surface-muted px-4 py-2 text-xs font-bold text-text-primary transition-all hover:bg-surface-strong"
            >
              <ExternalLink className="size-3.5" />
              Repository
            </a>
          )}
          {prototype.figmaUrl && (
             <a 
              href={prototype.figmaUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-surface-border-soft bg-surface-muted px-4 py-2 text-xs font-bold text-text-primary transition-all hover:bg-surface-strong"
            >
              <ExternalLink className="size-3.5" />
              Design System (Figma)
            </a>
          )}
           {prototype.demoUrl && (
             <a 
              href={prototype.demoUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-glass px-4 py-2 text-xs font-black text-brand-primary transition-all hover:bg-brand-primary hover:text-white"
            >
              <Globe className="size-3.5" />
              Live Preview
            </a>
          )}
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid min-h-[600px] gap-4 xl:grid-cols-3">
        {/* Column 1: Evidence */}
        <section className="flex flex-col rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-text-primary">
              <ImageIcon className="size-4 text-brand-primary" />
              Visual Evidence
            </h3>
            <span className="rounded-lg bg-surface-muted px-2 py-1 text-[10px] font-bold text-text-muted">
              {prototype.images?.length ?? 0} ITEMS
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {prototype.images && prototype.images.length > 0 ? (
              prototype.images.map((url, i) => (
                <div key={i} className="group relative aspect-video overflow-hidden rounded-2xl border border-surface-border-soft bg-surface-strong">
                  <img src={url} alt={`Evidence ${i}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-surface-border-soft p-10 text-text-muted">
                <ImageIcon className="size-10 opacity-20" />
                <p className="text-sm">No images attached</p>
              </div>
            )}
          </div>
        </section>

        {/* Column 2: Implementation Details */}
        <section className="flex flex-col rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-text-primary">
              <CheckCircle2 className="size-4 text-brand-primary" />
              Checklist & Tags
            </h3>
          </div>

          <div className="flex flex-col gap-6">
            {/* Tags area */}
            <div className="space-y-3">
               <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-1.5 rounded-full border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-text-primary">
                    #{tag}
                    {canManagePrototype && (
                      <button onClick={() => removeTag(tag)} className="text-text-muted hover:text-rose-500">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canManagePrototype && (
                <div className="relative">
                  <Input 
                    value={tagDraft} 
                    onChange={e => setTagDraft(e.target.value)} 
                    placeholder="Add tag..." 
                    className="h-10 pr-10"
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                  />
                  <button onClick={addTag} className="absolute right-3 top-3 text-brand-primary">
                    <Plus className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Checklist area */}
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                {checklist.map((item, i) => {
                  const isDone = item.startsWith('[x] ')
                  return (
                    <div key={i} className="group flex items-center gap-3 rounded-2xl border border-surface-border-soft bg-surface-muted/50 p-3">
                      <button 
                        onClick={() => toggleChecklistItem(i)}
                        className={`flex size-5 items-center justify-center rounded-lg border-2 transition-colors ${isDone ? 'border-brand-primary bg-brand-primary text-white' : 'border-surface-border text-transparent hover:border-brand-primary'}`}
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                      <span className={`text-sm font-medium flex-1 ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {isDone ? item.replace('[x] ', '') : item}
                      </span>
                      {canManagePrototype && (
                        <button onClick={() => removeChecklistItem(i)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-500 transition-opacity">
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {canManagePrototype && (
                 <div className="relative">
                  <Input 
                    value={checklistDraft} 
                    onChange={e => setChecklistDraft(e.target.value)} 
                    placeholder="Add checklist item..." 
                    className="h-11 pr-12 rounded-xl"
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  />
                   <Button 
                    onClick={addChecklistItem} 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1 text-brand-primary"
                   >
                    <Plus className="size-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Column 3: Feedbacks */}
        <section className="flex flex-col rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-sm">
           <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-text-primary">
              <MessageSquareText className="size-4 text-brand-primary" />
              Feedback Loop
            </h3>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-4 grid grid-cols-2 gap-3">
               <div className="rounded-3xl border border-brand-border bg-brand-glass p-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary opacity-60">Avg Score</div>
                <div className="text-3xl font-black text-brand-primary">{prototype.avgRating.toFixed(1)}</div>
              </div>
               <div className="rounded-3xl border border-surface-border-soft bg-surface-muted p-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Reviews</div>
                <div className="text-3xl font-black text-text-primary">{prototype.reviewCount}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <ReviewList 
                prototypeId={prototype.id} 
                headerAction={
                  <ReviewForm 
                    prototypeId={prototype.id} 
                    disabled={!isAuthenticated}
                    inlineTrigger
                  />
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
