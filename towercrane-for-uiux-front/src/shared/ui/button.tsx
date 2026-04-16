import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200',
        variant === 'primary' &&
          'bg-emerald-300 text-slate-950 shadow-[0_12px_30px_rgba(110,231,183,0.22)] hover:bg-emerald-200',
        variant === 'secondary' &&
          'border border-white/12 bg-white/6 text-slate-100 hover:bg-white/10',
        variant === 'ghost' && 'text-slate-300 hover:bg-white/8',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
