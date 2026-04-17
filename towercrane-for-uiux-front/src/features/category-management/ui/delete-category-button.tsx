import { Trash2 } from 'lucide-react'
import { useDeleteCategory } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { Button } from '../../../shared/ui/button'

type DeleteCategoryButtonProps = {
  categoryId: string
  fallbackCategoryId?: string
  asIcon?: boolean
}

export function DeleteCategoryButton({
  categoryId,
  fallbackCategoryId,
  asIcon,
}: DeleteCategoryButtonProps) {
  const deleteCategory = useDeleteCategory()
  const setActiveCategory = useUiStore((state) => state.setActiveCategory)

  const handleDelete = async () => {
    const confirmed = window.confirm('이 카테고리를 삭제할까요? 연결된 프로토타입도 함께 삭제됩니다.')

    if (!confirmed) {
      return
    }

    await deleteCategory.mutateAsync(categoryId)

    if (fallbackCategoryId && fallbackCategoryId !== categoryId) {
      setActiveCategory(fallbackCategoryId)
    }
  }

  if (asIcon) {
    return (
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleteCategory.isPending}
        className="flex size-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/5 text-rose-300 transition-all hover:bg-rose-400/15 hover:border-rose-400/40 disabled:opacity-50"
        title="삭제"
      >
        <Trash2 className="size-4" />
      </button>
    )
  }

  return (
    <Button
      variant="secondary"
      onClick={() => void handleDelete()}
      disabled={deleteCategory.isPending}
      className="border-rose-400/20 text-rose-200 hover:bg-rose-400/10"
    >
      <Trash2 className="mr-2 size-4" />
      삭제
    </Button>
  )
}
