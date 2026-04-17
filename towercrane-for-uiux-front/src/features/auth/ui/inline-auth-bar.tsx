import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Plus, X, UserPlus, Eye, EyeOff, Check } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLogin, useSignup } from '../../../shared/api/auth'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { AuthIconButton } from './auth-icon-button'

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
  const setSession = useSessionStore((state) => state.setSession)
  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
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
  const isPass = password && password.length >= 8 && password === confirmPassword

  const onLoginSubmit = async (values: LoginFormValues) => {
    const response = await loginMutation.mutateAsync(values)
    setSession(response)
  }

  const onSignupSubmit = async (values: SignupFormValues) => {
    const response = await signupMutation.mutateAsync({
      name: values.name.trim(),
      email: values.email,
      password: values.password,
    })
    setSession(response)
    setSignupOpen(false)
    resetSignup()
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
          className="h-[34px] w-[150px] rounded-full border-white/5 bg-white/5 px-3.5 text-[13px] focus:border-emerald-500/30 focus:ring-emerald-500/5"
        />
        <Input
          {...registerLogin('password')}
          type="password"
          placeholder="비밀번호"
          className="h-[34px] w-[110px] rounded-full border-white/5 bg-white/5 px-3.5 text-[13px] focus:border-emerald-500/30 focus:ring-emerald-500/5"
        />
        
        <AuthIconButton
          type="submit"
          variant="emerald"
          icon={ArrowRight}
          disabled={loginMutation.isPending}
          aria-label="로그인"
          title="로그인"
        />

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
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2">
              <Card className="rounded-[28px] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-emerald-200/10 bg-emerald-300/10 p-3 text-emerald-200">
                      <UserPlus className="size-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-semibold text-white">
                        회원가입
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm text-slate-300">
                        계정을 만들고 바로 Prototype 워크스페이스로 진입합니다.
                      </Dialog.Description>
                    </div>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/6 p-2 text-slate-300 transition hover:bg-white/10"
                      aria-label="닫기"
                    >
                      <X className="size-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleSignupSubmit(onSignupSubmit)}>
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">이름</span>
                    <Input {...registerSignup('name')} placeholder="홍길동" />
                    {signupErrors.name ? (
                      <span className="text-sm text-rose-300">{signupErrors.name.message}</span>
                    ) : null}
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">이메일</span>
                    <Input {...registerSignup('email')} placeholder="you@example.com" />
                    {signupErrors.email ? (
                      <span className="text-sm text-rose-300">{signupErrors.email.message}</span>
                    ) : null}
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">비밀번호</span>
                    <div className="relative">
                      <Input
                        {...registerSignup('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="8자 이상 입력"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
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
                      <span className="text-sm text-slate-300">비밀번호 확인</span>
                      {isPass && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
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
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                      {signupMutation.error.message}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <Dialog.Close asChild>
                      <Button type="button" variant="secondary">
                        취소
                      </Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={signupMutation.isPending}>
                      {signupMutation.isPending ? '처리 중...' : '계정 만들기'}
                    </Button>
                  </div>
                </form>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </form>

      {loginErrors.email || loginErrors.password || loginMutation.error ? (
        <div className="mt-1.5 text-right text-[11px] text-rose-200">
          {loginErrors.email ? <span>{loginErrors.email.message}</span> : null}
          {!loginErrors.email && loginErrors.password ? (
            <span>{loginErrors.password.message}</span>
          ) : null}
          {!loginErrors.email && !loginErrors.password && loginMutation.error ? (
            <span>{loginMutation.error.message}</span>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
