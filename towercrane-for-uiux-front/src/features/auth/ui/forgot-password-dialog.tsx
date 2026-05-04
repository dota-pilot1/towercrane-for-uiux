import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, KeyRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useRequestPasswordResetCode,
  useResetPasswordWithCode,
  useVerifyPasswordResetCode,
} from '../../../shared/api/auth'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'

const CODE_TTL = 300

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '비밀번호가 일치하지 않습니다.',
        path: ['confirmPassword'],
      })
    }
  })

type PasswordFormValues = z.infer<typeof passwordSchema>
type Step = 'email' | 'code' | 'password'

type ForgotPasswordDialogProps = {
  open: boolean
  initialEmail?: string
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordDialog({
  open,
  initialEmail = '',
  onOpenChange,
}: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [verifiedToken, setVerifiedToken] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const requestCodeMutation = useRequestPasswordResetCode()
  const verifyCodeMutation = useVerifyPasswordResetCode()
  const resetPasswordMutation = useResetPasswordWithCode()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (open) {
      setEmail(initialEmail)
      setStep('email')
      setCode('')
      setVerifiedToken('')
      setCountdown(0)
      setError(null)
      reset()
    }
  }, [initialEmail, open, reset])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  const startTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    setCountdown(CODE_TTL)
    timerRef.current = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current)
          }
          return 0
        }
        return value - 1
      })
    }, 1000)
  }

  const requestCode = async () => {
    const trimmedEmail = email.trim()
    if (!z.email().safeParse(trimmedEmail).success) {
      setError('올바른 이메일 형식이 필요합니다.')
      return
    }

    try {
      setError(null)
      await requestCodeMutation.mutateAsync(trimmedEmail)
      setStep('code')
      setCode('')
      startTimer()
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, '인증코드 발송에 실패했습니다.'))
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('인증코드 6자리를 입력해 주세요.')
      return
    }

    try {
      setError(null)
      const response = await verifyCodeMutation.mutateAsync({
        email: email.trim(),
        code,
      })
      setVerifiedToken(response.verifiedToken)
      setStep('password')
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, '인증코드가 올바르지 않습니다.'))
    }
  }

  const onSubmitPassword = handleSubmit(async (values) => {
    try {
      setError(null)
      await resetPasswordMutation.mutateAsync({
        email: email.trim(),
        verifiedToken,
        newPassword: values.newPassword,
      })
      onOpenChange(false)
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, '비밀번호 변경에 실패했습니다.'))
    }
  })

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2">
          <Card className="rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-brand-border bg-brand-glass p-2.5 text-brand-primary">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-semibold text-text-primary">
                    비밀번호 찾기
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-xs text-text-secondary">
                    이메일 인증 후 새 비밀번호를 설정합니다.
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-surface-border-soft bg-surface-muted p-2 text-text-secondary transition hover:bg-surface-muted"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-4 flex gap-1.5">
              {(['email', 'code', 'password'] as Step[]).map((item) => (
                <div
                  key={item}
                  className={`h-1 flex-1 rounded-full ${
                    item === step ? 'bg-brand-primary' : 'bg-surface-muted'
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {step === 'email' ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">이메일</span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={requestCodeMutation.isPending}
                    onClick={requestCode}
                  >
                    {requestCodeMutation.isPending ? '발송 중...' : '인증코드 발송'}
                  </Button>
                </>
              ) : null}

              {step === 'code' ? (
                <>
                  <div className="space-y-2">
                    <span className="text-sm text-text-secondary">인증코드</span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={code}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6자리"
                          className="pr-16"
                          onChange={(event) => {
                            setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            setError(null)
                          }}
                        />
                        {countdown > 0 ? (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted tabular-nums">
                            {formatTime(countdown)}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        disabled={verifyCodeMutation.isPending || code.length !== 6}
                        onClick={verifyCode}
                      >
                        {verifyCodeMutation.isPending ? '확인 중...' : '확인'}
                      </Button>
                    </div>
                  </div>
                  {countdown === 0 ? (
                    <button
                      type="button"
                      className="text-sm text-brand-primary underline"
                      onClick={requestCode}
                    >
                      인증코드 재발송
                    </button>
                  ) : null}
                </>
              ) : null}

              {step === 'password' ? (
                <form className="space-y-4" onSubmit={onSubmitPassword}>
                  <div className="flex items-center gap-2 rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-sm text-brand-primary">
                    <CheckCircle2 className="size-4" />
                    <span>이메일 인증 완료</span>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">새 비밀번호</span>
                    <Input
                      {...register('newPassword')}
                      type="password"
                      placeholder="8자 이상 입력"
                    />
                    {errors.newPassword ? (
                      <span className="text-sm text-destructive">
                        {errors.newPassword.message}
                      </span>
                    ) : null}
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">새 비밀번호 확인</span>
                    <Input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="비밀번호 다시 입력"
                    />
                    {errors.confirmPassword ? (
                      <span className="text-sm text-destructive">
                        {errors.confirmPassword.message}
                      </span>
                    ) : null}
                  </label>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
                  </Button>
                </form>
              ) : null}

              {error ? (
                <div className="rounded-md border border-surface-border-soft bg-danger-glass px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
