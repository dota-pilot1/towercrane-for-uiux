import type {
  SqlExampleLevel,
  SqlPracticeExampleSet,
} from '../../../../entities/sql-practice/model/example-types'
import { boardBasicExamples } from './01_board_basic'
import { shopOrderExamples } from './02_shop_order'
import { hrAttendanceExamples } from './03_hr_attendance'
import { projectTaskExamples } from './04_project_task'
import { reservationScheduleExamples } from './05_reservation_schedule'
import { supportTicketExamples } from './06_support_ticket'
import { salesCrmExamples } from './07_sales_crm'
import { analyticsEventExamples } from './08_analytics_event'
import { financeReconciliationExamples } from './09_finance_reconciliation'
import { inventorySupplyChainExamples } from './10_inventory_supply_chain'
import { joinSpecialExamples } from './11_join_special'

export const sqlPracticeExampleSets: SqlPracticeExampleSet[] = [
  boardBasicExamples,
  shopOrderExamples,
  hrAttendanceExamples,
  projectTaskExamples,
  reservationScheduleExamples,
  supportTicketExamples,
  salesCrmExamples,
  analyticsEventExamples,
  financeReconciliationExamples,
  inventorySupplyChainExamples,
  joinSpecialExamples,
]

export const sqlExampleLevelLabels: Record<SqlExampleLevel, string> = {
  beginner: '초보',
  intermediate: '중수',
  advanced: '고수',
}

const emptyExampleSet = (seedFile: string): SqlPracticeExampleSet => ({
  seedFile,
  beginner: [],
  intermediate: [],
  advanced: [],
})

export function getSqlPracticeExampleSet(seedFile: string): SqlPracticeExampleSet {
  return (
    sqlPracticeExampleSets.find((exampleSet) => exampleSet.seedFile === seedFile) ??
    emptyExampleSet(seedFile)
  )
}
