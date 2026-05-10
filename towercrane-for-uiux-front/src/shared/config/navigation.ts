import {
  BookOpenText,
  Trophy,
  GitBranch,
} from 'lucide-react'

export const navigationItems = [
  { id: 'prototype', label: 'Prototype', icon: GitBranch },
  { id: 'chatbot', label: 'Challenge with GPT', icon: Trophy },
  { id: 'readme', label: 'README', icon: BookOpenText },
] as const

export const adminItems = [
  { id: 'users', label: '유저 관리' },
  { id: 'readme_admin', label: 'README 관리' },
  { id: 'menu_admin', label: '메뉴 관리' },
] as const
