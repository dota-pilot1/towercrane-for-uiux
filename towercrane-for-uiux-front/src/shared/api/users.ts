import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './http'

export type ManagedUser = {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
}

export function useUsersList() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiRequest<ManagedUser[]>('/users'),
  })
}
