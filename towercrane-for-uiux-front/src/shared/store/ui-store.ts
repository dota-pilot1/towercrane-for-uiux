import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedScenarioCategories, type PrototypeStatus, type PrototypeVisibility } from '../config/catalog'

export type WorkbenchFilters = {
  query: string
  status: 'all' | PrototypeStatus
  visibility: 'all' | PrototypeVisibility
}

type UiStoreState = {
  activeCategoryId: string
  activeWorkspace: 'overview' | 'prototypes' | 'backend'
  themeColor: 'emerald' | 'blue' | 'violet' | 'rose' | 'amber'
  filters: WorkbenchFilters
  setActiveCategory: (id: string) => void
  setActiveWorkspace: (workspace: 'overview' | 'prototypes' | 'backend') => void
  setThemeColor: (color: 'emerald' | 'blue' | 'violet' | 'rose' | 'amber') => void
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
      activeCategoryId: seedScenarioCategories[0]?.id ?? 'fsd-architecture',
      activeWorkspace: 'overview',
      themeColor: 'emerald',
      filters: defaultFilters,
      setActiveCategory: (activeCategoryId) => set({ activeCategoryId }),
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
