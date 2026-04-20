import { type PrototypeListItem } from '../../../shared/api/catalog'
import { useUiStore } from '../../../shared/store/ui-store'
import { ActionIconButton } from '../../../shared/ui/action-icon-button'
import { Button } from '../../../shared/ui/button'
import { Info, ArrowLeft } from 'lucide-react'

type ButtonProps = {
  prototype: PrototypeListItem
}

type PageProps = {
  prototype: PrototypeListItem
  canManagePrototype: boolean
  onBack: () => void
}

export function PrototypeDetailDialog({ prototype }: ButtonProps) {
  const setActivePrototypeId = useUiStore((state) => state.setActivePrototypeId)

  return (
    <ActionIconButton
      icon={Info}
      title="상세 보기"
      aria-label="상세 보기"
      onClick={() => setActivePrototypeId(prototype.id)}
    />
  )
}

export function PrototypeDetailPage({
  prototype,
  onBack,
}: PageProps) {
  return (
    <div className="p-4">
      <Button onClick={onBack}>
        <ArrowLeft className="mr-2" /> Back
      </Button>
      <h1>{prototype.title}</h1>
      <p>{prototype.summary}</p>
    </div>
  )
}
