import type { LucideIcon } from 'lucide-react'
import { FolderOpen, Inbox, LayoutDashboard, PenLine, Send } from 'lucide-react'

export const APPROVAL_PATHS = {
  home: '/approval',
  write: '/approval/write',
  inbox: '/approval/inbox',
  sent: '/approval/sent',
  documents: '/approval/documents',
} as const

type ApprovalPath = (typeof APPROVAL_PATHS)[keyof typeof APPROVAL_PATHS]

type ApprovalMenu = {
  label: string
  path: ApprovalPath
  icon: LucideIcon
}

export const APPROVAL_MENUS = [
  {
    label: '결재 홈',
    path: APPROVAL_PATHS.home,
    icon: LayoutDashboard,
  },
  {
    label: '문서 작성',
    path: APPROVAL_PATHS.write,
    icon: PenLine,
  },
  {
    label: '결재할 문서',
    path: APPROVAL_PATHS.inbox,
    icon: Inbox,
  },
  {
    label: '기안 문서',
    path: APPROVAL_PATHS.sent,
    icon: Send,
  },
  {
    label: '문서함',
    path: APPROVAL_PATHS.documents,
    icon: FolderOpen,
  },
] as const satisfies readonly ApprovalMenu[]
