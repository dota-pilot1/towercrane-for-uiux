import type {
  CreateTaskRequest,
  TaskPriority,
  TaskScope,
  TaskStatus,
  TaskType,
} from '../../../entities/task/model/types'

const VALID_TASK_TYPES: TaskType[] = [
  'FEATURE',
  'BUG',
  'DOCS',
  'DESIGN',
  'REFACTOR',
  'QA',
  'CHORE',
]
const VALID_TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'HOLD']
const VALID_TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

export function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!match) return { meta: {} as Record<string, string>, body: markdown }

  const meta = match[1].split('\n').reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex < 0) return acc
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) acc[key] = value
    return acc
  }, {})

  return {
    meta,
    body: markdown.slice(match[0].length),
  }
}

export function getMarkdownTitle(markdown: string, fallback: string) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return title || stripExtension(fallback) || '새 업무'
}

export function readMarkdownSection(markdown: string, sectionNames: string[]) {
  for (const name of sectionNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = markdown.match(
      new RegExp(`(?:^|\\n)#{2,3}\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s+|$)`, 'i'),
    )
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return ''
}

function stripMarkdownFence(value: string) {
  const match = value.trim().match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/)
  return (match?.[1] ?? value).trim()
}

function markdownListItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+\[[ xX]\]\s+/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim(),
    )
    .filter(Boolean)
}

function normalizeTaskType(value?: string): TaskType {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'BUG' || value === '버그') return 'BUG'
  if (normalized === 'DOCS' || value === '문서') return 'DOCS'
  if (normalized === 'DESIGN' || value === '디자인') return 'DESIGN'
  if (normalized === 'REFACTOR' || value === '리팩터링') return 'REFACTOR'
  if (normalized === 'QA' || value === '테스트') return 'QA'
  if (normalized === 'CHORE' || value === '작업') return 'CHORE'
  return 'FEATURE'
}

function normalizeTaskStatus(value?: string): TaskStatus {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'IN_PROGRESS' || normalized === 'PROGRESS' || value === '진행 중') return 'IN_PROGRESS'
  if (normalized === 'REVIEW' || value === '검토') return 'REVIEW'
  if (normalized === 'DONE' || value === '완료') return 'DONE'
  if (normalized === 'HOLD' || value === '보류') return 'HOLD'
  return 'TODO'
}

function normalizeTaskPriority(value?: string): TaskPriority {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'LOW' || value === '낮음') return 'LOW'
  if (normalized === 'HIGH' || value === '높음') return 'HIGH'
  if (normalized === 'URGENT' || value === '긴급') return 'URGENT'
  return 'MEDIUM'
}

export type ParsedTaskMarkdown = {
  payload: CreateTaskRequest
  checklistItems: string[]
}

export function buildTaskPayloadFromMarkdown(
  sourceName: string,
  markdown: string,
  defaultScope: TaskScope,
  currentUserId?: string | null,
  lockAssigneeToCurrentUser = false,
): ParsedTaskMarkdown {
  const { meta, body } = parseFrontmatter(markdown)
  const title = meta.title || getMarkdownTitle(body, sourceName)
  const acceptanceCriteria = readMarkdownSection(body, [
    '완료 기준',
    '인수 조건',
    'Acceptance Criteria',
  ])
  const content =
    readMarkdownSection(body, ['내용', '업무 내용', '업무 배경', '배경', 'Content', 'Summary']) ||
    body
      .replace(/^#\s+.+$/m, '')
      .trim()
      .slice(0, 500)
  const plan = readMarkdownSection(body, ['단계별 계획', '구현 계획', '계획', 'Plan'])
  const checklistItems = markdownListItems(
    readMarkdownSection(body, ['체크리스트', '검증 체크리스트', 'Checklist']),
  )
  const folderStructure = stripMarkdownFence(
    readMarkdownSection(body, ['예상 파일 구조', '파일 구조', '폴더 구조', 'Folder Structure']),
  )
  const mmdContent = stripMarkdownFence(
    readMarkdownSection(body, ['MMD', 'Mermaid', '흐름도', 'Flow']),
  )

  return {
    payload: {
      title,
      content,
      acceptanceCriteria,
      plan,
      folderStructure,
      mmdContent,
      taskType: normalizeTaskType(meta.type || meta.taskType),
      status: normalizeTaskStatus(meta.status),
      priority: normalizeTaskPriority(meta.priority),
      scope: defaultScope,
      visibility: defaultScope === 'PERSONAL' ? 'PRIVATE' : 'TEAM',
      assigneeId: lockAssigneeToCurrentUser ? currentUserId : (meta.assigneeId || null),
      dueDate: meta.dueDate || meta.due || null,
    },
    checklistItems,
  }
}

export type TaskMarkdownValidationResult = {
  errors: string[]
  warnings: string[]
  parsed?: ParsedTaskMarkdown
}

function hasHeadingTitle(markdown: string) {
  return Boolean(markdown.match(/^#\s+(.+)$/m)?.[1]?.trim())
}

function hasSection(markdown: string, sectionNames: string[]) {
  return Boolean(readMarkdownSection(markdown, sectionNames))
}

function isValidDateString(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false

  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return day >= 1 && day <= lastDayOfMonth
}

export function validateTaskMarkdown(
  markdown: string,
  sourceName: string,
  defaultScope: TaskScope = 'TEAM',
  currentUserId?: string | null,
  lockAssigneeToCurrentUser = false,
): TaskMarkdownValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const trimmed = markdown.trim()

  if (!trimmed) {
    return { errors: ['마크다운 내용을 입력하세요.'], warnings }
  }

  const { meta, body } = parseFrontmatter(markdown)
  const title = meta.title || (hasHeadingTitle(body) ? getMarkdownTitle(body, sourceName) : '')

  if (!title.trim()) errors.push('frontmatter title 또는 첫 번째 # 제목이 필요합니다.')
  if (title.length > 120) errors.push('제목은 120자 이하여야 합니다.')

  if (!hasSection(body, ['내용', '업무 내용', '업무 배경', '배경', 'Content', 'Summary'])) {
    errors.push('## 내용 섹션이 필요합니다.')
  }
  if (!hasSection(body, ['완료 기준', '인수 조건', 'Acceptance Criteria'])) {
    errors.push('## 완료 기준 섹션이 필요합니다.')
  }
  if (!hasSection(body, ['단계별 계획', '구현 계획', '계획', 'Plan'])) {
    errors.push('## 단계별 계획 섹션이 필요합니다.')
  }

  const type = meta.type || meta.taskType
  const normalizedType = type?.trim().toUpperCase()
  if (type && !VALID_TASK_TYPES.includes(normalizedType as TaskType)) {
    errors.push(`type은 ${VALID_TASK_TYPES.join(', ')} 중 하나여야 합니다.`)
  }

  const normalizedStatus = meta.status?.trim().toUpperCase()
  if (meta.status && !VALID_TASK_STATUSES.includes(normalizedStatus as TaskStatus)) {
    errors.push(`status는 ${VALID_TASK_STATUSES.join(', ')} 중 하나여야 합니다.`)
  }

  const normalizedPriority = meta.priority?.trim().toUpperCase()
  if (meta.priority && !VALID_TASK_PRIORITIES.includes(normalizedPriority as TaskPriority)) {
    errors.push(`priority는 ${VALID_TASK_PRIORITIES.join(', ')} 중 하나여야 합니다.`)
  }

  const dueDate = meta.dueDate || meta.due
  if (dueDate && !isValidDateString(dueDate)) {
    errors.push('dueDate는 YYYY-MM-DD 형식이어야 합니다.')
  }

  const checklistItems = markdownListItems(
    readMarkdownSection(body, ['체크리스트', '검증 체크리스트', 'Checklist']),
  )
  const longChecklistItem = checklistItems.find((item) => item.length > 300)
  if (checklistItems.length === 0) warnings.push('체크리스트가 없으면 업무만 생성되고 체크리스트 항목은 비어 있습니다.')
  if (checklistItems.length > 20) warnings.push('체크리스트가 20개를 초과하면 앞 20개만 사용하는 것이 안전합니다.')
  if (longChecklistItem) errors.push('체크리스트 항목은 각각 300자 이하여야 합니다.')

  if (!hasSection(body, ['예상 파일 구조', '파일 구조', '폴더 구조', 'Folder Structure'])) {
    warnings.push('## 예상 파일 구조 섹션이 없습니다.')
  }
  if (!hasSection(body, ['MMD', 'Mermaid', '흐름도', 'Flow'])) {
    warnings.push('## MMD 섹션이 없습니다.')
  }

  const parsed =
    errors.length === 0
      ? buildTaskPayloadFromMarkdown(
          sourceName,
          markdown,
          defaultScope,
          currentUserId,
          lockAssigneeToCurrentUser,
        )
      : undefined

  if (parsed?.payload.content && parsed.payload.content.length > 5000) {
    errors.push('내용은 5000자 이하여야 합니다.')
  }
  if (parsed?.payload.acceptanceCriteria && parsed.payload.acceptanceCriteria.length > 8000) {
    errors.push('완료 기준은 8000자 이하여야 합니다.')
  }
  if (parsed?.payload.plan && parsed.payload.plan.length > 8000) {
    errors.push('단계별 계획은 8000자 이하여야 합니다.')
  }
  if (parsed?.payload.folderStructure && parsed.payload.folderStructure.length > 8000) {
    errors.push('예상 파일 구조는 8000자 이하여야 합니다.')
  }
  if (parsed?.payload.mmdContent && parsed.payload.mmdContent.length > 20000) {
    errors.push('MMD는 20000자 이하여야 합니다.')
  }

  return {
    errors,
    warnings,
    parsed: errors.length === 0 ? parsed : undefined,
  }
}
