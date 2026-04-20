import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  tone?: 'default' | 'brand' | 'danger'
}

export function Button({
  className,
  type = 'button',
  variant = 'primary',
  size = 'default',
  tone = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] text-sm font-semibold transition duration-200',
        size === 'default' && 'px-4 py-2.5',
        size === 'sm' && 'h-8 px-3',
        size === 'icon' && 'size-9 rounded-[10px] border',
        variant === 'primary' &&
          'border bg-brand-primary text-text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_30px_rgba(110,231,183,0.18)] hover:brightness-110 [border-color:var(--interactive-border)]',
        variant === 'secondary' &&
          'border ui-surface-muted ui-text-primary hover:bg-[var(--surface-strong)] [border-color:var(--interactive-border)]',
        variant === 'ghost' && 'ui-text-secondary hover:bg-[var(--surface-muted)]',
        size === 'icon' && tone === 'default' && 'ui-icon-button',
        size === 'icon' && tone === 'brand' && 'ui-icon-button-brand',
        size === 'icon' && tone === 'danger' && 'ui-icon-button-danger',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
