import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { SqlExampleLevel } from '../../../entities/sql-practice/model/example-types'

type SqlPracticeSelectionState = {
  selectedExampleId: string | null
  activeLevel: SqlExampleLevel
  setSelectedExampleId: (id: string | null) => void
  setActiveLevel: (level: SqlExampleLevel) => void
}

export const useSqlPracticeSelectionStore = create<SqlPracticeSelectionState>()(
  persist(
    (set) => ({
      selectedExampleId: null,
      activeLevel: 'beginner',
      setSelectedExampleId: (selectedExampleId) => set({ selectedExampleId }),
      setActiveLevel: (activeLevel) => set({ activeLevel }),
    }),
    {
      name: 'sql-practice-selection',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
