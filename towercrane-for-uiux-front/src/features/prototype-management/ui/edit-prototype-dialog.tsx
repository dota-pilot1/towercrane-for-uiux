import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useUpdatePrototype } from '../../../shared/api/catalog'
import type { PrototypeItem } from '../../../shared/config/catalog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

const schema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string().url(),
  summary: z.string().min(8).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
})

type FormValues = z.infer<typeof schema>

type EditPrototypeDialogProps = {
  categoryId: string
  prototype: PrototypeItem
}

export function EditPrototypeDialog({
  categoryId,
  prototype,
}: EditPrototypeDialogProps) {
  const [open, setOpen] = useState(false)
  const updatePrototype = useUpdatePrototype(categoryId, prototype.id)

  const {
    register,
    handleSubmit,
    reset,
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
        <Button variant="ghost" className="h-8 px-3">
          <Pencil className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[32px] p-6">
          <Dialog.Title className="text-xl font-semibold text-white">
            프로토타입 수정
          </Dialog.Title>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">이름</span>
              <Input {...register('title')} />
              {errors.title ? <span className="text-xs text-rose-300">{errors.title.message}</span> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">GitHub 링크</span>
              <Input {...register('repoUrl')} />
              {errors.repoUrl ? <span className="text-xs text-rose-300">{errors.repoUrl.message}</span> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">설명</span>
              <Input {...register('summary')} />
              {errors.summary ? <span className="text-xs text-rose-300">{errors.summary.message}</span> : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">상태</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none"
                  {...register('status')}
                >
                  <option value="draft">draft</option>
                  <option value="building">building</option>
                  <option value="ready">ready</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">공개 범위</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none"
                  {...register('visibility')}
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={updatePrototype.isPending}>
                {updatePrototype.isPending ? '저장 중...' : '저장'}
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
