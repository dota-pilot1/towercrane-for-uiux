import { clsx } from 'clsx'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type HeaderPillVariant = 'default' | 'active' | 'static'

const variantStyles: Record<HeaderPillVariant, string> = {
  default:
    'border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)] hover:border-[var(--surface-border)]',
  active: 'border-primary/50 bg-primary/12 text-primary font-semibold',
  static: 'border-[var(--surface-border)] bg-transparent ui-text-primary',
}

const baseClassName =
  'inline-flex h-[34px] items-center gap-2 rounded-sm border px-3 text-[13px] font-medium transition shrink-0'

type CommonProps = {
  variant?: HeaderPillVariant
  icon?: LucideIcon
  trailingIcon?: ReactNode
  labelClassName?: string
  className?: string
  children?: ReactNode
}

type ButtonPillProps = CommonProps & {
  as?: 'button'
} & Omit<ComponentPropsWithoutRef<'button'>, keyof CommonProps | 'as'>

type SpanPillProps = CommonProps & {
  as: 'span'
} & Omit<ComponentPropsWithoutRef<'span'>, keyof CommonProps | 'as'>

export type HeaderPillProps = ButtonPillProps | SpanPillProps

export function HeaderPill({
  variant = 'default',
  icon: Icon,
  trailingIcon,
  labelClassName,
  className,
  children,
  ...rest
}: HeaderPillProps) {
  const computedClassName = clsx(baseClassName, variantStyles[variant], className)
  const label = labelClassName ? <span className={labelClassName}>{children}</span> : children
  const inner = (
    <>
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {label}
      {trailingIcon}
    </>
  )

  if (rest.as === 'span') {
    const { as: _as, ...spanProps } = rest
    return (
      <span className={computedClassName} {...spanProps}>
        {inner}
      </span>
    )
  }

  const { as: _as, type, ...buttonProps } = rest
  return (
    <button type={type ?? 'button'} className={computedClassName} {...buttonProps}>
      {inner}
    </button>
  )
}
