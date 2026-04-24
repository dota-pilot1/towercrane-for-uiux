import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './button'

const OPTICAL_SHRINK_ICONS = new Set(['Pencil', 'Plus', 'X', 'Check'])

type ActionIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  tone?: 'default' | 'brand' | 'danger'
  size?: 'icon' | 'sm-icon'
}

export function ActionIconButton({
  icon: Icon,
  tone = 'default',
  size = 'icon',
  ...rest
}: ActionIconButtonProps) {
  const isSm = size === 'sm-icon'
  const iconSize = OPTICAL_SHRINK_ICONS.has(Icon.displayName ?? '')
    ? isSm
      ? 'size-3'
      : 'size-3.5'
    : isSm
      ? 'size-3.5'
      : 'size-4'

  return (
    <Button size={size} tone={tone} {...rest}>
      <Icon className={iconSize} />
    </Button>
  )
}
