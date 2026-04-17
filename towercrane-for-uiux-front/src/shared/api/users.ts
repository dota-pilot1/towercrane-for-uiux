import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type ManagedUser = {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
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
