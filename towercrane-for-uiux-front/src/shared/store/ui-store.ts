import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedScenarioCategories, type PrototypeStatus, type PrototypeVisibility } from '../config/catalog'

export type WorkbenchFilters = {
  query: string
  status: 'all' | PrototypeStatus
  visibility: 'all' | PrototypeVisibility
}

type UiStoreState = {
  activeSection: string
  activeCategoryId: string
  activePrototypeId: string | null
  activeWorkspace: 'overview' | 'prototypes' | 'backend'
  themeColor: 'default' | 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'light'
  filters: WorkbenchFilters
  setActiveSection: (section: string) => void
  setActiveCategory: (id: string) => void
  setActivePrototypeId: (id: string | null) => void
  setActiveWorkspace: (workspace: 'overview' | 'prototypes' | 'backend') => void
  setThemeColor: (color: 'default' | 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'light') => void
  applyFilters: (filters: WorkbenchFilters) => void
}

export const defaultFilters: WorkbenchFilters = {
  query: '',
  status: 'all',
  visibility: 'all',
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set) => ({
      activeSection: 'prototype',
      activeCategoryId: seedScenarioCategories[0]?.id ?? 'fsd-architecture',
      activePrototypeId: null,
      activeWorkspace: 'overview',
      themeColor: 'default',
      filters: defaultFilters,
      setActiveSection: (activeSection) => set({ activeSection }),
      setActiveCategory: (activeCategoryId) => set({ activeCategoryId }),
      setActivePrototypeId: (activePrototypeId) => set({ activePrototypeId }),
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      setThemeColor: (themeColor) => set({ themeColor }),
      applyFilters: (filters) => set({ filters }),
    }),
    {
      name: 'towercrane-workbench-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
