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
  Star,
  Tag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
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
  size?: 'icon' | 'sm-icon'
}

type PageProps = {
  prototype: PrototypeListItem
  canManagePrototype: boolean
  onBack: () => void
}

export function PrototypeDetailDialog({ prototype, size = 'icon' }: ButtonProps) {
  const setActivePrototypeId = useUiStore((state) => state.setActivePrototypeId)

  return (
    <ActionIconButton
      icon={Info}
      title="상세 보기"
      aria-label="상세 보기"
      size={size}
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
  const demoUrl = prototype.demoUrl || prototype.figmaUrl

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-8">
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
            className="max-h-full max-w-full rounded-sm object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
          />
        </div>
      )}

      {/* Main Info Section */}
      <div className="ui-panel p-6 flex flex-col gap-5 relative overflow-hidden group">
        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              <Tag className="size-3" />
              {category?.title ?? 'Category'}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground leading-tight">
              {prototype.title}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-4xl">
              {prototype.summary}
            </p>

            {/* Tags area */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {tags.length > 0 ? (
                tags.map(tag => (
                  <div key={tag} className="flex items-center gap-1 rounded-sm bg-muted border border-border/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    #{tag}
                    {canManagePrototype && (
                      <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                        <X className="size-2.5" />
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
                    className="h-6 w-20 rounded-sm border border-dashed border-border bg-transparent px-3 text-[10px] font-medium transition-all focus:w-28 focus:border-primary focus:border-solid outline-none" 
                    onKeyDown={e => e.key === 'Enter' && addTag()} 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${prototype.title} 운영 데모 새 창으로 열기`}
                className="inline-flex h-8 items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 text-[11px] font-black text-brand-primary shadow-sm transition-all hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
                onClick={() => toast.info('운영 URL로 이동합니다.')}
              >
                <ExternalLink className="size-3.5" aria-hidden />
                운영 데모
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="size-8 flex items-center justify-center rounded-sm bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm transition-all hover:bg-muted"
              title={copyButtonText}
            >
              <Copy className="size-3.5" />
            </button>
            {canManagePrototype && (
              <>
                <EditPrototypeDialog
                  categoryId={prototype.categoryId}
                  prototype={prototype}
                  asIcon
                  className="size-8 rounded-sm border-border!"
                />
                <DeletePrototypeButton
                  categoryId={prototype.categoryId}
                  prototypeId={prototype.id}
                  asIcon
                  className="size-8 rounded-sm border-border!"
                />
              </>
            )}
            <button
              onClick={onBack}
              className="size-8 flex items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <ArrowLeft className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1 text-[10px] font-black uppercase text-primary-foreground">
                <span className="size-1 rounded-full bg-primary-foreground animate-pulse" />
                {prototype.status}
              </div>
              <div className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1 text-[10px] font-bold text-muted-foreground">
                {prototype.visibility === 'public' ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {prototype.visibility}
              </div>
              {prototype.reviewCount > 0 && (
                <div className="flex items-center gap-1 rounded-sm bg-primary/5 border border-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
                  <Star className="size-3 fill-primary" />
                  {prototype.avgRating.toFixed(1)}
                  <span className="text-primary/50 font-medium font-mono ml-1">({prototype.reviewCount})</span>
                </div>
              )}
          </div>

          <div className="flex items-center gap-2">
            {prototype.repoUrl && (
              <a 
                href={prototype.repoUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition-all hover:bg-muted shadow-sm"
                onClick={() => toast.info('소스 코드 저장소로 이동합니다.')}
              >
                <GitBranch className="size-3 text-muted-foreground" /> Source Code
              </a>
            )}
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
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Visual Discovery</h3>
              <div className="text-[10px] font-black underline decoration-primary underline-offset-4 text-primary">PROJECT VISUALS</div>
            </div>
          </div>
          {prototype.images && prototype.images.length > 0 && (
            <div className="text-[10px] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {prototype.images.length} Imagery Assets
            </div>
          )}
        </div>
        
        {prototype.images && prototype.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {prototype.images.map((url, i) => (
              <div 
                key={i} 
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-sm border border-border bg-muted shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.99]"
                onClick={() => setExpandedImageUrl(url)}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-24 w-full flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted/20 text-[10px] font-bold text-muted-foreground/30">
            <ImageIcon className="mb-1.5 size-6 opacity-10" />
            이미지 데이터가 아직 업로드되지 않았습니다
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col ui-panel p-6 bg-muted/10 border-none">
           <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-8 items-center justify-center rounded-sm bg-background border border-border text-primary shadow-sm">
                <CheckCircle2 className="size-4" />
              </div>
              Project Roadmap
            </h3>
          </div>
          <div className="flex-1 space-y-3">
            {checklist.map((item, i) => {
              const checked = item.startsWith('[x] ')
              return (
                <div key={i} className="group flex items-center gap-3 rounded-sm bg-background p-3 border border-border/40 transition-all hover:shadow-sm hover:border-primary/20">
                  <button onClick={() => toggleChecklistItem(i)} className={`flex size-5 items-center justify-center rounded-[2px] border-2 transition-all ${checked ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25' : 'border-border bg-muted/30 hover:border-primary/40'}`}>
                    <Check className={`size-2.5 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                  <span className={`text-sm font-medium flex-1 ${checked ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'}`}>
                    {checked ? item.slice(4) : item}
                  </span>
                  {canManagePrototype && (
                    <button onClick={() => removeChecklistItem(i)} className="opacity-0 text-muted-foreground hover:text-destructive transition-all group-hover:opacity-100">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )
            })}
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
                  <Plus className="size-3" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col ui-panel p-6">
           <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex size-8 items-center justify-center rounded-sm bg-primary/5 text-primary">
                <MessageSquareText className="size-4" />
              </div>
              Peer Reviews
            </h3>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
             <div className="mb-4 grid grid-cols-2 gap-2">
               <div className="rounded-sm bg-primary/5 border border-primary/10 p-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60 mb-1">Health Score</div>
                <div className="text-2xl font-black text-primary">{prototype.avgRating.toFixed(1)}</div>
              </div>
               <div className="rounded-sm bg-muted p-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Total Feedback</div>
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
