import type { LucideIcon } from 'lucide-react'
import { ButtonHTMLAttributes } from 'react'
import { Button } from '../../../shared/ui/button'
import { cn } from '../../../shared/lib/utils'

interface AuthIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  variant?: 'emerald' | 'white'
}

export function AuthIconButton({
  icon: Icon,
  variant = 'white',
  className,
  ...props
}: AuthIconButtonProps) {
  return (
    <Button
      variant="secondary"
      className={cn(
        'size-[34px] rounded-full p-0 border transition-all duration-300 flex items-center justify-center overflow-hidden',
        variant === 'emerald' &&
          'border-brand-border text-brand-primary hover:border-brand-border hover:bg-brand-glass',
        variant === 'white' &&
          'border-surface-border-soft text-text-secondary hover:border-surface-border-soft hover:text-text-primary hover:bg-surface-muted',
        className
      )}
      {...props}
    >
      <Icon size={18} strokeWidth={2.2} className="shrink-0" />
    </Button>
  )
}
