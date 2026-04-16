import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateCategory } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

const schema = z.object({
  title: z.string().min(2).max(40),
  summary: z.string().min(8).max(140),
  group: z.string().min(2).max(20),
})

type FormValues = z.infer<typeof schema>

export function AddCategoryDialog() {
  const [open, setOpen] = useState(false)
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)
  const createCategory = useCreateCategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      summary: '',
      group: 'custom',
    },
  })

  const onSubmit = async (values: FormValues) => {
    const category = await createCategory.mutateAsync(values)
    setActiveCategory(category.id)
    reset()
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 size-4" />
          카테고리 추가
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-6">
          <Dialog.Title className="text-xl font-semibold text-white">
            사이드바 카테고리 추가
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-300">
            20개 기본 시나리오는 시드일 뿐이고, 필요한 패턴 카테고리를 계속 붙일 수 있습니다.
          </Dialog.Description>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">카테고리 이름</span>
              <Input {...register('title')} placeholder="예: 승인 플로우 UI" />
              {errors.title ? <span className="text-xs text-rose-300">{errors.title.message}</span> : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">요약</span>
              <Input
                {...register('summary')}
                placeholder="이 카테고리에서 다루는 핵심 시나리오를 짧게 적습니다"
              />
              {errors.summary ? (
                <span className="text-xs text-rose-300">{errors.summary.message}</span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">그룹</span>
              <Input {...register('group')} placeholder="foundation / workflow / custom" />
              {errors.group ? <span className="text-xs text-rose-300">{errors.group.message}</span> : null}
            </label>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? '저장 중...' : '저장'}
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
