import { Eye, EyeOff } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

type AuthFieldProps = {
  label: string
  error?: string
  children: ReactNode
}

export function AuthField({ label, error, children }: AuthFieldProps) {
  return (
    <label className="block space-y-2 text-left">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </label>
  )
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input controlSize="auth" {...props} />
}

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function AuthButton({ className, variant = 'primary', ...props }: AuthButtonProps) {
  return <Button size="auth" variant={variant} className={className} {...props} />
}

type AuthEmailActionRowProps = {
  children: ReactNode
  action: ReactNode
  actionWidth?: 'default' | 'compact'
}

export function AuthEmailActionRow({
  children,
  action,
  actionWidth = 'default',
}: AuthEmailActionRowProps) {
  return (
    <div
      className={
        actionWidth === 'compact'
          ? 'grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_72px]'
          : 'grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_96px]'
      }
    >
      {children}
      {action}
    </div>
  )
}

type AuthPasswordFieldProps = {
  label: string
  registration: UseFormRegisterReturn
  visible: boolean
  disabled?: boolean
  error?: string
  onToggle: () => void
}

export function AuthPasswordField({
  label,
  registration,
  visible,
  disabled,
  error,
  onToggle,
}: AuthPasswordFieldProps) {
  return (
    <AuthField label={label} error={error}>
      <div className="relative">
        <AuthInput
          {...registration}
          type={visible ? 'text' : 'password'}
          placeholder="8자 이상 입력"
          className="pr-10"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-text-secondary transition hover:text-text-primary"
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </AuthField>
  )
}
