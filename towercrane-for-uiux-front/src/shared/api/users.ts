import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type ManagedUser = {
  id: string
  email: string
  name: string
  profileImageUrl?: string | null
  role: 'admin' | 'user'
  createdAt: string
}

export type AssignableUser = {
  id: string
  email: string
  name: string
  profileImageUrl?: string | null
  role: 'admin' | 'user'
}

export function useUsersList() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const userRole = useSessionStore((state) => state.userRole)

  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiRequest<ManagedUser[]>('/users'),
    enabled: isAuthenticated && userRole === 'admin',
  })
}

export function useAssignableUsers() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => apiRequest<AssignableUser[]>('/users/assignable'),
    enabled: isAuthenticated,
  })
}
