import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { GitBranch, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { useCreatePrototype } from '../../../shared/api/catalog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Switch } from '../../../shared/ui/switch'
import { ToggleGroup } from '../../../shared/ui/toggle-group'

const schema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string().url(),
  figmaUrl: z.string().url().optional().or(z.literal('')),
  summary: z.string().min(8).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
})

type FormValues = z.infer<typeof schema>

type AddPrototypeDialogProps = {
  categoryId: string
  categoryTitle: string
  asIcon?: boolean
}

export function AddPrototypeDialog({
  categoryId,
  categoryTitle,
  asIcon,
}: AddPrototypeDialogProps) {
  const [open, setOpen] = useState(false)
  const createPrototype = useCreatePrototype(categoryId)

  const {
    register,
    handleSubmit,
    reset,
    control,
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
    },
  })

  const onSubmit = async (values: FormValues) => {
    await createPrototype.mutateAsync(values)
    reset()
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {asIcon ? (
          <Button size="icon" tone="brand" title="프로토타입 추가">
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 size-4" />
            GitHub 프로토타입 추가
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay backdrop-blur-sm" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-8">
          <Dialog.Title className="text-xl font-semibold text-text-primary">
            {categoryTitle} 프로토타입 추가
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-text-secondary">
            오른쪽 보드에서 바로 공유할 GitHub 저장소 또는 폴더 링크를 연결합니다.
          </Dialog.Description>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">이름</span>
              <div className="space-y-1">
                <Input {...register('title')} placeholder="예: Approval Flow Prototype" />
                {errors.title ? <p className="text-[11px] text-rose-400">{errors.title.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">GitHub 링크</span>
              <div className="space-y-1">
                <div className="relative">
                  <GitBranch className="pointer-events-none absolute left-4 top-3 size-4 text-text-muted" />
                  <Input {...register('repoUrl')} className="pl-11 h-10" />
                </div>
                {errors.repoUrl ? <p className="text-[11px] text-rose-400">{errors.repoUrl.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">Figma 링크</span>
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute left-4 top-3 size-4 flex items-center justify-center font-bold text-text-muted text-[10px]">F</div>
                  <Input {...register('figmaUrl')} placeholder="https://www.figma.com/file/..." className="pl-11 h-10" />
                </div>
                {errors.figmaUrl ? <p className="text-[11px] text-rose-400">{errors.figmaUrl.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-start gap-4">
              <span className="text-sm font-medium text-text-secondary mt-2.5">설명</span>
              <div className="space-y-1">
                <Input {...register('summary')} placeholder="이 프로토타입에서 다루는 범위를 적습니다" />
                {errors.summary ? (
                  <p className="text-[11px] text-rose-400">{errors.summary.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-[1.2fr_1fr] gap-10 pt-4 border-t border-surface-border-soft">
              <div className="flex items-center gap-5">
                <span className="text-sm font-medium text-text-secondary shrink-0">상태</span>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      value={field.value}
                      onChange={field.onChange}
                      className="flex-1"
                      options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'building', label: 'Build' },
                        { value: 'ready', label: 'Ready' },
                      ]}
                    />
                  )}
                />
              </div>

              <div className="flex items-center gap-5">
                <span className="text-sm font-medium text-text-secondary shrink-0">공개 여부</span>
                <div className="flex h-11 flex-1 items-center px-4 rounded-2xl border border-surface-border-soft bg-surface-muted">
                  <Controller
                    name="visibility"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value === 'public'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'public' : 'private')}
                        label={field.value === 'public' ? 'Public' : 'Private'}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-border-soft">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createPrototype.isPending} className="min-w-[100px]">
                {createPrototype.isPending ? '저장 중...' : '확인'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
