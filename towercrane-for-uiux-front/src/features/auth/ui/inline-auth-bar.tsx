import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FieldErrors, UseFormRegister, UseFormRegisterReturn } from 'react-hook-form'
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

type InlineAuthBarProps = {
  embedded?: boolean
}

export function InlineAuthBar({ embedded = false }: InlineAuthBarProps) {
  const [loginOpen, setLoginOpen] = useState(false)
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
    reset: resetLogin,
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
      setLoginOpen(false)
      resetLogin({ email: values.email, password: '' })
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

  const openForgotPassword = () => {
    setLoginOpen(false)
    setSignupOpen(false)
    setForgotPasswordOpen(true)
  }

  if (embedded) {
    return (
      <>
        <form className="space-y-4" onSubmit={handleLoginSubmit(onLoginSubmit)}>
          <label className="block space-y-2">
            <span className="text-sm text-text-secondary">이메일</span>
            <Input
              {...registerLogin('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {loginErrors.email ? (
              <span className="text-sm text-destructive">{loginErrors.email.message}</span>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-text-secondary">비밀번호</span>
            <Input
              {...registerLogin('password')}
              type="password"
              placeholder="8자 이상 입력"
              autoComplete="current-password"
            />
            {loginErrors.password ? (
              <span className="text-sm text-destructive">{loginErrors.password.message}</span>
            ) : null}
          </label>

          <Button type="submit" className="w-full gap-2" disabled={loginMutation.isPending}>
            <ArrowRight className="size-4" />
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="text-text-secondary underline transition hover:text-text-primary"
            onClick={openForgotPassword}
          >
            비밀번호 찾기
          </button>
          <button
            type="button"
            className="font-semibold text-brand-primary underline"
            onClick={() => setSignupOpen(true)}
          >
            회원가입
          </button>
        </div>

        <SignupDialog
          open={signupOpen}
          onOpenChange={setSignupOpen}
          emailVerified={emailVerified}
          signupErrors={signupErrors}
          signupEmailRegister={signupEmailRegister}
          checkEmailPending={checkEmailMutation.isPending}
          sendCodePending={sendVerificationCodeMutation.isPending}
          verifyCodePending={verifyEmailCodeMutation.isPending}
          codeSent={codeSent}
          duplicateEmail={duplicateEmail}
          code={code}
          countdown={countdown}
          codeError={codeError}
          showPassword={showPassword}
          isPass={Boolean(isPass)}
          signupPending={signupMutation.isPending}
          signupError={signupMutation.error?.message}
          registerSignup={registerSignup}
          handleSignupSubmit={handleSignupSubmit(onSignupSubmit)}
          sendSignupCode={sendSignupCode}
          verifySignupCode={verifySignupCode}
          openForgotPassword={openForgotPassword}
          setCode={setCode}
          setCodeError={setCodeError}
          togglePassword={() => setShowPassword((value) => !value)}
        />

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

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
          <Dialog.Trigger asChild>
            <Button size="sm" className="gap-2">
              <LogIn className="size-4" />
              로그인
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2">
              <Card className="rounded-lg p-6">
                <DialogHeader
                  icon={LogIn}
                  title="로그인"
                  description="계정으로 Prototype 워크스페이스에 진입합니다."
                />

                <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit(onLoginSubmit)}>
                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">이메일</span>
                    <Input
                      {...registerLogin('email')}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    {loginErrors.email ? (
                      <span className="text-sm text-destructive">{loginErrors.email.message}</span>
                    ) : null}
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-text-secondary">비밀번호</span>
                    <Input
                      {...registerLogin('password')}
                      type="password"
                      placeholder="8자 이상 입력"
                      autoComplete="current-password"
                    />
                    {loginErrors.password ? (
                      <span className="text-sm text-destructive">
                        {loginErrors.password.message}
                      </span>
                    ) : null}
                  </label>

                  <Button type="submit" className="w-full gap-2" disabled={loginMutation.isPending}>
                    <ArrowRight className="size-4" />
                    {loginMutation.isPending ? '로그인 중...' : '로그인'}
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className="text-text-secondary underline transition hover:text-text-primary"
                    onClick={openForgotPassword}
                  >
                    비밀번호 찾기
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-brand-primary underline"
                    onClick={() => {
                      setLoginOpen(false)
                      setSignupOpen(true)
                    }}
                  >
                    회원가입
                  </button>
                </div>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root open={signupOpen} onOpenChange={setSignupOpen}>
          <Dialog.Trigger asChild>
            <Button variant="secondary" size="sm" className="gap-2">
              <UserPlus className="size-4" />
              회원가입
            </Button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2">
              <Card className="rounded-lg p-6">
                <DialogHeader
                  icon={UserPlus}
                  title="회원가입"
                  description="이메일 인증 후 계정을 만들고 바로 진입합니다."
                />

                <form className="mt-5 space-y-4" onSubmit={handleSignupSubmit(onSignupSubmit)}>
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
                        onClick={openForgotPassword}
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
                    <span className="text-sm text-text-secondary">이름</span>
                    <Input
                      {...registerSignup('name')}
                      placeholder="홍길동"
                      disabled={!emailVerified}
                    />
                    {signupErrors.name ? (
                      <span className="text-sm text-destructive">{signupErrors.name.message}</span>
                    ) : null}
                  </label>

                  <PasswordField
                    label="비밀번호"
                    registration={registerSignup('password')}
                    visible={showPassword}
                    disabled={!emailVerified}
                    error={signupErrors.password?.message}
                    onToggle={() => setShowPassword((value) => !value)}
                  />

                  <label className="block space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">비밀번호 확인</span>
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 rounded border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase text-brand-primary">
                          <Check className="size-3" />
                          Pass
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        {...registerSignup('confirmPassword')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="비밀번호 다시 입력"
                        className="pr-10"
                        disabled={!emailVerified}
                      />
                      <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                    </div>
                    {signupErrors.confirmPassword ? (
                      <span className="text-sm text-destructive">
                        {signupErrors.confirmPassword.message}
                      </span>
                    ) : null}
                  </label>

                  {signupMutation.error ? (
                    <div className="rounded-md border border-surface-border-soft bg-danger-glass px-4 py-3 text-sm text-destructive">
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
      </div>

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

export function HeaderAuthButtons() {
  const goToLogin = () => {
    window.history.pushState(null, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button variant="secondary" size="sm" className="gap-2" onClick={goToLogin}>
        <UserPlus className="size-4" />
        회원가입
      </Button>
      <Button size="sm" className="gap-2" onClick={goToLogin}>
        <LogIn className="size-4" />
        로그인
      </Button>
    </div>
  )
}

type DialogHeaderProps = {
  icon: LucideIcon
  title: string
  description: string
}

function DialogHeader({ icon: Icon, title, description }: DialogHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-brand-border bg-brand-glass p-3 text-brand-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <Dialog.Title className="text-2xl font-semibold text-text-primary">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-text-secondary">
            {description}
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
  )
}

type SignupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailVerified: boolean
  signupErrors: FieldErrors<SignupFormValues>
  signupEmailRegister: UseFormRegisterReturn
  checkEmailPending: boolean
  sendCodePending: boolean
  verifyCodePending: boolean
  codeSent: boolean
  duplicateEmail: string | null
  code: string
  countdown: number
  codeError: string | null
  showPassword: boolean
  isPass: boolean
  signupPending: boolean
  signupError?: string
  registerSignup: UseFormRegister<SignupFormValues>
  handleSignupSubmit: () => void
  sendSignupCode: () => void
  verifySignupCode: () => void
  openForgotPassword: () => void
  setCode: (code: string) => void
  setCodeError: (error: string | null) => void
  togglePassword: () => void
}

function SignupDialog({
  open,
  onOpenChange,
  emailVerified,
  signupErrors,
  signupEmailRegister,
  checkEmailPending,
  sendCodePending,
  verifyCodePending,
  codeSent,
  duplicateEmail,
  code,
  countdown,
  codeError,
  showPassword,
  isPass,
  signupPending,
  signupError,
  registerSignup,
  handleSignupSubmit,
  sendSignupCode,
  verifySignupCode,
  openForgotPassword,
  setCode,
  setCodeError,
  togglePassword,
}: SignupDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2">
          <Card className="rounded-lg p-6">
            <DialogHeader
              icon={UserPlus}
              title="회원가입"
              description="이메일 인증 후 계정을 만들고 바로 진입합니다."
            />

            <form className="mt-5 space-y-4" onSubmit={handleSignupSubmit}>
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
                      disabled={checkEmailPending || sendCodePending}
                      onClick={sendSignupCode}
                    >
                      {sendCodePending ? '발송 중...' : codeSent ? '재발송' : '인증코드 발송'}
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
                    onClick={openForgotPassword}
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
                      disabled={verifyCodePending || code.length !== 6}
                      onClick={verifySignupCode}
                    >
                      {verifyCodePending ? '확인 중...' : '확인'}
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
                <span className="text-sm text-text-secondary">이름</span>
                <Input {...registerSignup('name')} placeholder="홍길동" disabled={!emailVerified} />
                {signupErrors.name ? (
                  <span className="text-sm text-destructive">{signupErrors.name.message}</span>
                ) : null}
              </label>

              <PasswordField
                label="비밀번호"
                registration={registerSignup('password')}
                visible={showPassword}
                disabled={!emailVerified}
                error={signupErrors.password?.message}
                onToggle={togglePassword}
              />

              <label className="block space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">비밀번호 확인</span>
                  {isPass ? (
                    <span className="inline-flex items-center gap-1 rounded border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase text-brand-primary">
                      <Check className="size-3" />
                      Pass
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    {...registerSignup('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호 다시 입력"
                    className="pr-10"
                    disabled={!emailVerified}
                  />
                  <PasswordToggle visible={showPassword} onToggle={togglePassword} />
                </div>
                {signupErrors.confirmPassword ? (
                  <span className="text-sm text-destructive">
                    {signupErrors.confirmPassword.message}
                  </span>
                ) : null}
              </label>

              {signupError ? (
                <div className="rounded-md border border-surface-border-soft bg-danger-glass px-4 py-3 text-sm text-destructive">
                  {signupError}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary">
                    취소
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={signupPending || !emailVerified}>
                  {signupPending ? '처리 중...' : '계정 만들기'}
                </Button>
              </div>
            </form>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type PasswordFieldProps = {
  label: string
  registration: UseFormRegisterReturn
  visible: boolean
  disabled?: boolean
  error?: string
  onToggle: () => void
}

function PasswordField({
  label,
  registration,
  visible,
  disabled,
  error,
  onToggle,
}: PasswordFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="relative">
        <Input
          {...registration}
          type={visible ? 'text' : 'password'}
          placeholder="8자 이상 입력"
          className="pr-10"
          disabled={disabled}
        />
        <PasswordToggle visible={visible} onToggle={onToggle} />
      </div>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </label>
  )
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
      aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
