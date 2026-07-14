import { useQuery } from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type OrgMember = {
  id: string
  name: string
  email: string
  position: string | null
  role: 'admin' | 'user'
  profileImageUrl: string | null
}

export type OrgNode = {
  id: string
  name: string
  members: OrgMember[]
  children: OrgNode[]
}

export function useOrgTree() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['org', 'tree'],
    queryFn: () => apiRequest<OrgNode[]>('/org/tree'),
    enabled: isAuthenticated,
  })
}
