import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type ManagedUser = {
  id: string
  email: string
  name: string
  profileImageUrl?: string | null
  role: 'admin' | 'user'
  createdAt: string
  departmentId?: string | null
  position?: string | null
}

export type Department = {
  id: string
  name: string
  parentId: string | null
  orderIdx: number
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

export function useDepartments() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: ['org', 'departments'],
    queryFn: () => apiRequest<Department[]>('/org/departments'),
    enabled: isAuthenticated,
  })
}

export function useUpdateUserAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      departmentId,
      position,
    }: {
      userId: string
      departmentId: string | null
      position: string | null
    }) =>
      apiRequest<ManagedUser>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ departmentId, position }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
