import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FileText, Plane, Receipt, ShoppingCart } from 'lucide-react'
import type { ApprovalCategory } from '../../../shared/api/approval'

export const CATEGORY_ICON: Record<ApprovalCategory, LucideIcon> = {
  LEAVE: CalendarDays,
  PURCHASE: ShoppingCart,
  TRIP: Plane,
  EXPENSE: Receipt,
  PROPOSAL: FileText,
}
