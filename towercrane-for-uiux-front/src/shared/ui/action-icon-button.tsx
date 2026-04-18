import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './button'

const OPTICAL_SHRINK_ICONS = new Set(['Pencil', 'Plus', 'X', 'Check'])

type ActionIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  tone?: 'default' | 'brand' | 'danger'
}

export function ActionIconButton({ icon: Icon, tone = 'default', ...rest }: ActionIconButtonProps) {
  const iconSize = OPTICAL_SHRINK_ICONS.has(Icon.displayName ?? '') ? 'size-3.5' : 'size-4'
  return (
    <Button size="icon" tone={tone} {...rest}>
      <Icon className={iconSize} />
    </Button>
  )
}
