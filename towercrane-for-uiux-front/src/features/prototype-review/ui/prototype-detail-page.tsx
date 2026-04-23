// build-fix: 2024-04-20
import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  MessageSquareText,
  Plus,
  Sparkles,
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
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2 pb-12">
      {/* Expanded Image Modal */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10 animate-in fade-in duration-200"
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
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
          />
        </div>
      )}

      {/* Main Info Section */}
      <div className="ui-panel p-10 flex flex-col gap-8 relative overflow-hidden group">
        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              <Tag className="size-3.5" />
              {category?.title ?? 'Category'}
            </div>
            <h1 className="text-5xl font-black tracking-tight text-foreground leading-[1.1]">
              {prototype.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-4xl">
              {prototype.summary}
            </p>

            {/* Tags area */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {tags.length > 0 ? (
                tags.map(tag => (
                  <div key={tag} className="flex items-center gap-2 rounded-full bg-muted border border-border/50 px-4 py-1.5 text-[11px] font-bold text-muted-foreground">
                    #{tag}
                    {canManagePrototype && (
                      <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
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
                    className="h-8 w-24 rounded-full border border-dashed border-border bg-transparent px-4 text-[11px] font-medium transition-all focus:w-32 focus:border-primary focus:border-solid outline-none" 
                    onKeyDown={e => e.key === 'Enter' && addTag()} 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="size-12 flex items-center justify-center rounded-2xl bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm transition-all hover:scale-105 active:scale-95"
              title={copyButtonText}
            >
              <Copy className="size-5" />
            </button>
            {canManagePrototype && (
              <>
                <EditPrototypeDialog
                  categoryId={prototype.categoryId}
                  prototype={prototype}
                  asIcon
                  className="size-12 rounded-2xl border-border!"
                />
                <DeletePrototypeButton
                  categoryId={prototype.categoryId}
                  prototypeId={prototype.id}
                  asIcon
                  className="size-12 rounded-2xl border-border!"
                />
              </>
            )}
            <button
              onClick={onBack}
              className="size-12 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-x-1 active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2.5 rounded-full bg-primary px-5 py-2 text-[11px] font-black uppercase text-primary-foreground shadow-xl shadow-primary/15">
                <span className="size-1.5 rounded-full bg-primary-foreground animate-pulse" />
                {prototype.status}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-[11px] font-bold text-muted-foreground">
                {prototype.visibility === 'public' ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                {prototype.visibility}
              </div>
              {prototype.reviewCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/10 px-5 py-2 text-[11px] font-bold text-primary">
                  <Star className="size-3.5 fill-primary" />
                  {prototype.avgRating.toFixed(1)}
                  <span className="text-primary/50 font-medium font-mono ml-1">({prototype.reviewCount})</span>
                </div>
              )}
          </div>

          <div className="flex items-center gap-3">
            {prototype.repoUrl && (
              <a href={prototype.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-6 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-95 shadow-sm">
                <GitBranch className="size-4 text-muted-foreground" /> Source Code
              </a>
            )}
            {prototype.figmaUrl && (
              <a href={prototype.figmaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-6 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-95 shadow-sm">
                <Sparkles className="size-4 text-muted-foreground" /> Design Spec
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Visuals Section */}
      <div className="ui-panel p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
              <ImageIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Visual Discovery</h3>
              <div className="text-[10px] font-black underline decoration-primary underline-offset-4 text-primary">PROJECT VISUALS</div>
            </div>
          </div>
          {prototype.images && prototype.images.length > 0 && (
            <div className="text-[11px] font-bold text-muted-foreground bg-muted px-4 py-1.5 rounded-full">
              {prototype.images.length} Imagery Assets
            </div>
          )}
        </div>
        
        {prototype.images && prototype.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {prototype.images.map((url, i) => (
              <div 
                key={i} 
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-muted shadow-sm transition-all hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98]"
                onClick={() => setExpandedImageUrl(url)}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/20 text-xs font-bold text-muted-foreground/30">
            <ImageIcon className="mb-3 size-10 opacity-10" />
            이미지 데이터가 아직 업로드되지 않았습니다
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col ui-panel p-10 bg-muted/10 border-none">
           <div className="mb-10 flex items-center justify-between">
            <h3 className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-background border border-border text-primary shadow-sm">
                <CheckCircle2 className="size-6" />
              </div>
              Project Roadmap
            </h3>
          </div>
          <div className="flex-1 space-y-4">
            {checklist.map((item, i) => {
              const checked = item.startsWith('[x] ')
              return (
                <div key={i} className="group flex items-center gap-4 rounded-2xl bg-background p-5 border border-border/40 transition-all hover:shadow-md hover:border-primary/20">
                  <button onClick={() => toggleChecklistItem(i)} className={`flex size-7 items-center justify-center rounded-xl border-2 transition-all ${checked ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border-border bg-muted/30 hover:border-primary/40'}`}>
                    <Check className={`size-4 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                  <span className={`text-base font-medium flex-1 ${checked ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'}`}>
                    {checked ? item.slice(4) : item}
                  </span>
                  {canManagePrototype && (
                    <button onClick={() => removeChecklistItem(i)} className="opacity-0 text-muted-foreground hover:text-destructive transition-all group-hover:opacity-100">
                      <X className="size-5" />
                    </button>
                  )}
                </div>
              )
            })}
            {canManagePrototype && (
              <div className="relative mt-8">
                <input 
                  value={checklistDraft} 
                  onChange={e => setChecklistDraft(e.target.value)} 
                  placeholder="New goal..." 
                  className="h-16 w-full rounded-2xl bg-background border border-dashed border-border px-8 text-sm font-medium transition-all focus:border-primary focus:border-solid focus:ring-4 focus:ring-primary/5 outline-none" 
                  onKeyDown={e => e.key === 'Enter' && addChecklistItem()} 
                />
                <button onClick={addChecklistItem} className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-transform">
                  <Plus className="size-5" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col ui-panel p-10">
           <div className="mb-10 flex items-center justify-between">
            <h3 className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <MessageSquareText className="size-6" />
              </div>
              Peer Reviews
            </h3>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
             <div className="mb-8 grid grid-cols-2 gap-4">
               <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-2">Health Score</div>
                <div className="text-4xl font-black text-primary">{prototype.avgRating.toFixed(1)}</div>
              </div>
               <div className="rounded-2xl bg-muted p-5 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-2">Total Feedback</div>
                <div className="text-4xl font-black text-foreground">{prototype.reviewCount}</div>
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
