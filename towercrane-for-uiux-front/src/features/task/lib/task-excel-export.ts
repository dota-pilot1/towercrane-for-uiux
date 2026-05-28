import type { Sheet, SheetData } from 'write-excel-file/browser'

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '../../../entities/task/model/constants'
import type { Task } from '../../../entities/task/model/types'

type TaskExportWorksheet = {
  name: string
  tasks: Task[]
}

const PUBLIC_FRONTEND_ORIGIN = 'https://hibot-docu.com'

const TASK_EXPORT_COLUMNS = [
  '순서',
  '업무 ID',
  '제목',
  '유형',
  '상태',
  '우선순위',
  '담당자',
  '마감일',
  '작성자',
  '작성일',
  '링크',
] as const

const TASK_EXPORT_COLUMN_WIDTHS = [
  6,
  22,
  42,
  10,
  10,
  10,
  14,
  12,
  12,
  12,
  36,
].map((width) => ({ width }))

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR').format(date)
}

function publicTaskUrl(taskId: string) {
  const origin = window.location.origin
  const baseOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? PUBLIC_FRONTEND_ORIGIN
    : origin
  return `${baseOrigin}/task/${taskId}`
}

function taskToRow(task: Task, index: number) {
  return [
    String(index + 1),
    task.id,
    task.title,
    TASK_TYPE_LABELS[task.taskType],
    TASK_STATUS_LABELS[task.status],
    TASK_PRIORITY_LABELS[task.priority],
    task.assigneeName ?? '미지정',
    formatDate(task.dueDate),
    task.reporterName ?? '-',
    formatDate(task.createdAt),
    publicTaskUrl(task.id),
  ]
}

function sanitizeSheetName(name: string) {
  const normalized = name
    .replace(/[\\:*?/]/g, ' ')
    .replace(/\[/g, ' ')
    .replace(/\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (normalized || '업무').slice(0, 31)
}

function makeUniqueSheetNames(worksheets: TaskExportWorksheet[]) {
  const used = new Set<string>()

  return worksheets.map((worksheet, index) => {
    const baseName = sanitizeSheetName(worksheet.name || `업무 ${index + 1}`)
    let name = baseName
    let suffix = 2

    while (used.has(name)) {
      const suffixText = ` (${suffix})`
      name = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`
      suffix += 1
    }

    used.add(name)
    return name
  })
}

function worksheetData(tasks: Task[]): SheetData {
  return [
    TASK_EXPORT_COLUMNS.map((value) => ({
      value,
      fontWeight: 'bold' as const,
      backgroundColor: '#E7F4EF',
      borderColor: '#BFD8CF',
      borderStyle: 'thin' as const,
    })),
    ...tasks.map((task, index) => taskToRow(task, index)),
  ]
}

export async function downloadTaskExcelWorkbook(
  worksheets: TaskExportWorksheet[],
  fileName: string,
) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const safeWorksheets = worksheets.length > 0 ? worksheets : [{ name: '업무', tasks: [] }]
  const sheetNames = makeUniqueSheetNames(safeWorksheets)
  const sheets: Sheet<Blob>[] = safeWorksheets.map((worksheet, index) => ({
    sheet: sheetNames[index],
    data: worksheetData(worksheet.tasks),
    columns: TASK_EXPORT_COLUMN_WIDTHS,
    stickyRowsCount: 1,
  }))

  await writeExcelFile(sheets, {
    fontFamily: 'Arial',
    fontSize: 11,
  }).toFile(fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}
