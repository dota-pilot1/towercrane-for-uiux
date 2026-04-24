import type { ButtonHTMLAttributes } from 'react'
import { Plus } from 'lucide-react'

import { Button } from './button'
import { cn } from '../lib/utils'

type AddIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'icon' | 'sm-icon'
}

export function AddIconButton({
  className,
  size = 'icon',
  title = '추가',
  'aria-label': ariaLabel = '추가',
  ...props
}: AddIconButtonProps) {
  return (
    <Button
      size={size}
      variant="secondary"
      title={title}
      aria-label={ariaLabel}
      className={cn(
        'border-dashed border-surface-border bg-background hover:bg-surface-muted hover:text-brand-primary transition-colors',
        size === 'sm-icon' && 'size-9 rounded-md',
        className,
      )}
      {...props}
    >
      <Plus className={size === 'sm-icon' ? 'size-4.5' : 'size-5'} />
    </Button>
  )
}
