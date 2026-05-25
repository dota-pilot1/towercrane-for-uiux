import { useEffect } from 'react'
import { apiRequest } from '../api/http'
import { useSessionStore } from '../store/session-store'
import type { SessionUser } from '../api/auth'

export function useRefreshSession() {
  const syncUser = useSessionStore((s) => s.syncUser)
  useEffect(() => {
    apiRequest<SessionUser>('/auth/me')
      .then((user) => { if (user) syncUser(user) })
      .catch(() => {})
  }, [])
}
