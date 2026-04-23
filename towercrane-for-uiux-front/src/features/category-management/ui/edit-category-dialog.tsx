import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useUpdateCategory } from '../../../shared/api/catalog'
import type { ScenarioCategory } from '../../../shared/config/catalog'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

const schema = z.object({
  title: z.string().min(2).max(40),
  summary: z.string().min(8).max(140),
  group: z.string().min(2).max(20),
})

type FormValues = z.infer<typeof schema>

type EditCategoryDialogProps = {
  category: ScenarioCategory
  asIcon?: boolean
}

export function EditCategoryDialog({ category, asIcon }: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const updateCategory = useUpdateCategory(category.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: category.title,
      summary: category.summary,
      group: category.group,
    },
  })

  useEffect(() => {
    reset({
      title: category.title,
      summary: category.summary,
      group: category.group,
    })
  }, [category, reset])

  const onSubmit = async (values: FormValues) => {
    await updateCategory.mutateAsync(values)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {asIcon ? (
          <ActionIconButton icon={Pencil} title="카테고리 수정" />
        ) : (
          <Button variant="secondary">
            <Pencil className="mr-2 size-4" />
            카테고리 수정
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-6 shadow-2xl border border-surface-border-soft">
          <Dialog.Title className="text-xl font-semibold text-text-primary">
            카테고리 수정
          </Dialog.Title>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-2">
              <span className="text-sm text-text-secondary">카테고리 이름</span>
              <Input {...register('title')} />
              {errors.title ? <span className="text-xs text-rose-300">{errors.title.message}</span> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-text-secondary">요약</span>
              <Input {...register('summary')} />
              {errors.summary ? <span className="text-xs text-rose-300">{errors.summary.message}</span> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-text-secondary">그룹</span>
              <Input {...register('group')} />
              {errors.group ? <span className="text-xs text-rose-300">{errors.group.message}</span> : null}
            </label>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? '저장 중...' : '저장'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                취소
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
