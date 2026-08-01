import { Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useDeleteCategory } from '../../../shared/api/catalog'
import { Button } from '../../../shared/ui/button'
import { ConfirmDeleteIconButton } from '../../../shared/ui/confirm-delete-icon-button'

type DeleteCategoryButtonProps = {
  categoryId: string
  workspaceId?: string
  fallbackCategoryId?: string
  asIcon?: boolean
  size?: 'icon' | 'sm-icon'
}

const CONFIRM_MESSAGE = '이 주제를 삭제할까요? 연결된 프로토타입도 함께 삭제됩니다.'

export function DeleteCategoryButton({
  categoryId,
  workspaceId,
  fallbackCategoryId,
  asIcon,
  size = 'icon',
}: DeleteCategoryButtonProps) {
  const deleteCategory = useDeleteCategory()
  const navigate = useNavigate()

  const runDelete = async () => {
    await deleteCategory.mutateAsync(categoryId)

    if (fallbackCategoryId && fallbackCategoryId !== categoryId) {
      if (workspaceId) {
        navigate({
          to: '/prototype/workspaces/$workspaceId/categories/$categoryId',
          params: { workspaceId, categoryId: fallbackCategoryId },
        })
      } else {
        navigate({ to: '/prototype/$categoryId', params: { categoryId: fallbackCategoryId } })
      }
    }
  }

  if (asIcon) {
    return (
      <ConfirmDeleteIconButton
        onConfirm={runDelete}
        confirmMessage={CONFIRM_MESSAGE}
        isPending={deleteCategory.isPending}
        size={size}
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
      variant="secondary"
      onClick={() => void handleClick()}
      disabled={deleteCategory.isPending}
      className="border-rose-400/20 text-rose-200 hover:bg-rose-400/10"
    >
      <Trash2 className="mr-2 size-4" />
      삭제
    </Button>
  )
}
