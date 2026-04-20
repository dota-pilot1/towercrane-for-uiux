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
  const [checklistDraft, setChecklistDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle')
  const checklist = prototype.checklist ?? []
  const tags = prototype.tags ?? []
  const canEditChecklist = isAuthenticated
  const imageCount = prototype.images?.length ?? 0
  const tagCount = tags.length

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const updateChecklist = async (nextChecklist: string[]) => {
    await updatePrototype.mutateAsync({ checklist: nextChecklist })
  }

  const updateTags = async (nextTags: string[]) => {
    await updatePrototype.mutateAsync({ tags: nextTags })
  }

  const addChecklistItem = async () => {
    const nextItem = checklistDraft.trim()
    if (!nextItem || updatePrototype.isPending) return

    try {
      await updateChecklist([...checklist, nextItem])
      setChecklistDraft('')
    } catch (error) {
      console.error('Checklist add failed:', error)
      alert('체크리스트 추가에 실패했습니다.')
    }
  }

  const removeChecklistItem = async (index: number) => {
    if (updatePrototype.isPending) return

    try {
      await updateChecklist(checklist.filter((_, itemIndex) => itemIndex !== index))
    } catch (error) {
      console.error('Checklist remove failed:', error)
      alert('체크리스트 삭제에 실패했습니다.')
    }
  }

  const addTag = async () => {
    const nextTag = tagDraft.trim().replace(/^#/, '')
    if (!nextTag || updatePrototype.isPending) return
    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setTagDraft('')
      return
    }

    try {
      await updateTags([...tags, nextTag])
      setTagDraft('')
    } catch (error) {
      console.error('Tag add failed:', error)
      alert('태그 추가에 실패했습니다.')
    }
  }

  const removeTag = async (index: number) => {
    if (updatePrototype.isPending) return

    try {
      await updateTags(tags.filter((_, tagIndex) => tagIndex !== index))
    } catch (error) {
      console.error('Tag remove failed:', error)
      alert('태그 삭제에 실패했습니다.')
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'prototype-detail')
      url.searchParams.set('categoryId', prototype.categoryId)
      url.searchParams.set('prototypeId', prototype.id)
      await navigator.clipboard.writeText(url.toString())
      setCopyState('done')
    } catch (error) {
      console.error('Copy failed:', error)
      setCopyState('error')
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2.5">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="ui-text-primary text-[2.25rem] font-bold tracking-tight">
                {prototype.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed ui-text-secondary">
                {prototype.summary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[999px] border border-brand-border bg-brand-glass px-3 py-1 text-[11px] font-bold uppercase text-brand-primary">
                  {prototype.status}
                </span>
                <span className="inline-flex items-center gap-1 rounded-[999px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] ui-text-secondary">
                  {prototype.visibility === 'public' ? (
                    <Globe className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  {prototype.visibility}
                </span>
                <span className="inline-flex items-center gap-1 rounded-[999px] border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {prototype.avgRating.toFixed(1)}
                  <span className="text-amber-300/60 font-normal">
                    ({prototype.reviewCount})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-[999px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] ui-text-secondary">
                  <Clock className="size-3.5" />
                  {new Date(prototype.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="secondary"
                onClick={handleCopyLink}
                className="h-10 min-w-[112px] justify-center rounded-xl border-surface-border-soft bg-surface-muted"
              >
                <Copy className="mr-2 size-4" />
                {copyState === 'done'
                  ? '복사됨'
                  : copyState === 'error'
                    ? '실패'
                    : '링크 복사'}
              </Button>
              {canManagePrototype ? (
                <DeletePrototypeButton
                  categoryId={prototype.categoryId}
                  prototypeId={prototype.id}
                  asIcon
                />
              ) : null}
              <Button variant="secondary" onClick={onBack}>
                <ArrowLeft className="mr-2 size-4" />
                목록으로
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <MetaCard label="Checklist" value={`${checklist.length}`} icon={<CheckCircle2 className="size-4" />} />
            <MetaCard label="Images" value={`${imageCount}`} icon={<ImageIcon className="size-4" />} />
            <MetaCard label="Tags" value={`${tagCount}`} icon={<Tag className="size-4" />} />
            <MetaCard label="Reviews" value={`${prototype.reviewCount}`} icon={<MessageSquareText className="size-4" />} />
          </div>
        </div>

        <div className="rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Repository
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text-primary">GitHub 링크</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-surface-border-soft bg-surface-muted/60 p-3.5">
            <div className="min-w-0 flex-1">
              <a
                href={prototype.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm leading-5 text-text-primary underline-offset-4 hover:underline"
              >
                {prototype.repoUrl}
              </a>
            </div>
            <div className="flex items-center gap-2 self-start">
              {canManagePrototype ? (
                <EditPrototypeDialog
                  categoryId={prototype.categoryId}
                  prototype={prototype}
                  asIcon
                />
              ) : null}
              <a
                href={prototype.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--surface-border)] bg-[var(--surface-raised)] text-text-secondary transition hover:bg-[var(--surface-strong)] hover:text-text-primary"
                aria-label="GitHub 링크 열기"
                title="GitHub 링크 열기"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>

          <div className="mt-4 border-t border-surface-border-soft pt-4">
            <div className="mb-2 flex items-center gap-2">
              <Tag className="size-4 text-text-muted" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
                Tags
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1 rounded-[999px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-text-secondary"
                  >
                    #{tag}
                    {canManagePrototype ? (
                      <button
                        type="button"
                        onClick={() => void removeTag(index)}
                        disabled={updatePrototype.isPending}
                        className="inline-flex size-4 items-center justify-center rounded-full text-text-muted transition hover:text-rose-500 disabled:opacity-40"
                        aria-label={`태그 ${tag} 삭제`}
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </span>
                ))
              ) : (
                <p className="text-xs text-text-muted">등록된 태그가 없습니다.</p>
              )}
            </div>

            {canManagePrototype ? (
              <div className="relative mt-2.5">
                <Input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  placeholder="태그 추가"
                  className="h-10 pr-12"
                  disabled={updatePrototype.isPending}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void addTag()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void addTag()}
                  disabled={updatePrototype.isPending || tagDraft.trim().length === 0}
                  className="absolute right-1.5 top-1.5 bottom-1.5 inline-flex aspect-square items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-colors hover:bg-surface-border-soft hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="태그 추가"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="grid min-h-0 gap-2.5 lg:grid-cols-2">
          <section className="flex min-h-[560px] flex-col rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4.5">
            <div className="mb-4 flex items-center gap-2 border-b border-surface-border-soft pb-2.5">
              <div className="flex size-6 items-center justify-center rounded-full bg-brand-glass text-xs font-bold text-brand-primary">
                1
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">
                Visual Evidence
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {prototype.images && prototype.images.length > 0 ? (
                <div className="space-y-4">
                  {prototype.images.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative aspect-video overflow-hidden rounded-2xl border border-surface-border-soft bg-surface-strong shadow-sm"
                    >
                      <img
                        src={url}
                        alt={`Documentation ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border-soft p-8 text-text-muted">
                  <ImageIcon className="size-12 opacity-20" />
                  <p className="text-sm font-medium">등록된 상세 이미지가 없습니다</p>
                </div>
              )}
            </div>

          </section>

          <section className="flex min-h-[560px] flex-col rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4.5">
            <div className="mb-4 flex items-center gap-2 border-b border-surface-border-soft pb-2.5">
              <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-blue-500">
                2
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">
                Checklist
              </h3>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {updatePrototype.isPending ? (
                <div className="mb-2 flex justify-end">
                  <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                    <Loader2 className="size-3.5 animate-spin" />
                    저장 중
                  </span>
                </div>
              ) : null}

              {canEditChecklist ? (
                <div className="relative mb-3">
                  <Input
                    value={checklistDraft}
                    onChange={(event) => setChecklistDraft(event.target.value)}
                    placeholder="체크리스트를 바로 추가하세요"
                    className="h-11 pr-12"
                    disabled={updatePrototype.isPending}
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing) return
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void addChecklistItem()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addChecklistItem()}
                    disabled={updatePrototype.isPending || checklistDraft.trim().length === 0}
                    className="absolute right-1.5 top-1.5 bottom-1.5 inline-flex aspect-square items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-colors hover:bg-surface-border-soft hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="체크리스트 추가"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {checklist.length > 0 ? (
                  checklist.map((item, idx) => (
                    <div
                      key={`${item}-${idx}`}
                      className="group flex items-start gap-3 rounded-xl border border-surface-border-soft bg-surface-strong p-3.5 transition-colors hover:border-brand-glass"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                      <span className="flex-1 text-sm font-medium leading-tight text-text-primary">
                        {item}
                      </span>
                      {canEditChecklist ? (
                        <button
                          type="button"
                          onClick={() => void removeChecklistItem(idx)}
                          disabled={updatePrototype.isPending}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-rose-500/10 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="체크리스트 삭제"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border-soft text-text-muted opacity-70">
                    <Info className="size-8 opacity-20" />
                    <p className="text-xs">체크리스트가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

          <section className="flex min-h-[560px] flex-col rounded-[16px] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4.5">
          <div className="mb-4 flex items-center gap-2 border-b border-surface-border-soft pb-2.5">
            <div className="flex size-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-rose-500">
              3
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">
              Feedback Loop
            </h3>
          </div>

          <div className="mb-4 grid gap-2.5 md:grid-cols-2">
            <div className="rounded-[22px] border border-brand-border bg-brand-glass p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary opacity-60">
                Community Score
              </div>
              <div className="mt-2 text-3xl font-black tracking-tighter text-brand-primary">
                {prototype.reviewCount > 0 ? prototype.avgRating.toFixed(1) : '0.0'}
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                Participants
              </div>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {prototype.reviewCount}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
        </section>
      </div>
    </div>
  )
}

function MetaCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-text-primary">{value}</div>
    </div>
  )
}
