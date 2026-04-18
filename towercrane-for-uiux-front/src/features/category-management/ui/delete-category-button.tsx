import { Trash2 } from 'lucide-react'
import { useDeleteCategory } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'
import { ConfirmDeleteIconButton } from '../../../shared/ui/confirm-delete-icon-button'

type DeleteCategoryButtonProps = {
  categoryId: string
  fallbackCategoryId?: string
  asIcon?: boolean
}

const CONFIRM_MESSAGE = '이 카테고리를 삭제할까요? 연결된 프로토타입도 함께 삭제됩니다.'

export function DeleteCategoryButton({
  categoryId,
  fallbackCategoryId,
  asIcon,
}: DeleteCategoryButtonProps) {
  const deleteCategory = useDeleteCategory()
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)

  const runDelete = async () => {
    await deleteCategory.mutateAsync(categoryId)

    if (fallbackCategoryId && fallbackCategoryId !== categoryId) {
      setActiveCategory(fallbackCategoryId)
    }
  }

  if (asIcon) {
    return (
      <ConfirmDeleteIconButton
        onConfirm={runDelete}
        confirmMessage={CONFIRM_MESSAGE}
        isPending={deleteCategory.isPending}
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
