import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'

export type SessionUser = {
  id: string
  email: string
  name: string
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
