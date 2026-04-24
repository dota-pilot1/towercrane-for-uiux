import { Trash2 } from 'lucide-react'
import { Button } from './button'

type ConfirmDeleteIconButtonProps = {
  onConfirm: () => void | Promise<void>
  confirmMessage: string
  isPending?: boolean
  size?: 'icon' | 'sm-icon'
  title?: string
  className?: string
}

export function ConfirmDeleteIconButton({
  onConfirm,
  confirmMessage,
  isPending = false,
  size = 'icon',
  title = '삭제',
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
      size={size}
      tone="danger"
      title={title}
      onClick={() => void handleClick()}
      disabled={isPending}
      className={className}
    >
      <Trash2 className={size === 'sm-icon' ? 'size-3.5' : 'size-4'} />
    </Button>
  )
}
