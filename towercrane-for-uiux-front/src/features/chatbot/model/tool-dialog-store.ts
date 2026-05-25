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

type IntroDialogState = {
  open: boolean
  profile: GptProfile | null
  setIntroDialog: (profile: GptProfile) => void
  closeIntroDialog: () => void
}

export const useToolDialogStore = create<IntroDialogState>((set) => ({
  open: false,
  profile: null,
  setIntroDialog: (profile) => set({ open: true, profile }),
  closeIntroDialog: () => set({ open: false, profile: null }),
}))
