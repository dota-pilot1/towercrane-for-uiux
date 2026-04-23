import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LockKeyhole, UserPlus, Check } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLogin, useSignup } from '../../../shared/api/auth'
import type { AuthMode } from '../../../shared/store/session-store'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'

const authSchema = z
  .object({
    name: z.string().trim(),
    email: z.email('올바른 이메일 형식이 필요합니다.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.confirmPassword && value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '비밀번호가 일치하지 않습니다.',
        path: ['confirmPassword'],
      })
    }
  })

type AuthFormValues = z.infer<typeof authSchema>

type AuthPanelProps = {
  mode: AuthMode
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const setAuthMode = useSessionStore((state) => state.setAuthMode)
  const setSession = useSessionStore((state) => state.setSession)
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()
  const signupMutation = useSignup()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const isSignup = mode === 'signup'
  const activeMutation = isSignup ? signupMutation : loginMutation
  const [password, confirmPassword] = watch(['password', 'confirmPassword'])
  const isPass = isSignup && password && password.length >= 8 && password === confirmPassword

  const onSubmit = async (values: AuthFormValues) => {
    if (isSignup) {
      const response = await signupMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email,
        password: values.password,
      })
      setSession(response)
      return
    }

    const response = await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
    })
    setSession(response)
  }

  return (
    <Card className="mx-auto w-full max-w-[560px] rounded-[36px] p-7 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-brand-border bg-brand-glass p-3 text-brand-primary">
          {isSignup ? <UserPlus className="size-5" /> : <LockKeyhole className="size-5" />}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-primary/70">Account</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">
            {isSignup ? '회원가입' : '로그인'}
          </h1>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-[22px] border border-surface-border-soft bg-surface-muted p-1.5">
        <Button
          variant={isSignup ? 'ghost' : 'secondary'}
          className="rounded-[18px]"
          onClick={() => setAuthMode('login')}
        >
          로그인
        </Button>
        <Button
          variant={isSignup ? 'secondary' : 'ghost'}
          className="rounded-[18px]"
          onClick={() => setAuthMode('signup')}
        >
          회원가입
        </Button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {isSignup ? (
          <label className="block space-y-2">
            <span className="text-sm text-text-secondary">이름</span>
            <Input {...register('name')} placeholder="홍길동" />
            {errors.name ? <span className="text-sm text-destructive">{errors.name.message}</span> : null}
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-text-secondary">이메일</span>
          <Input {...register('email')} placeholder="you@example.com" />
          {errors.email ? <span className="text-sm text-destructive">{errors.email.message}</span> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-text-secondary">비밀번호</span>
          <div className="relative group">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="8자 이상 입력"
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {errors.password ? (
            <span className="text-sm text-destructive">{errors.password.message}</span>
          ) : null}
        </label>

        {isSignup ? (
          <label className="block space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">비밀번호 확인</span>
              {isPass && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Check className="size-3" />
                  Pass
                </span>
              )}
            </div>
            <div className="relative group">
              <Input
                {...register('confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호 다시 입력"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <span className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </span>
            ) : null}
          </label>
        ) : null}

        {activeMutation.error ? (
          <div className="rounded-2xl border border-destructive/20 bg-danger-glass px-4 py-3 text-sm text-destructive">
            {activeMutation.error.message}
          </div>
        ) : null}

        <Button type="submit" className="mt-2 w-full">
          {activeMutation.isPending
            ? '처리 중...'
            : isSignup
              ? '계정 만들기'
              : '로그인'}
        </Button>
      </form>
    </Card>
  )
}
