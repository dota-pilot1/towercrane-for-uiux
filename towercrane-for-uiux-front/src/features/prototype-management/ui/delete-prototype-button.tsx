import { Trash2 } from 'lucide-react'
import { useDeletePrototype } from '../../../shared/api/catalog'
import { Button } from '../../../shared/ui/button'

type DeletePrototypeButtonProps = {
  categoryId: string
  prototypeId: string
  asIcon?: boolean
}

export function DeletePrototypeButton({
  categoryId,
  prototypeId,
  asIcon,
}: DeletePrototypeButtonProps) {
  const deletePrototype = useDeletePrototype(categoryId)

  const handleDelete = async () => {
    const confirmed = window.confirm('이 프로토타입을 삭제할까요?')

    if (!confirmed) {
      return
    }

    await deletePrototype.mutateAsync(prototypeId)
  }

  if (asIcon) {
    return (
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 disabled:opacity-50"
        title="삭제"
        onClick={() => void handleDelete()}
        disabled={deletePrototype.isPending}
      >
        <Trash2 className="size-3.5" />
      </button>
    )
  }

  return (
    <Button
      variant="ghost"
      className="h-8 px-3 text-rose-200 hover:bg-rose-400/10"
      onClick={() => void handleDelete()}
      disabled={deletePrototype.isPending}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
