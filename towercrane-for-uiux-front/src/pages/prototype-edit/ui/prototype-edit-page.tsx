import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Images,
  List,
  Loader2,
  Maximize2,
  Plus,
  Save,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'

import {
  useCategory,
  useUpdatePrototype,
} from '../../../shared/api/catalog'
import { uploadFile } from '../../../shared/api/upload'
import type { PrototypeItem } from '../../../shared/config/catalog'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Switch } from '../../../shared/ui/switch'
import { Textarea } from '../../../shared/ui/textarea'
import { ToggleGroup } from '../../../shared/ui/toggle-group'

const schema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string().max(2048).optional().or(z.literal('')),
  demoUrl: z.string().max(2048).optional().or(z.literal('')),
  figmaUrl: z.string().max(2048).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  summary: z.string().min(2).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
  images: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof schema>
type ImageViewMode = 'gallery' | 'table'

const emptyDefaults: FormValues = {
  title: '',
  repoUrl: '',
  demoUrl: '',
  figmaUrl: '',
  notes: '',
  summary: '',
  status: 'draft',
  visibility: 'public',
  images: [],
  checklist: [],
}

export function PrototypeEditPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as {
    workspaceId?: string
    categoryId?: string
    prototypeId?: string
  }
  const categoryId = params.categoryId ?? ''
  const prototypeId = params.prototypeId ?? ''
  const categoryQuery = useCategory(categoryId)
  const prototype = useMemo(
    () => categoryQuery.data?.prototypes.find((item) => item.id === prototypeId) ?? null,
    [categoryQuery.data?.prototypes, prototypeId],
  )
  const updatePrototype = useUpdatePrototype(categoryId, prototypeId)
  const [isUploading, setIsUploading] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>('gallery')
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const watchedImages = watch('images')
  const watchedChecklist = watch('checklist')
  const currentImages = useMemo(() => watchedImages ?? [], [watchedImages])
  const currentChecklist = useMemo(() => watchedChecklist ?? [], [watchedChecklist])
  const imageItems = useMemo(
    () => currentImages.map((url, index) => ({ id: `${index}:${url}`, url, index })),
    [currentImages],
  )
  const imageDragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    if (!prototype) return
    reset(toFormValues(prototype))
  }, [prototype, reset])

  const goBack = () => {
    if (params.workspaceId) {
      navigate({
        to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
        params: { workspaceId: params.workspaceId, categoryId },
        search: { prototypeId },
      })
      return
    }

    navigate({
      to: '/prototype/$categoryId',
      params: { categoryId },
      search: { prototypeId },
    })
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await updatePrototype.mutateAsync({
        ...values,
        figmaUrl: '',
      })
      goBack()
    } catch (error) {
      console.error('Submit error:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadFile(file)))
      setValue('images', [...currentImages, ...urls], { shouldDirty: true })
      event.target.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setValue(
      'images',
      currentImages.filter((_, currentIndex) => currentIndex !== index),
      { shouldDirty: true },
    )
  }

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = imageItems.findIndex((item) => item.id === active.id)
    const newIndex = imageItems.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    setValue('images', arrayMove(currentImages, oldIndex, newIndex), {
      shouldDirty: true,
    })
  }

  const addChecklistItem = () => {
    const nextItem = newCheckItem.trim()
    if (!nextItem) return
    setValue('checklist', [...currentChecklist, nextItem])
    setNewCheckItem('')
  }

  const removeChecklistItem = (index: number) => {
    setValue(
      'checklist',
      currentChecklist.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  if (categoryQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-160px)] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!categoryQuery.data || !prototype) {
    return (
      <Card className="mx-auto mt-16 max-w-xl rounded-sm border border-surface-border bg-surface-raised p-8 text-center">
        <h1 className="text-lg font-bold text-text-primary">프로토타입을 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-text-secondary">
          주제 또는 프로토타입이 삭제되었는지 확인해주세요.
        </p>
        <Button type="button" variant="secondary" className="mt-6" onClick={() => navigate({ to: '/prototype' })}>
          <ArrowLeft className="size-4" />
          Prototype으로 돌아가기
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-surface-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 px-2"
              onClick={goBack}
              aria-label="상세 화면으로 돌아가기"
              title="상세 화면으로 돌아가기"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-brand-primary">
                Prototype Edit
              </p>
              <h1 className="truncate text-2xl font-black text-text-primary">
                프로토타입 수정
              </h1>
              <p className="mt-1 truncate text-sm text-text-secondary">
                {categoryQuery.data.title} / {prototype.title}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" onClick={goBack}>
              취소
            </Button>
            <Button type="submit" disabled={updatePrototype.isPending || isUploading} className="min-w-[128px]">
              {updatePrototype.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {updatePrototype.isPending ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)_minmax(360px,520px)]">
        <section className="space-y-5">
          <SectionTitle index="01" title="기본 정보" />
          <div className="ui-panel p-5 sm:p-6">
            <div className="space-y-5">
              <Field label="이름" error={errors.title?.message}>
                <Input {...register('title')} placeholder="기능 명칭을 입력하세요" className="h-11" />
              </Field>

              <Field label="GitHub 링크 (선택)" error={errors.repoUrl?.message}>
                <div className="relative">
                  <GitBranch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    {...register('repoUrl')}
                    className="h-11"
                    placeholder="https://github.com/..."
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </Field>

              <Field label="운영 URL (선택)" error={errors.demoUrl?.message}>
                <div className="relative">
                  <ExternalLink className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    {...register('demoUrl')}
                    placeholder="https://service.example.com"
                    className="h-11"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </Field>

              <Field label="설명" error={errors.summary?.message}>
                <Input {...register('summary')} placeholder="핵심 기능을 한 줄로 설명해주세요" className="h-11" />
              </Field>

              <Field label="노트 정리 (선택)" error={errors.notes?.message}>
                <Textarea
                  {...register('notes')}
                  placeholder="참고 맥락, 구현 포인트, URL 설명을 정리합니다"
                  rows={6}
                  className="resize-none"
                />
              </Field>
            </div>
          </div>

          <div className="ui-panel p-5 sm:p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[13px] font-bold ui-text-primary">작업 상태</span>
                  <span className="text-[10px] font-black uppercase tracking-normal ui-text-muted">
                    Current Phase
                  </span>
                </div>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full flex-wrap"
                      options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'building', label: 'Building' },
                        { value: 'ready', label: 'Ready' },
                      ]}
                    />
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[13px] font-bold ui-text-primary">공개 범위</span>
                  <span className="text-[10px] font-black uppercase tracking-normal ui-text-muted">
                    Visibility
                  </span>
                </div>
                <div className="flex h-12 items-center rounded-xl border border-surface-border bg-background px-4 shadow-sm">
                  <Controller
                    name="visibility"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value === 'public'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'public' : 'private')}
                        label={field.value === 'public' ? 'Public (외부 공개)' : 'Private (내부 전용)'}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle index="02" title="상세 이미지" />
            <div className="flex rounded-lg border border-surface-border-soft bg-surface-muted p-1">
              <ImageViewButton
                mode="gallery"
                activeMode={imageViewMode}
                icon={Images}
                label="갤러리"
                onSelect={setImageViewMode}
              />
              <ImageViewButton
                mode="table"
                activeMode={imageViewMode}
                icon={List}
                label="테이블"
                onSelect={setImageViewMode}
              />
            </div>
          </div>
          <div className="ui-panel flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <div className="min-h-[420px] flex-1 overflow-y-auto pr-1">
              {currentImages.length === 0 ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border-soft text-text-muted">
                  <ImageIcon className="size-10 opacity-30" />
                  <p className="text-center text-xs font-medium">
                    이미지를 추가해주세요
                    <br />
                    <span className="text-[10px] font-normal tracking-normal opacity-70">
                      멀티 선택 가능
                    </span>
                  </p>
                </div>
              ) : imageViewMode === 'gallery' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {currentImages.map((url, index) => (
                    <div
                      key={url + index}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-surface-border-soft bg-surface-strong"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(url)}
                        className="block h-full w-full cursor-zoom-in"
                        aria-label={`${index + 1}번째 이미지 크게 보기`}
                      >
                        <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                      <div className="pointer-events-none absolute inset-0 bg-[rgb(0_0_0/0%)] transition-colors group-hover:bg-[rgb(0_0_0/20%)]" />
                      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-surface-raised px-2 py-1 text-[11px] font-bold text-text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <Maximize2 className="size-3" />
                        크게 보기
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-surface-raised text-text-primary opacity-0 shadow-lg transition-all hover:bg-danger-glass hover:text-danger-500 group-hover:opacity-100"
                        aria-label="이미지 삭제"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <DndContext sensors={imageDragSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                  <SortableContext items={imageItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="overflow-hidden rounded-xl border border-surface-border-soft">
                      <div className="grid grid-cols-[44px_72px_minmax(0,1fr)_72px] items-center gap-3 border-b border-surface-border-soft bg-surface-muted px-3 py-2 text-[11px] font-black uppercase tracking-normal text-text-muted">
                        <span>순서</span>
                        <span>이미지</span>
                        <span>URL</span>
                        <span className="text-right">관리</span>
                      </div>
                      <div className="divide-y divide-surface-border-soft bg-surface-raised">
                        {imageItems.map((item) => (
                          <SortableImageTableRow
                            key={item.id}
                            item={item}
                            onPreview={() => setPreviewImageUrl(item.url)}
                            onRemove={() => removeImage(item.index)}
                          />
                        ))}
                      </div>
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <label className="relative mt-5 flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-surface-border-soft bg-surface-strong text-sm font-medium text-text-primary shadow-sm transition-colors hover:border-brand-border">
              {isUploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 size-4" />
              )}
              {isUploading ? '업로드 중...' : '이미지 파일 선택'}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col gap-5">
          <SectionTitle index="03" title="구현 체크리스트" active />
          <div className="ui-panel flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <div className="min-h-[420px] flex-1 space-y-2.5 overflow-y-auto pr-1">
              {currentChecklist.length === 0 ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border-soft text-text-muted">
                  <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted">
                    <X className="size-5 opacity-30" />
                  </div>
                  <p className="text-xs font-medium">체크리스트가 비어있습니다</p>
                </div>
              ) : (
                currentChecklist.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="group flex items-start gap-3 rounded-xl border border-surface-border-soft bg-surface-strong p-3 transition-colors hover:border-brand-border"
                  >
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-primary" />
                    <span className="flex-1 text-sm leading-relaxed text-text-primary">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted opacity-0 transition-all hover:bg-danger-glass hover:text-danger-500 group-hover:opacity-100"
                      aria-label="체크리스트 삭제"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="relative mt-5 shrink-0">
              <Input
                value={newCheckItem}
                onChange={(event) => setNewCheckItem(event.target.value)}
                placeholder="체크리스트 추가..."
                className="h-11 border-surface-border-soft bg-surface-strong pr-12 text-sm focus:border-brand-border"
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addChecklistItem()
                  }
                }}
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="absolute bottom-1.5 right-1.5 top-1.5 flex aspect-square items-center justify-center rounded-lg bg-surface-muted text-text-secondary transition-colors hover:bg-surface-border-soft hover:text-text-primary"
                aria-label="체크리스트 추가"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <ImagePreviewDialog
        imageUrl={previewImageUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(null)
        }}
      />
    </form>
  )
}

function toFormValues(prototype: PrototypeItem): FormValues {
  return {
    ...emptyDefaults,
    ...prototype,
    repoUrl: prototype.repoUrl ?? '',
    demoUrl: prototype.demoUrl ?? prototype.figmaUrl ?? '',
    figmaUrl: '',
    notes: prototype.notes ?? '',
    images: prototype.images ?? [],
    checklist: prototype.checklist ?? [],
  }
}

function SectionTitle({
  index,
  title,
  active = false,
}: {
  index: string
  title: string
  active?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          active
            ? 'flex size-7 items-center justify-center rounded-full bg-brand-primary text-[10px] font-black text-primary-foreground shadow-lg shadow-brand-primary/20'
            : 'flex size-7 items-center justify-center rounded-full border-2 border-brand-primary text-[11px] font-black text-brand-primary'
        }
      >
        {index}
      </div>
      <h2 className="text-xs font-black uppercase tracking-widest text-text-primary">{title}</h2>
    </div>
  )
}

function ImageViewButton({
  mode,
  activeMode,
  icon: Icon,
  label,
  onSelect,
}: {
  mode: ImageViewMode
  activeMode: ImageViewMode
  icon: LucideIcon
  label: string
  onSelect: (mode: ImageViewMode) => void
}) {
  const active = mode === activeMode

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={
        active
          ? 'flex h-8 items-center gap-1.5 rounded-md bg-surface-raised px-3 text-xs font-bold text-text-primary shadow-sm'
          : 'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-text-secondary transition-colors hover:text-text-primary'
      }
      aria-pressed={active}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function SortableImageTableRow({
  item,
  onPreview,
  onRemove,
}: {
  item: { id: string; url: string; index: number }
  onPreview: () => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'grid grid-cols-[44px_72px_minmax(0,1fr)_72px] items-center gap-3 bg-brand-glass px-3 py-2 shadow-lg'
          : 'grid grid-cols-[44px_72px_minmax(0,1fr)_72px] items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-muted'
      }
    >
      <button
        type="button"
        className="flex size-8 cursor-grab items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary active:cursor-grabbing"
        aria-label={`${item.index + 1}번째 이미지 순서 이동`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="size-14 cursor-zoom-in overflow-hidden rounded-md border border-surface-border-soft bg-surface-strong"
        aria-label={`${item.index + 1}번째 이미지 크게 보기`}
      >
        <img src={item.url} alt={`Preview ${item.index + 1}`} className="h-full w-full object-cover" />
      </button>
      <div className="min-w-0">
        <div className="text-xs font-bold text-text-primary">{item.index + 1}번째 이미지</div>
        <div className="mt-1 truncate text-xs text-text-muted" title={item.url}>
          {item.url}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger-glass hover:text-danger-500"
          aria-label="이미지 삭제"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ImagePreviewDialog({
  imageUrl,
  onOpenChange,
}: {
  imageUrl: string | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={Boolean(imageUrl)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="fixed inset-4 z-[221] flex flex-col rounded-2xl border border-surface-border-soft bg-surface-raised p-3 shadow-2xl md:inset-8">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-bold text-text-primary">이미지 미리보기</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-secondary transition-colors hover:text-text-primary"
                aria-label="미리보기 닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-surface-muted p-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="선택한 이미지 미리보기"
                className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
              />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="ml-1 text-[13px] font-medium text-text-secondary">{label}</span>
      {children}
      {error ? <p className="ml-1 text-[11px] font-medium text-danger-500">{error}</p> : null}
    </label>
  )
}
