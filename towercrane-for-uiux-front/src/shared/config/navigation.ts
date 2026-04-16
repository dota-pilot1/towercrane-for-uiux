import {
  CreditCard,
  LayoutDashboard,
  PanelsTopLeft,
  Search,
  TicketPercent,
} from 'lucide-react'

export const navigationItems = [
  { id: 'overview', label: '레이아웃 배치', icon: LayoutDashboard },
  { id: 'search', label: '검색폼', icon: Search },
  { id: 'workspace', label: '탭 분할', icon: PanelsTopLeft },
  { id: 'coupon', label: '쿠폰 발급', icon: TicketPercent },
  { id: 'payment', label: '결제 관리', icon: CreditCard },
] as const
