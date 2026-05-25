import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'auth' | 'icon' | 'sm-icon'
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
        'inline-flex items-center justify-center rounded-sm text-sm font-semibold transition duration-200',
        size === 'default' && 'px-4 py-2.5',
        size === 'sm' && 'h-8 px-3',
        size === 'auth' && 'h-11 rounded-md px-4 py-0 leading-none',
        size === 'icon' && 'size-9 border',
        size === 'sm-icon' && 'size-7 border',
        variant === 'primary' &&
          'border bg-brand-primary text-text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_30px_rgba(110,231,183,0.18)] hover:brightness-110 [border-color:var(--interactive-border)]',
        variant === 'secondary' &&
          'border bg-surface-muted text-text-primary hover:bg-surface-strong [border-color:var(--interactive-border)]',
        variant === 'ghost' && 'text-text-secondary hover:bg-surface-muted',
        (size === 'icon' || size === 'sm-icon') && tone === 'default' && 'ui-icon-button',
        (size === 'icon' || size === 'sm-icon') && tone === 'brand' && 'ui-icon-button-brand',
        (size === 'icon' || size === 'sm-icon') && tone === 'danger' && 'ui-icon-button-danger',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-surface-muted disabled:text-text-muted disabled:border-surface-border-soft disabled:shadow-none disabled:hover:scale-100 disabled:hover:brightness-100',
        className,
      )}
      {...props}
    />
  )
}
