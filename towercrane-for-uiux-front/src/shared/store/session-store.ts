import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { SessionUser } from '../api/auth'
import { useChatSessionStore } from '../../features/chatbot/model/chat-session-store'

export type AuthMode = 'login' | 'signup'

type SessionStoreState = {
  authMode: AuthMode
  isAuthenticated: boolean
  token: string
  userId: string
  userEmail: string
  userName: string
  profileImageUrl: string | null
  userRole: string
  aiAccess: boolean
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
      profileImageUrl: null,
      userRole: '',
      aiAccess: false,
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
          profileImageUrl: user.profileImageUrl ?? null,
          userRole: user.role,
          aiAccess: user.aiAccess ?? false,
          authMode: 'login',
        }),
      syncUser: (user) =>
        set({
          isAuthenticated: true,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          profileImageUrl: user.profileImageUrl ?? null,
          userRole: user.role,
          aiAccess: user.aiAccess ?? false,
        }),
      clearSession: () => {
        useChatSessionStore.getState().resetStore()
        set({
          token: '',
          isAuthenticated: false,
          userId: '',
          userEmail: '',
          userName: '',
          profileImageUrl: null,
          userRole: '',
          aiAccess: false,
          authMode: 'login',
        })
      },
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
