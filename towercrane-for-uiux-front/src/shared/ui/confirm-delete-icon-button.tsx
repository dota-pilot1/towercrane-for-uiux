import { Trash2 } from 'lucide-react'
import { Button } from './button'

type ConfirmDeleteIconButtonProps = {
  onConfirm: () => void | Promise<void>
  confirmMessage: string
  isPending?: boolean
  title?: string
  iconSize?: 'sm' | 'md'
  className?: string
}

export function ConfirmDeleteIconButton({
  onConfirm,
  confirmMessage,
  isPending = false,
  title = '삭제',
  iconSize = 'md',
  className,
}: ConfirmDeleteIconButtonProps) {
  const handleClick = async () => {
    if (!window.confirm(confirmMessage)) {
      return
    }

    await onConfirm()
  }

  return (
    <Button
      size="icon"
      tone="danger"
      title={title}
      onClick={() => void handleClick()}
      disabled={isPending}
      className={className}
    >
      <Trash2 className={iconSize === 'sm' ? 'size-3.5' : 'size-4'} />
    </Button>
  )
}
