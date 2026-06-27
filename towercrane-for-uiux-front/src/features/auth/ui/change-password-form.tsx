import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useChangePassword } from '../../../shared/api/auth'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요.'),
    newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '새 비밀번호가 일치하지 않습니다.',
        path: ['confirmPassword'],
      })
    }
    if (value.currentPassword && value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '현재 비밀번호와 다른 비밀번호를 사용하세요.',
        path: ['newPassword'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

type FieldName = keyof FormValues

const fields: Array<{ name: FieldName; label: string; placeholder: string }> = [
  { name: 'currentPassword', label: '현재 비밀번호', placeholder: '현재 비밀번호' },
  { name: 'newPassword', label: '새 비밀번호', placeholder: '8자 이상' },
  { name: 'confirmPassword', label: '새 비밀번호 확인', placeholder: '한 번 더 입력' },
]

export function ChangePasswordForm() {
  const [reveal, setReveal] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setDone(false)
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset()
      setDone(true)
    } catch (err) {
      const status = (err as { status?: number }).status
      setServerError(
        status === 403
          ? '현재 비밀번호가 올바르지 않습니다.'
          : err instanceof Error
            ? err.message
            : '비밀번호 변경에 실패했습니다.',
      )
    }
  })

  return (
    <div className="ui-panel-soft p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary">비밀번호 변경</h3>
            <p className="mt-0.5 text-xs text-text-secondary">
              현재 비밀번호 확인 후 새 비밀번호로 변경합니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="inline-flex items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted/40 px-2 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:text-text-primary"
        >
          {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {reveal ? '숨기기' : '표시'}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-xs font-bold text-text-secondary">
              {field.label}
            </label>
            <Input
              type={reveal ? 'text' : 'password'}
              autoComplete={
                field.name === 'currentPassword'
                  ? 'current-password'
                  : 'new-password'
              }
              controlSize="auth"
              placeholder={field.placeholder}
              {...register(field.name)}
            />
            {errors[field.name] ? (
              <p className="mt-1 text-xs text-destructive">
                {errors[field.name]?.message}
              </p>
            ) : null}
          </div>
        ))}

        {serverError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {serverError}
          </p>
        ) : null}

        {done ? (
          <p className="flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs font-semibold text-brand-primary">
            <CheckCircle2 className="size-4" />
            비밀번호가 변경되었습니다. 다른 기기의 세션은 모두 로그아웃됩니다.
          </p>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="auth"
            disabled={isSubmitting}
            className="px-5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                변경 중…
              </>
            ) : (
              '비밀번호 변경'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
