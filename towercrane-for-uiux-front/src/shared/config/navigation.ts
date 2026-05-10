import {
  BookOpen,
  GitBranch,
} from 'lucide-react'

export const navigationItems = [
  { id: 'prototype', label: 'Prototype', icon: GitBranch },
  { id: 'chatbot', label: 'Study Diary', icon: BookOpen },
  { id: 'readme', label: 'README', icon: BookOpen },
] as const

export const adminItems = [
  { id: 'users', label: '유저 관리' },
  { id: 'readme_admin', label: 'README 관리' },
  { id: 'menu_admin', label: '메뉴 관리' },
] as const
