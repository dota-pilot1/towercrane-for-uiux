import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { GitBranch, Plus, ImagePlus, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { useCreatePrototype } from '../../../shared/api/catalog'
import { Button } from '../../../shared/ui/button'
import { AddIconButton } from '../../../shared/ui/add-icon-button'
import { Input } from '../../../shared/ui/input'
import { Switch } from '../../../shared/ui/switch'
import { ToggleGroup } from '../../../shared/ui/toggle-group'
import { uploadFile } from '../../../shared/api/upload'

const schema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string(),
  figmaUrl: z.string(),
  summary: z.string().min(2).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
  images: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof schema>

type AddPrototypeDialogProps = {
  categoryId: string
  categoryTitle: string
  asIcon?: boolean
  size?: 'icon' | 'sm-icon'
}

export function AddPrototypeDialog({
  categoryId,
  categoryTitle,
  asIcon,
  size = 'icon',
}: AddPrototypeDialogProps) {
  const [open, setOpen] = useState(false)
  const createPrototype = useCreatePrototype(categoryId)

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
    defaultValues: {
      title: '',
      repoUrl: 'https://github.com/dota-pilot1/towercrane-for-uiux',
      figmaUrl: '',
      summary: '',
      status: 'draft',
      visibility: 'public',
      images: [],
      checklist: [],
    },
  })

  const [isUploading, setIsUploading] = useState(false)
  const currentImages = watch('images') || []
  const currentChecklist = watch('checklist') || []
  const [newCheckItem, setNewCheckItem] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploadPromises = Array.from(files).map((file) => uploadFile(file))
      const urls = await Promise.all(uploadPromises)
      setValue('images', [...currentImages, ...urls])
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
      currentImages.filter((_, i) => i !== index),
    )
  }

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return
    setValue('checklist', [...currentChecklist, newCheckItem.trim()])
    setNewCheckItem('')
  }

  const removeChecklistItem = (index: number) => {
    setValue(
      'checklist',
      currentChecklist.filter((_, i) => i !== index),
    )
  }

  const onSubmit = async (values: any) => {
    try {
      await createPrototype.mutateAsync(values)
      reset()
      setOpen(false)
    } catch (e) {
      console.error('Submit error:', e)
      alert('생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {asIcon ? (
          <AddIconButton size={size} title="프로토타입 추가" aria-label="프로토타입 추가" />
        ) : (
          <Button>
            <Plus className="mr-2 size-4" />
            GitHub 프로토타입 추가
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[95vw] max-w-[1280px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-0 flex flex-col overflow-hidden shadow-2xl z-50 border border-surface-border-soft">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-8 py-5 border-b border-surface-border-soft bg-surface-muted/30">
            <div>
              <Dialog.Title className="text-xl font-bold text-text-primary">
                새 프로토타입 작성
              </Dialog.Title>
              <p className="text-sm text-text-secondary mt-1">{categoryTitle} 카테고리</p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
                취소 (ESC)
              </Button>
              <Button 
                onClick={handleSubmit(onSubmit)} 
                disabled={createPrototype.isPending} 
                className="min-w-[120px] shadow-sm"
              >
                {createPrototype.isPending ? '생성 중...' : '프로토타입 생성'}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Column 1: Core Specifications */}
              <div className="space-y-8">
                <div className="flex items-center gap-2 border-b border-surface-border-soft pb-3">
                  <div className="flex size-6 items-center justify-center rounded-full bg-brand-glass text-xs font-bold text-brand-primary">1</div>
                  <h4 className="text-sm font-bold text-text-primary">기본 정보</h4>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-[13px] font-medium text-text-secondary ml-1">이름</span>
                    <Input {...register('title')} placeholder="예: Approval Flow Prototype" className="h-11" />
                    {errors.title ? <p className="text-[11px] text-danger-500 font-medium ml-1">{errors.title.message}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[13px] font-medium text-text-secondary ml-1">GitHub 링크</span>
                    <div className="relative">
                      <GitBranch className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-text-muted" />
                      <Input {...register('repoUrl')} className="pl-10 h-11" />
                    </div>
                    {errors.repoUrl ? <p className="text-[11px] text-danger-500 font-medium ml-1">{errors.repoUrl.message}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[13px] font-medium text-text-secondary ml-1">Figma 링크</span>
                    <Input {...register('figmaUrl')} placeholder="https://www.figma.com/file/..." className="h-11" />
                    {errors.figmaUrl ? <p className="text-[11px] text-danger-500 font-medium ml-1">{errors.figmaUrl.message}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[13px] font-medium text-text-secondary ml-1">설명</span>
                    <Input {...register('summary')} placeholder="이 프로토타입에서 다루는 범위를 적습니다" className="h-11" />
                    {errors.summary ? (
                      <p className="text-[11px] text-danger-500 font-medium ml-1">{errors.summary.message}</p>
                    ) : null}
                  </div>
                </div>

                <div className="pt-4 space-y-6">
                  <div className="space-y-3">
                    <span className="text-[13px] font-medium text-text-secondary ml-1">작업 상태</span>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <ToggleGroup
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-wrap w-full"
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
                    <span className="text-[13px] font-medium text-text-secondary ml-1">공개 여부</span>
                    <div className="flex h-12 flex-1 items-center px-4 rounded-xl border border-surface-border-soft bg-surface-muted/30">
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

              {/* Column 2: Visual Documentation */}
              <div className="space-y-8 h-full flex flex-col">
                <div className="flex items-center gap-2 border-b border-surface-border-soft pb-3">
                  <div className="flex size-6 items-center justify-center rounded-full bg-brand-glass text-xs font-bold text-brand-primary">2</div>
                  <h4 className="text-sm font-bold text-text-primary">상세 이미지</h4>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 ui-panel-soft min-h-[300px] rounded-[24px] p-5 flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-2 pb-4">
                      {currentImages.length === 0 ? (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-surface-border-soft rounded-2xl gap-3 text-text-muted">
                          <ImageIcon className="size-10 opacity-30" />
                          <p className="text-xs font-medium text-center">이미지를 추가해주세요<br/><span className="text-[10px] font-normal tracking-wide opacity-70">(멀티 선택 가능)</span></p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {currentImages.map((url, index) => (
                            <div key={url + index} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-strong border border-surface-border-soft">
                              <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/60 text-text-on-brand opacity-0 group-hover:opacity-100 transition-all hover:bg-danger-500 hover:scale-110 shadow-lg"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="relative shrink-0 flex items-center justify-center h-12 w-full rounded-xl bg-surface-strong border border-surface-border-soft text-text-primary font-medium text-sm cursor-pointer hover:border-brand-primary/50 transition-colors disabled:opacity-50 shadow-sm mt-auto">
                      {isUploading ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <ImagePlus className="size-4 mr-2" />
                      )}
                      {isUploading ? '업로드 중...' : '이미지 파일 선택'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Column 3: Implementation Checklist */}
              <div className="space-y-8 h-full flex flex-col">
                <div className="flex items-center gap-2 border-b border-surface-border-soft pb-3">
                  <div className="flex size-6 items-center justify-center rounded-full bg-brand-glass text-xs font-bold text-brand-primary">3</div>
                  <h4 className="text-sm font-bold text-text-primary">구현 체크리스트</h4>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 ui-panel-soft min-h-[300px] rounded-[24px] p-5 flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-4">
                      {currentChecklist.length === 0 ? (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-surface-border-soft rounded-2xl gap-3 text-text-muted">
                          <div className="size-10 rounded-full bg-surface-muted flex items-center justify-center">
                            <X className="size-5 opacity-30" />
                          </div>
                          <p className="text-xs font-medium">체크리스트가 비어있습니다</p>
                        </div>
                      ) : (
                        currentChecklist.map((item, index) => (
                          <div key={index} className="group flex items-start gap-3 bg-surface-strong p-3 rounded-xl border border-surface-border-soft hover:border-brand-glass transition-colors">
                            <div className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-primary/60" />
                            <span className="flex-1 text-sm text-text-primary leading-tight">{item}</span>
                            <button
                              type="button"
                              onClick={() => removeChecklistItem(index)}
                              className="size-6 shrink-0 flex items-center justify-center rounded-md text-text-muted hover:text-danger-500 hover:bg-danger-glass opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="relative shrink-0 mt-auto">
                      <Input
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        placeholder="체크리스트 추가..."
                        className="h-11 text-sm bg-surface-strong border-surface-border-soft focus:border-brand-primary/50 pr-12"
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addChecklistItem()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center rounded-lg bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-border-soft transition-colors"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
