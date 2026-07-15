import { create } from 'zustand'
import type { TaskPriority, TaskStatus, TaskType } from '../../../entities/task/model/types'

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

// get_my_tasks 툴이 DB에서 그대로 실어오는 값 — 서버 schema.ts의 union과 동일하다
export type TaskItem = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  taskType: TaskType
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
