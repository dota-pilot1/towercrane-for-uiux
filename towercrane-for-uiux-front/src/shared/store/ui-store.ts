import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PrototypeStatus, PrototypeVisibility } from '../config/catalog'

export type WorkbenchFilters = {
  query: string
  status: 'all' | PrototypeStatus
  visibility: 'all' | PrototypeVisibility
}

type UiStoreState = {
  activeWorkspace: 'overview' | 'prototypes' | 'backend'
  themeColor: 'default' | 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'light'
  filters: WorkbenchFilters
  chatbotSidebarWidth: number
  setActiveWorkspace: (workspace: 'overview' | 'prototypes' | 'backend') => void
  setThemeColor: (
    color: 'default' | 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'light',
  ) => void
  applyFilters: (filters: WorkbenchFilters) => void
  setChatbotSidebarWidth: (width: number) => void
}

export const defaultFilters: WorkbenchFilters = {
  query: '',
  status: 'all',
  visibility: 'all',
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set) => ({
      activeWorkspace: 'overview',
      themeColor: 'default',
      filters: defaultFilters,
      chatbotSidebarWidth: 280,
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      setThemeColor: (themeColor) => set({ themeColor }),
      applyFilters: (filters) => set({ filters }),
      setChatbotSidebarWidth: (chatbotSidebarWidth) => set({ chatbotSidebarWidth }),
    }),
    {
      name: 'towercrane-workbench-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
