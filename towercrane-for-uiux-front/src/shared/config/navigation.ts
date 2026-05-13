import {
  BookOpen,
  GitBranch,
  Trophy,
} from 'lucide-react'

export const navigationItems = [
  { id: 'prototype', label: 'Prototype', icon: GitBranch },
  { id: 'study_diary', label: 'Study Diary', icon: BookOpen },
  { id: 'dev_challenge', label: 'Dev Challenge', icon: Trophy },
  { id: 'readme', label: 'README', icon: BookOpen },
] as const

export const adminItems = [
  { id: 'users', label: '유저 관리' },
  { id: 'readme_admin', label: 'README 관리' },
  { id: 'menu_admin', label: '메뉴 관리' },
] as const
