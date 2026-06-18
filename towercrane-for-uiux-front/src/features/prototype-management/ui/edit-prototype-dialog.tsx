import { useNavigate, useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import type { PrototypeItem } from '../../../shared/config/catalog'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Button } from '../../../shared/ui/button'

type EditPrototypeDialogProps = {
  categoryId: string
  prototype: PrototypeItem
  asIcon?: boolean
  size?: 'icon' | 'sm-icon'
  className?: string
}

export function EditPrototypeDialog({
  categoryId,
  prototype,
  asIcon,
  size = 'icon',
  className,
}: EditPrototypeDialogProps) {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { workspaceId?: string }

  const openEditPage = () => {
    if (params.workspaceId) {
      navigate({
        to: '/prototype/workspaces/$workspaceId/categories/$categoryId/prototypes/$prototypeId/edit',
        params: {
          workspaceId: params.workspaceId,
          categoryId,
          prototypeId: prototype.id,
        },
      })
      return
    }

    navigate({
      to: '/prototype/$categoryId/prototypes/$prototypeId/edit',
      params: { categoryId, prototypeId: prototype.id },
    })
  }

  if (asIcon) {
    return (
      <ActionIconButton
        icon={Pencil}
        title="수정"
        aria-label="프로토타입 수정"
        size={size}
        className={className}
        onClick={openEditPage}
      />
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={openEditPage}
    >
      <Pencil className="size-4" />
    </Button>
  )
}
