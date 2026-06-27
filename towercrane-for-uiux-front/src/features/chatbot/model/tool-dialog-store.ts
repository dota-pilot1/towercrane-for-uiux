import { create } from 'zustand'

export type GptProfile = {
  model: string
  developer: string
  released: string
  contextWindow: string
  knowledgeCutoff: string
  languages: string
  capabilities: string[]
  description: string
}

export type TaskItem = {
  id: string
  title: string
  status: string
  priority: string
  taskType: string
  dueDate: string | null
}

type ToolDialogState = {
  introOpen: boolean
  introProfile: GptProfile | null
  setIntroDialog: (profile: GptProfile) => void
  closeIntroDialog: () => void

  tasksOpen: boolean
  tasks: TaskItem[]
  setTasksDialog: (tasks: TaskItem[]) => void
  closeTasksDialog: () => void
}

export const useToolDialogStore = create<ToolDialogState>((set) => ({
  introOpen: false,
  introProfile: null,
  setIntroDialog: (profile) => set({ introOpen: true, introProfile: profile }),
  closeIntroDialog: () => set({ introOpen: false, introProfile: null }),

  tasksOpen: false,
  tasks: [],
  setTasksDialog: (tasks) => set({ tasksOpen: true, tasks }),
  closeTasksDialog: () => set({ tasksOpen: false, tasks: [] }),
}))
