import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Plus, X, UserPlus, Eye, EyeOff, Check, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useCheckEmail,
  useLogin,
  useSendVerificationCode,
  useSignup,
  useVerifyEmailCode,
} from '../../../shared/api/auth'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { WarningDialog } from '../../../shared/ui/warning-dialog'
import { AuthIconButton } from './auth-icon-button'
import { ForgotPasswordDialog } from './forgot-password-dialog'

const CODE_TTL = 300

const loginSchema = z.object({
  email: z.email('올바른 이메일 형식이 필요합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

const signupSchema = z
  .object({
    name: z.string().trim().min(2, '이름은 2자 이상이어야 합니다.'),
    email: z.email('올바른 이메일 형식이 필요합니다.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '비밀번호가 일치하지 않습니다.',
        path: ['confirmPassword'],
      })
    }
  })

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>

export function InlineAuthBar() {
  const [signupOpen, setSignupOpen] = useState(false)
  const [loginWarning, setLoginWarning] = useState<string | null>(null)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const setSession = useSessionStore((state) => state.setSession)
  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const checkEmailMutation = useCheckEmail()
  const sendVerificationCodeMutation = useSendVerificationCode()
  const verifyEmailCodeMutation = useVerifyEmailCode()
  const [showPassword, setShowPassword] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [verifiedToken, setVerifiedToken] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<number | null>(null)

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    watch: watchLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    reset: resetSignup,
    setError: setSignupError,
    watch: watchSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const [password, confirmPassword] = watchSignup(['password', 'confirmPassword'])
  const loginEmail = watchLogin('email')
  const signupEmail = watchSignup('email')
  const isPass = password && password.length >= 8 && password === confirmPassword

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      const response = await loginMutation.mutateAsync(values)
      setSession(response)
    } catch (error) {
      setLoginWarning(getLoginErrorMessage(error))
    }
  }

  const onSignupSubmit = async (values: SignupFormValues) => {
    if (!emailVerified || !verifiedToken) {
      setCodeError('이메일 인증을 먼저 완료해 주세요.')
      return
    }

    const response = await signupMutation.mutateAsync({
      name: values.name.trim(),
      email: values.email,
      password: values.password,
      verifiedToken,
    })
    setSession(response)
    setSignupOpen(false)
    resetSignup()
    resetEmailVerification()
  }

  const resetEmailVerification = () => {
    setEmailVerified(false)
    setVerifiedToken('')
    setCodeSent(false)
    setCode('')
    setCodeError(null)
    setDuplicateEmail(null)
    setCountdown(0)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
  }

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

  const signupEmailRegister = registerSignup('email', {
    onChange: resetEmailVerification,
  })

  const sendSignupCode = async () => {
    const email = signupEmail?.trim()
    if (!email || !z.email().safeParse(email).success) {
      setSignupError('email', {
        type: 'manual',
        message: '올바른 이메일 형식이 필요합니다.',
      })
      return
    }

    try {
      setCodeError(null)
      setDuplicateEmail(null)
      const emailCheck = await checkEmailMutation.mutateAsync(email)
      if (!emailCheck.available) {
        setDuplicateEmail(email)
        setSignupError('email', {
          type: 'server',
          message: '이미 사용 중인 이메일입니다.',
        })
        return
      }

      await sendVerificationCodeMutation.mutateAsync(email)
      setCodeSent(true)
      setCode('')
      startTimer()
    } catch (error) {
      setCodeError(getErrorMessage(error, '인증코드 발송에 실패했습니다.'))
    }
  }

  const verifySignupCode = async () => {
    const email = signupEmail?.trim()
    if (!email || code.length !== 6) {
      setCodeError('인증코드 6자리를 입력해 주세요.')
      return
    }

    try {
      setCodeError(null)
      const response = await verifyEmailCodeMutation.mutateAsync({ email, code })
      setVerifiedToken(response.verifiedToken)
      setEmailVerified(true)
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    } catch (error) {
      setCodeError(getErrorMessage(error, '인증코드가 올바르지 않습니다.'))
    }
  }

  return (
    <>
      <form
        onSubmit={handleLoginSubmit(onLoginSubmit)}
        className="flex items-center justify-end gap-1.5"
      >
        <Input
          {...registerLogin('email')}
          placeholder="이메일"
          className="h-[34px] w-[150px] rounded-md border-surface-border-soft bg-surface-muted px-3.5 text-[13px] focus:border-brand-border focus:ring-brand-border/20"
        />
        <Input
          {...registerLogin('password')}
          type="password"
          placeholder="비밀번호"
          className="h-[34px] w-[110px] rounded-md border-surface-border-soft bg-surface-muted px-3.5 text-[13px] focus:border-brand-border focus:ring-brand-border/20"
        />
        
        <AuthIconButton
          type="submit"
          variant="emerald"
          icon={ArrowRight}
          disabled={loginMutation.isPending}
          aria-label="로그인"
          title="로그인"
        />

        <button
          type="button"
          className="h-[34px] px-2 text-[12px] text-text-secondary underline transition hover:text-text-primary"
          onClick={() => setForgotPasswordOpen(true)}
        >
          찾기
        </button>

        <Dialog.Root open={signupOpen} onOpenChange={setSignupOpen}>
          <Dialog.Trigger asChild>
            <AuthIconButton
              type="button"
              variant="white"
              icon={Plus}
              aria-label="회원가입"
              title="회원가입"
            />
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2">
              <Card className="rounded-lg p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md border border-brand-border bg-brand-glass p-3 text-brand-primary">
                      <UserPlus className="size-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-semibold text-text-primary">
                        회원가입
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm text-text-secondary">
                        계정을 만들고 바로 Prototype 워크스페이스로 진입합니다.
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

                <form className="mt-5 space-y-4" onSubmit={handleSignupSubmit(onSignupSubmit)}>
                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">이름</span>
                    <Input
                      {...registerSignup('name')}
                      placeholder="홍길동"
                      disabled={!emailVerified}
                    />
                    {signupErrors.name ? (
                      <span className="text-sm text-rose-300">{signupErrors.name.message}</span>
                    ) : null}
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">이메일</span>
                    <div className="flex gap-2">
                      <Input
                        {...signupEmailRegister}
                        type="email"
                        placeholder="you@example.com"
                        disabled={emailVerified}
                      />
                      {!emailVerified ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          disabled={
                            checkEmailMutation.isPending ||
                            sendVerificationCodeMutation.isPending
                          }
                          onClick={sendSignupCode}
                        >
                          {sendVerificationCodeMutation.isPending
                            ? '발송 중...'
                            : codeSent
                              ? '재발송'
                              : '인증코드 발송'}
                        </Button>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-border bg-brand-glass px-3 text-sm font-semibold text-brand-primary">
                          <CheckCircle2 className="size-4" />
                          인증 완료
                        </span>
                      )}
                    </div>
                    {signupErrors.email ? (
                      <span className="text-sm text-destructive">{signupErrors.email.message}</span>
                    ) : null}
                  </label>

                  {duplicateEmail ? (
                    <div className="rounded-md border border-surface-border-soft bg-danger-glass px-3 py-2 text-sm text-text-secondary">
                      가입된 이메일입니다.{' '}
                      <button
                        type="button"
                        className="font-semibold text-brand-primary underline"
                        onClick={() => setForgotPasswordOpen(true)}
                      >
                        비밀번호 찾기
                      </button>
                      를 진행해 주세요.
                    </div>
                  ) : null}

                  {codeSent && !emailVerified ? (
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
                              setCodeError(null)
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
                          disabled={verifyEmailCodeMutation.isPending || code.length !== 6}
                          onClick={verifySignupCode}
                        >
                          {verifyEmailCodeMutation.isPending ? '확인 중...' : '확인'}
                        </Button>
                      </div>
                      {countdown === 0 ? (
                        <button
                          type="button"
                          className="text-sm text-brand-primary underline"
                          onClick={sendSignupCode}
                        >
                          인증코드 재발송
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {codeError ? (
                    <div className="rounded-md border border-surface-border-soft bg-danger-glass px-3 py-2 text-sm text-destructive">
                      {codeError}
                    </div>
                  ) : null}

                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">비밀번호</span>
                    <div className="relative">
                      <Input
                        {...registerSignup('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="8자 이상 입력"
                        className="pr-10"
                        disabled={!emailVerified}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {signupErrors.password ? (
                      <span className="text-sm text-rose-300">{signupErrors.password.message}</span>
                    ) : null}
                  </label>

                  <label className="block space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">비밀번호 확인</span>
                      {isPass && (
                        <span className="inline-flex items-center gap-1 rounded border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <Check className="size-3" />
                          Pass
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        {...registerSignup('confirmPassword')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="비밀번호 다시 입력"
                        className="pr-10"
                        disabled={!emailVerified}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {signupErrors.confirmPassword ? (
                      <span className="text-sm text-rose-300">
                        {signupErrors.confirmPassword.message}
                      </span>
                    ) : null}
                  </label>

                  {signupMutation.error ? (
                    <div className="rounded-md border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                      {signupMutation.error.message}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Dialog.Close asChild>
                      <Button type="button" variant="secondary">
                        취소
                      </Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={signupMutation.isPending || !emailVerified}>
                      {signupMutation.isPending ? '처리 중...' : '계정 만들기'}
                    </Button>
                  </div>
                </form>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </form>

      {loginErrors.email || loginErrors.password ? (
        <div className="mt-1.5 text-right text-[11px] text-rose-200">
          {loginErrors.email ? <span>{loginErrors.email.message}</span> : null}
          {!loginErrors.email && loginErrors.password ? (
            <span>{loginErrors.password.message}</span>
          ) : null}
        </div>
      ) : null}

      <WarningDialog
        open={loginWarning !== null}
        title="로그인할 수 없습니다"
        description={loginWarning ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setLoginWarning(null)
            loginMutation.reset()
          }
        }}
      />

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        initialEmail={loginEmail || signupEmail || ''}
        onOpenChange={setForgotPasswordOpen}
      />
    </>
  )
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`
}

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/invalid credentials|unauthorized|401/i.test(message)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다. 입력한 정보를 확인한 뒤 다시 시도해 주세요.'
  }
  return message || '로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}
