import { create } from 'zustand'

export type OrderStatus = 'all' | 'ready' | 'review' | 'issued' | 'hold'

export type WorkbenchFilters = {
  keyword: string
  team: string
  status: OrderStatus
  minAmount: number
}

type UiStoreState = {
  activeMenu: string
  activeWorkspace: string
  filters: WorkbenchFilters
  setActiveMenu: (menu: string) => void
  setActiveWorkspace: (workspace: string) => void
  applyFilters: (filters: WorkbenchFilters) => void
}

export const defaultFilters: WorkbenchFilters = {
  keyword: '',
  team: 'all',
  status: 'all',
  minAmount: 0,
}

export const useUiStore = create<UiStoreState>((set) => ({
  activeMenu: 'overview',
  activeWorkspace: 'layout-system',
  filters: defaultFilters,
  setActiveMenu: (activeMenu) => set({ activeMenu }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  applyFilters: (filters) => set({ filters }),
}))
