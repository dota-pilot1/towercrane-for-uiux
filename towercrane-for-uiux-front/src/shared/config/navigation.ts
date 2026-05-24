import {
  BookOpen,
  GitBranch,
  Trophy,
} from 'lucide-react'

export const navigationItems = [
  { id: 'prototype', label: 'Prototype', icon: GitBranch },
  { id: 'study_diary', label: '학습 일지', icon: BookOpen },
  { id: 'dev_challenge', label: 'Challenge', icon: Trophy },
  { id: 'readme', label: 'README', icon: BookOpen },
] as const

export const adminItems = [
  { id: 'users', label: '유저 관리' },
  { id: 'readme_admin', label: 'README 관리' },
  { id: 'menu_admin', label: '메뉴 관리' },
] as const
