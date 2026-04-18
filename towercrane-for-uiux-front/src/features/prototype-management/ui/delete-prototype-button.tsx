import { Trash2 } from 'lucide-react'
import { useDeletePrototype } from '../../../shared/api/catalog'
import { Button } from '../../../shared/ui/button'
import { ConfirmDeleteIconButton } from '../../../shared/ui/confirm-delete-icon-button'

type DeletePrototypeButtonProps = {
  categoryId: string
  prototypeId: string
  asIcon?: boolean
}

const CONFIRM_MESSAGE = '이 프로토타입을 삭제할까요?'

export function DeletePrototypeButton({
  categoryId,
  prototypeId,
  asIcon,
}: DeletePrototypeButtonProps) {
  const deletePrototype = useDeletePrototype(categoryId)

  const runDelete = () => deletePrototype.mutateAsync(prototypeId)

  if (asIcon) {
    return (
      <ConfirmDeleteIconButton
        onConfirm={runDelete}
        confirmMessage={CONFIRM_MESSAGE}
        isPending={deletePrototype.isPending}
        iconSize="sm"
      />
    )
  }

  const handleClick = async () => {
    if (!window.confirm(CONFIRM_MESSAGE)) {
      return
    }

    await runDelete()
  }

  return (
    <Button
      variant="ghost"
      className="h-8 px-3 text-rose-200 hover:bg-rose-400/10"
      onClick={() => void handleClick()}
      disabled={deletePrototype.isPending}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
