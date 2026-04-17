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
      <Button
        size="icon"
        tone="danger"
        title="삭제"
        onClick={() => void handleDelete()}
        disabled={deletePrototype.isPending}
      >
        <Trash2 className="size-3.5" />
      </Button>
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
