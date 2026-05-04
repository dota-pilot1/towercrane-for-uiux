import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { ForgotPasswordDialog } from '../../../features/auth/ui/forgot-password-dialog'
import {
  useCheckEmail,
  useLogin,
  useSendVerificationCode,
  useSignup,
  useVerifyEmailCode,
} from '../../../shared/api/auth'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { WarningDialog } from '../../../shared/ui/warning-dialog'

const CODE_TTL = 300

const loginSchema = z.object({
  email: z.email('올바른 이메일 형식이 필요합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

const signupSchema = z
  .object({
    email: z.email('올바른 이메일 형식이 필요합니다.'),
    name: z.string().trim().min(2, '이름은 2자 이상이어야 합니다.'),
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

export function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [loginWarning, setLoginWarning] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [verifiedToken, setVerifiedToken] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [codeError, setCodeError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const setSession = useSessionStore((state) => state.setSession)
  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const checkEmailMutation = useCheckEmail()
  const sendCodeMutation = useSendVerificationCode()
  const verifyCodeMutation = useVerifyEmailCode()

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    watch: watchLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    setError: setSignupError,
    watch: watchSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', name: '', password: '', confirmPassword: '' },
  })

  const loginEmail = watchLogin('email')
  const signupEmail = watchSignup('email')

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  const resetEmailVerification = () => {
    setEmailVerified(false)
    setVerifiedToken('')
    setCodeSent(false)
    setCode('')
    setCodeError(null)
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

  const onLogin = async (values: LoginFormValues) => {
    try {
      const response = await loginMutation.mutateAsync(values)
      setSession(response)
      window.history.pushState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      setLoginWarning(getLoginErrorMessage(error))
    }
  }

  const sendSignupCode = async () => {
    const email = signupEmail.trim()
    if (!z.email().safeParse(email).success) {
      setSignupError('email', { type: 'manual', message: '올바른 이메일 형식이 필요합니다.' })
      return
    }

    try {
      setCodeError(null)
      const emailCheck = await checkEmailMutation.mutateAsync(email)
      if (!emailCheck.available) {
        setSignupError('email', { type: 'server', message: '이미 사용 중인 이메일입니다.' })
        return
      }
      await sendCodeMutation.mutateAsync(email)
      setCodeSent(true)
      setCode('')
      startTimer()
    } catch (error) {
      setCodeError(getErrorMessage(error, '인증코드 발송에 실패했습니다.'))
    }
  }

  const verifySignupCode = async () => {
    const email = signupEmail.trim()
    if (!email || code.length !== 6) {
      setCodeError('인증코드 6자리를 입력해 주세요.')
      return
    }

    try {
      setCodeError(null)
      const response = await verifyCodeMutation.mutateAsync({ email, code })
      setVerifiedToken(response.verifiedToken)
      setEmailVerified(true)
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    } catch (error) {
      setCodeError(getErrorMessage(error, '인증코드가 올바르지 않습니다.'))
    }
  }

  const onSignup = async (values: SignupFormValues) => {
    if (!emailVerified || !verifiedToken) {
      setCodeError('이메일 인증을 먼저 완료해 주세요.')
      return
    }

    const response = await signupMutation.mutateAsync({
      email: values.email,
      name: values.name.trim(),
      password: values.password,
      verifiedToken,
    })
    setSession(response)
    window.history.pushState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const signupEmailRegister = registerSignup('email', {
    onChange: resetEmailVerification,
  })

  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[1120px] items-center px-4 py-10">
      <section
        className={`relative min-h-[640px] w-full overflow-hidden rounded-lg border border-surface-border-soft bg-surface-raised shadow-2xl transition-colors ${
          isSignup ? 'lg:[&_.signin-panel]:translate-x-full lg:[&_.signup-panel]:translate-x-full lg:[&_.signup-panel]:opacity-100 lg:[&_.signup-panel]:z-20 lg:[&_.switch-overlay]:-translate-x-full lg:[&_.switch-track]:translate-x-1/2' : ''
        }`}
      >
        <div
          className={`signin-panel absolute left-0 top-0 flex h-full w-full items-center justify-center bg-surface-raised px-6 py-10 transition-all duration-500 ease-in-out lg:w-1/2 lg:px-12 ${
            isSignup ? 'z-10 opacity-0' : 'z-20 opacity-100'
          }`}
        >
          <form className="w-full max-w-[380px] space-y-4" onSubmit={handleLoginSubmit(onLogin)}>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <KeyRound className="size-5" />
              </div>
              <h1 className="text-3xl font-black text-text-primary">로그인</h1>
              <p className="mt-2 text-sm text-text-secondary">계정으로 Prototype Registry에 진입합니다.</p>
            </div>

            <label className="block space-y-2 text-left">
              <span className="text-sm text-text-secondary">이메일</span>
              <Input {...registerLogin('email')} className="h-11" type="email" placeholder="you@example.com" />
              {loginErrors.email ? <span className="text-sm text-destructive">{loginErrors.email.message}</span> : null}
            </label>

            <PasswordInput
              label="비밀번호"
              registration={registerLogin('password')}
              visible={showPassword}
              error={loginErrors.password?.message}
              onToggle={() => setShowPassword((value) => !value)}
            />

            <button
              type="button"
              className="text-sm font-semibold text-brand-primary underline"
              onClick={() => setForgotPasswordOpen(true)}
            >
              비밀번호 찾기
            </button>

            <Button type="submit" className="h-11 w-full gap-2" disabled={loginMutation.isPending}>
              <ArrowRight className="size-4" />
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </div>

        <div
          className={`signup-panel absolute left-0 top-0 flex h-full w-full items-center justify-center bg-surface-raised px-6 py-10 transition-all duration-500 ease-in-out lg:w-1/2 lg:px-12 ${
            isSignup ? 'z-20 opacity-100' : 'z-10 opacity-0'
          }`}
        >
          <form className="w-full max-w-[400px] space-y-4" onSubmit={handleSignupSubmit(onSignup)}>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <UserPlus className="size-5" />
              </div>
              <h1 className="text-3xl font-black text-text-primary">회원가입</h1>
              <p className="mt-2 text-sm text-text-secondary">이메일 인증 후 계정을 만듭니다.</p>
            </div>

            <label className="block space-y-2 text-left">
              <span className="text-sm text-text-secondary">이메일</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_104px]">
                <Input
                  {...signupEmailRegister}
                  type="email"
                  placeholder="you@example.com"
                  disabled={emailVerified}
                  className="h-11"
                />
                {!emailVerified ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-0 text-xs"
                    disabled={checkEmailMutation.isPending || sendCodeMutation.isPending}
                    onClick={sendSignupCode}
                  >
                    {sendCodeMutation.isPending ? '발송 중...' : codeSent ? '재발송' : '인증코드 발송'}
                  </Button>
                ) : (
                  <span className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-semibold text-brand-primary">
                    <CheckCircle2 className="size-4" />
                    인증 완료
                  </span>
                )}
              </div>
              {signupErrors.email ? <span className="text-sm text-destructive">{signupErrors.email.message}</span> : null}
            </label>

            {codeSent && !emailVerified ? (
              <div className="space-y-2 text-left">
                <span className="text-sm text-text-secondary">인증코드</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_72px]">
                  <div className="relative flex-1">
                    <Input
                      value={code}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6자리"
                      className="h-11 pr-16"
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
                    className="h-11 px-0 text-xs"
                    disabled={verifyCodeMutation.isPending || code.length !== 6}
                    onClick={verifySignupCode}
                  >
                    {verifyCodeMutation.isPending ? '확인 중...' : '확인'}
                  </Button>
                </div>
              </div>
            ) : null}

            {codeError ? (
              <div className="rounded-md border border-surface-border-soft bg-danger-glass px-3 py-2 text-sm text-destructive">
                {codeError}
              </div>
            ) : null}

            <label className="block space-y-2 text-left">
              <span className="text-sm text-text-secondary">이름</span>
              <Input {...registerSignup('name')} className="h-11" placeholder="홍길동" disabled={!emailVerified} />
              {signupErrors.name ? <span className="text-sm text-destructive">{signupErrors.name.message}</span> : null}
            </label>

            <PasswordInput
              label="비밀번호"
              registration={registerSignup('password')}
              visible={showPassword}
              disabled={!emailVerified}
              error={signupErrors.password?.message}
              onToggle={() => setShowPassword((value) => !value)}
            />

            <PasswordInput
              label="비밀번호 확인"
              registration={registerSignup('confirmPassword')}
              visible={showPassword}
              disabled={!emailVerified}
              error={signupErrors.confirmPassword?.message}
              onToggle={() => setShowPassword((value) => !value)}
            />

            {signupMutation.error ? (
              <div className="rounded-md border border-surface-border-soft bg-danger-glass px-3 py-2 text-sm text-destructive">
                {signupMutation.error.message}
              </div>
            ) : null}

            <Button type="submit" className="h-11 w-full gap-2" disabled={signupMutation.isPending || !emailVerified}>
              <UserPlus className="size-4" />
              {signupMutation.isPending ? '처리 중...' : '계정 만들기'}
            </Button>
          </form>
        </div>

        <div className="switch-overlay pointer-events-none absolute left-1/2 top-0 z-30 hidden h-full w-1/2 overflow-hidden border-l border-surface-border bg-surface-muted transition-transform duration-500 ease-in-out lg:block">
          <div className="switch-track relative -left-full flex h-full w-[200%] bg-surface-muted transition-transform duration-500 ease-in-out">
            <SwitchPanel
              title="다시 오셨나요?"
              description="프로토타입 공유 및 개발 커뮤니티에서 저장된 문서, 회의, 피드백으로 바로 돌아갑니다."
              buttonLabel="로그인"
              onClick={() => setIsSignup(false)}
            />
            <SwitchPanel
              title="같이 만들어볼까요?"
              description="아이디어, 기능 흐름, 문서 초안을 프로토타입으로 공유하고 개발자들과 함께 발전시킵니다."
              buttonLabel="회원가입"
              onClick={() => setIsSignup(true)}
            />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2 lg:hidden">
          <Button variant={!isSignup ? 'primary' : 'secondary'} size="sm" onClick={() => setIsSignup(false)}>
            로그인
          </Button>
          <Button variant={isSignup ? 'primary' : 'secondary'} size="sm" onClick={() => setIsSignup(true)}>
            회원가입
          </Button>
        </div>
      </section>

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
    </main>
  )
}

type PasswordInputProps = {
  label: string
  registration: UseFormRegisterReturn
  visible: boolean
  disabled?: boolean
  error?: string
  onToggle: () => void
}

function PasswordInput({
  label,
  registration,
  visible,
  disabled,
  error,
  onToggle,
}: PasswordInputProps) {
  return (
    <label className="block space-y-2 text-left">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="relative">
        <Input
          {...registration}
          type={visible ? 'text' : 'password'}
          placeholder="8자 이상 입력"
          className="h-11 pr-10"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition hover:text-text-primary"
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </label>
  )
}

type SwitchPanelProps = {
  title: string
  description: string
  buttonLabel: string
  onClick: () => void
}

function SwitchPanel({ title, description, buttonLabel, onClick }: SwitchPanelProps) {
  return (
    <div className="pointer-events-auto flex h-full w-1/2 flex-col items-center justify-center px-10 text-center text-text-primary transition-transform duration-500">
      <div className="mb-8 w-full max-w-[340px] rounded-lg border border-surface-border-soft bg-surface-raised p-5 text-left shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <Mail className="size-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-primary">
              Dev Community
            </span>
          </div>
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
            Share
          </span>
        </div>
        <div className="grid gap-2">
          {['Prototype', 'Feedback', 'Build Notes'].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-md border border-surface-border-soft bg-surface-muted px-4 py-2.5"
            >
              <span className="text-xs font-semibold text-text-secondary">{item}</span>
              <span className="size-1.5 rounded-full bg-brand-primary" />
            </div>
          ))}
        </div>
      </div>
      <h2 className="text-4xl font-black">{title}</h2>
      <p className="mt-5 max-w-[360px] text-sm leading-7 text-text-secondary">{description}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-7 h-10 min-w-[104px] px-5 text-sm"
        onClick={onClick}
      >
        {buttonLabel}
      </Button>
    </div>
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
