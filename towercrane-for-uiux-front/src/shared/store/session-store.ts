import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SessionUser } from '../api/auth'

export type AuthMode = 'login' | 'signup'

type SessionStoreState = {
  authMode: AuthMode
  isAuthenticated: boolean
  token: string
  userId: string
  userEmail: string
  userName: string
  userRole: string
  hasHydrated: boolean
  setAuthMode: (mode: AuthMode) => void
  hydrateSession: () => void
  setSession: (session: { token: string; user: SessionUser }) => void
  syncUser: (user: SessionUser) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set) => ({
      authMode: 'login',
      isAuthenticated: false,
      token: '',
      userId: '',
      userEmail: '',
      userName: '',
      userRole: '',
      hasHydrated: false,
      setAuthMode: (authMode) => set({ authMode }),
      hydrateSession: () => set({ hasHydrated: true }),
      setSession: ({ token, user }) =>
        set({
          token,
          isAuthenticated: true,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          authMode: 'login',
        }),
      syncUser: (user) =>
        set({
          isAuthenticated: true,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
        }),
      clearSession: () =>
        set({
          token: '',
          isAuthenticated: false,
          userId: '',
          userEmail: '',
          userName: '',
          userRole: '',
          authMode: 'login',
        }),
    }),
    {
      name: 'towercrane-session-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.hydrateSession()
      },
    },
  ),
)
