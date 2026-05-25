import { create } from 'zustand'

type IntroDialogState = {
  open: boolean
  message: string
  setIntroDialog: (message: string) => void
  closeIntroDialog: () => void
}

export const useToolDialogStore = create<IntroDialogState>((set) => ({
  open: false,
  message: '',
  setIntroDialog: (message) => set({ open: true, message }),
  closeIntroDialog: () => set({ open: false, message: '' }),
}))
