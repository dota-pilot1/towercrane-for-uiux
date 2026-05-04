import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'

export type SessionUser = {
  id: string
  email: string
  name: string
  profileImageUrl?: string | null
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  token: string
  user: SessionUser
  expiresAt: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type SignupPayload = LoginPayload & {
  name: string
  verifiedToken: string
}

export type VerifyEmailCodeResponse = {
  verifiedToken: string
}

export type ResetPasswordWithCodePayload = {
  email: string
  verifiedToken: string
  newPassword: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
  })
}

export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SignupPayload) =>
      apiRequest<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
  })
}

export function useCheckEmail() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<{ available: boolean }>(
        `/auth/check-email?email=${encodeURIComponent(email)}`,
        {
          skipAuth: true,
        },
      ),
  })
}

export function useSendVerificationCode() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<void>('/auth/email/send-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      }),
  })
}

export function useVerifyEmailCode() {
  return useMutation({
    mutationFn: (payload: { email: string; code: string }) =>
      apiRequest<VerifyEmailCodeResponse>('/auth/email/verify-code', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      }),
  })
}

export function useRequestPasswordResetCode() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<void>('/auth/password-reset/request-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      }),
  })
}

export function useVerifyPasswordResetCode() {
  return useMutation({
    mutationFn: (payload: { email: string; code: string }) =>
      apiRequest<VerifyEmailCodeResponse>('/auth/password-reset/verify-code', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      }),
  })
}

export function useResetPasswordWithCode() {
  return useMutation({
    mutationFn: (payload: ResetPasswordWithCodePayload) =>
      apiRequest<void>('/auth/password-reset/reset-with-code', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      queryClient.removeQueries({ queryKey: ['catalog', 'categories'] })
    },
  })
}

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest<SessionUser>('/auth/me'),
    enabled,
    retry: false,
  })
}

export function useUpdateProfileImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profileImageUrl: string | null) =>
      apiRequest<SessionUser>('/users/me/profile-image', {
        method: 'PATCH',
        body: JSON.stringify({ profileImageUrl }),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user)
    },
  })
}
