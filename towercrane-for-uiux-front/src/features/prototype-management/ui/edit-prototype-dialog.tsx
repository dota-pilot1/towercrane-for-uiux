import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { useUpdatePrototype } from '../../../shared/api/catalog'
import type { PrototypeItem } from '../../../shared/config/catalog'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
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

type EditPrototypeDialogProps = {
  categoryId: string
  prototype: PrototypeItem
  asIcon?: boolean
}

export function EditPrototypeDialog({
  categoryId,
  prototype,
  asIcon,
}: EditPrototypeDialogProps) {
  const [open, setOpen] = useState(false)
  const updatePrototype = useUpdatePrototype(categoryId, prototype.id)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: prototype,
  })

  useEffect(() => {
    reset(prototype)
  }, [prototype, reset])

  const onSubmit = async (values: FormValues) => {
    await updatePrototype.mutateAsync(values)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {asIcon ? (
          <ActionIconButton icon={Pencil} title="수정" />
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay backdrop-blur-sm" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-8">
          <Dialog.Title className="text-xl font-semibold text-text-primary">
            프로토타입 수정
          </Dialog.Title>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">이름</span>
              <div className="space-y-1">
                <Input {...register('title')} />
                {errors.title ? <p className="text-[11px] text-rose-400">{errors.title.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">GitHub 링크</span>
              <div className="space-y-1">
                <Input {...register('repoUrl')} className="h-10" />
                {errors.repoUrl ? <p className="text-[11px] text-rose-400">{errors.repoUrl.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-text-secondary">Figma 링크</span>
              <div className="space-y-1">
                <Input {...register('figmaUrl')} placeholder="https://www.figma.com/file/..." className="h-10" />
                {errors.figmaUrl ? <p className="text-[11px] text-rose-400">{errors.figmaUrl.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-start gap-4">
              <span className="text-sm font-medium text-text-secondary mt-2.5">설명</span>
              <div className="space-y-1">
                <Input {...register('summary')} />
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
              <Button type="submit" disabled={updatePrototype.isPending} className="min-w-[100px]">
                {updatePrototype.isPending ? '저장 중...' : '확인'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
