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
          'border-emerald-500/25 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10',
        variant === 'white' &&
          'border-white/10 text-slate-300 hover:border-white/25 hover:text-white hover:bg-white/5',
        className
      )}
      {...props}
    >
      <Icon size={18} strokeWidth={2.2} className="shrink-0" />
    </Button>
  )
}
