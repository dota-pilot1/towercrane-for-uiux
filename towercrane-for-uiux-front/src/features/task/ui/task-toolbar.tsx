import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  FileText,
  FileUp,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCcw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
} from '../../../entities/task/model/constants'
import type { TaskFilters, TaskPriority, TaskType } from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { API_BASE_URL } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { SearchField } from '../../../shared/ui/search-field'
import { Textarea } from '../../../shared/ui/textarea'
import { validateTaskMarkdown } from '../lib/task-markdown'
import { AssigneeSelect } from './assignee-select'

export type TaskViewMode = 'table' | 'kanban' | 'card'
type TaskHelpTab = 'markdown' | 'file' | 'codex'

function getCodexCommitTasksEndpoint(workspaceId?: string) {
  return `${API_BASE_URL}/public/tasks/agent/workspaces/${workspaceId ?? '<workspaceId>'}/commit-tasks`
}

const TASK_FILE_TEMPLATE = `---
title: 프로토타입 워크스페이스 삭제 기능
type: FEATURE
status: TODO
priority: MEDIUM
dueDate: 2026-06-01
---

# 프로토타입 워크스페이스 삭제 기능

## 내용
업무 배경과 구현 범위를 짧게 적습니다.

## 완료 기준
- 사용자가 대상 워크스페이스를 확인하고 삭제할 수 있습니다.
- 삭제 성공 후 목록이 갱신됩니다.
- 실패 시 오류 메시지가 표시됩니다.

## 단계별 계획
1. 현재 구조 확인
2. 삭제 API 연결
3. 캐시 갱신 검증

## 예상 파일 구조
\`\`\`txt
towercrane-for-uiux-front/src/...
towercrane-for-uiux-server/src/...
\`\`\`

## 체크리스트
- 현재 구조 확인
- 삭제 API 연결
- 캐시 갱신 검증
- 로컬 테스트

## MMD
\`\`\`mermaid
flowchart TD
  A[삭제 클릭] --> B[확인 다이어로그]
  B --> C[삭제 API 호출]
\`\`\``

function buildCodexCurlExample(currentWorkspaceId?: string) {
  return `curl -X POST "${getCodexCommitTasksEndpoint(currentWorkspaceId)}" \\
  -H "x-towercrane-agent-key: <TOWERCRANE_AGENT_KEY>" \\
  -H "Content-Type: application/json" \\
  -d @agent-commit-tasks.json`
}

function buildCodexCommitPromptExample(currentWorkspaceId?: string, currentWorkspaceName?: string) {
  const endpoint = getCodexCommitTasksEndpoint(currentWorkspaceId)
  const workspaceInstruction = currentWorkspaceId
    ? `- 현재 워크스페이스: ${currentWorkspaceName ?? '이 워크스페이스'} (${currentWorkspaceId})
- 요청 URL path의 workspaceId는 반드시 "${currentWorkspaceId}"를 사용한다.`
    : `- workspaceId가 없으면 현재 URL의 /task/workspaces/{workspaceId} 구간에서 workspaceId를 먼저 확인한다.`

  return `커밋을 만들 때마다 이번 커밋에서 남은 할일/후속 작업을 Towercrane에 올려줘.

방법:
${workspaceInstruction}
- POST 요청으로 아래 전용 API에 요청한다.
  ${endpoint}
- Header는 아래처럼 보낸다. 로그인 토큰이 아니라 Agent 전용 키를 사용한다.
  x-towercrane-agent-key: <TOWERCRANE_AGENT_KEY>
  Content-Type: application/json
- Body는 JSON으로 아래 형식을 채워서 요청한다.
- tasks 배열에는 커밋 후 실제로 추적해야 하는 할일만 넣는다.
- 할일이 없으면 API를 호출하지 말고 "등록할 할일 없음"이라고 보고한다.
- 한 번에 최대 50개까지 보낼 수 있다.

body json 예시:
{
  "commitHash": "$(git rev-parse HEAD)",
  "commitMessage": "$(git log -1 --pretty=%s)",
  "source": "agent",
  "tasks": [
    {
      "title": "완료 목록 다이어로그 모바일 폭 검증",
      "content": "이번 커밋에서 완료 목록 다이어로그 배경과 버튼 높이를 조정했으므로 모바일/좁은 화면에서 레이아웃 깨짐 여부를 확인한다.",
      "acceptanceCriteria": "- 390px 폭에서 버튼 줄바꿈이 자연스럽다.\\n- 다이어로그 배경은 블러 없이 살짝 어둡다.\\n- 닫기와 등록 버튼 높이가 동일하다.",
      "plan": "1. 모바일 viewport로 완료 목록 다이어로그를 연다.\\n2. 헤더 버튼과 테이블 영역의 줄바꿈을 확인한다.\\n3. 필요 시 spacing을 조정한다.",
      "folderStructure": "towercrane-for-uiux-front/src/features/task/ui/completed-tasks-dialog.tsx",
      "taskType": "QA",
      "status": "TODO",
      "priority": "MEDIUM",
      "dueDate": null
    }
  ]
}

필드 규칙:
- tasks[].title은 필수이며 120자 이내로 쓴다.
- content는 업무 배경과 구현 범위를 구체적으로 쓴다.
- acceptanceCriteria는 완료 기준을 줄바꿈 문자열로 쓴다.
- plan은 단계별 구현 계획을 번호 목록 문자열로 쓴다.
- folderStructure는 예상 수정 경로를 줄바꿈 문자열로 쓴다.
- taskType은 FEATURE, BUG, DOCS, DESIGN, REFACTOR, QA, CHORE 중 하나다.
- status는 TODO, IN_PROGRESS, REVIEW, DONE, HOLD 중 하나다.
- priority는 LOW, MEDIUM, HIGH, URGENT 중 하나다.
- assigneeEmail은 실제 등록된 사용자 이메일이 있을 때만 넣고, 없으면 필드 자체를 생략한다.
- completed가 true이면 DONE 상태로 등록된다.
- 요청 성공 후 createdCount와 생성된 taskId 목록을 알려준다.`
}

type TaskToolbarProps = {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  users: AssignableUser[]
  currentWorkspaceId?: string
  currentWorkspaceName?: string
  assigneeLabel?: string
  isFetching?: boolean
  onCreate: () => void
  onCreateFromFile?: (file: File) => void | Promise<void>
  onCreateFromMarkdown?: (markdown: string) => void | Promise<void>
  isCreateFromFilePending?: boolean
  onRefresh: () => void
  showAssigneeFilter?: boolean
}

function updateFilter<T extends keyof TaskFilters>(
  filters: TaskFilters,
  key: T,
  value: TaskFilters[T] | '',
) {
  return {
    ...filters,
    page: 1,
    [key]: value === '' ? undefined : value,
  }
}

export function TaskToolbar({
  filters,
  onFiltersChange,
  users,
  currentWorkspaceId,
  currentWorkspaceName,
  assigneeLabel,
  isFetching,
  onCreate,
  onCreateFromFile,
  onCreateFromMarkdown,
  isCreateFromFilePending,
  onRefresh,
  showAssigneeFilter = true,
}: TaskToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpTab, setHelpTab] = useState<TaskHelpTab>('markdown')
  const [markdownInput, setMarkdownInput] = useState('')
  const [markdownTouched, setMarkdownTouched] = useState(false)
  const [isMarkdownSubmitting, setIsMarkdownSubmitting] = useState(false)
  const [templateCopied, setTemplateCopied] = useState(false)
  const [aiCopiedKey, setAiCopiedKey] = useState<string | null>(null)
  const codexCurlExample = buildCodexCurlExample(currentWorkspaceId)
  const codexPromptExample = buildCodexCommitPromptExample(currentWorkspaceId, currentWorkspaceName)
  const markdownValidation = useMemo(
    () => validateTaskMarkdown(markdownInput, '붙여넣기 입력.md'),
    [markdownInput],
  )
  const markdownHasText = markdownInput.trim().length > 0
  const markdownCanSubmit =
    markdownHasText &&
    markdownValidation.errors.length === 0 &&
    Boolean(onCreateFromMarkdown) &&
    !isMarkdownSubmitting
  const controlClassName = 'h-9 min-h-9 rounded-md'
  const controlButtonClassName =
    'h-9 min-h-9 rounded-md px-4 py-0 text-sm font-bold leading-none'

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onCreateFromFile) return
    await onCreateFromFile(file)
  }

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(TASK_FILE_TEMPLATE)
      setTemplateCopied(true)
      toast.success('참고 형식을 복사했습니다.')
      window.setTimeout(() => setTemplateCopied(false), 1500)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const handleSubmitMarkdown = async () => {
    setMarkdownTouched(true)
    if (!onCreateFromMarkdown) return

    if (!markdownHasText) {
      toast.error('마크다운 내용을 입력하세요.')
      return
    }

    if (markdownValidation.errors.length > 0) {
      toast.error(markdownValidation.errors[0])
      return
    }

    setIsMarkdownSubmitting(true)
    try {
      await onCreateFromMarkdown(markdownInput)
      setMarkdownInput('')
      setMarkdownTouched(false)
      setHelpOpen(false)
    } catch {
      // 등록 실패 시 입력값을 유지합니다. 오류 메시지는 상위 등록 핸들러에서 표시합니다.
    } finally {
      setIsMarkdownSubmitting(false)
    }
  }

  const handleCopyAiText = async (key: string, label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setAiCopiedKey(key)
      toast.success(`${label}을(를) 복사했습니다.`)
      window.setTimeout(() => setAiCopiedKey(null), 1500)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const openHelp = (tab: TaskHelpTab) => {
    setHelpTab(tab)
    setHelpOpen(true)
  }

  return (
    <div className="rounded-md border border-surface-border bg-surface-muted p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="grid flex-1 gap-2.5 md:grid-cols-[minmax(280px,1fr)_repeat(4,minmax(120px,auto))]">
          <SearchField
            wrapperClassName={controlClassName}
            value={filters.q ?? ''}
            onChange={(event) =>
              onFiltersChange(updateFilter(filters, 'q', event.target.value))
            }
            placeholder="제목 또는 내용 검색"
            hint="검색"
          />

          <CompactSelect
            className={controlClassName}
            value={filters.taskType ?? ''}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(filters, 'taskType', event.target.value as TaskType | ''),
              )
            }
            aria-label="업무 유형 필터"
          >
            <option value="">전체 유형</option>
            {TASK_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {TASK_TYPE_LABELS[type]}
              </option>
            ))}
          </CompactSelect>

          <CompactSelect
            className={controlClassName}
            value={filters.priority ?? ''}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(filters, 'priority', event.target.value as TaskPriority | ''),
              )
            }
            aria-label="우선순위 필터"
          >
            <option value="">전체 우선순위</option>
            {TASK_PRIORITY_ORDER.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </CompactSelect>

          {showAssigneeFilter ? (
            <AssigneeSelect
              value={filters.assigneeId ?? ''}
              users={users}
              placeholder="전체 담당자"
              onChange={(assigneeId) =>
                onFiltersChange(updateFilter(filters, 'assigneeId', assigneeId))
              }
              className={controlClassName}
            />
          ) : (
            <div className="flex h-9 items-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-sm font-medium text-text-primary">
              {assigneeLabel ?? '내 업무'}
            </div>
          )}

          <CompactSelect
            className={controlClassName}
            value={filters.sort ?? 'order'}
            onChange={(event) =>
              onFiltersChange(updateFilter(filters, 'sort', event.target.value as TaskFilters['sort']))
            }
            aria-label="정렬"
          >
            <option value="order">수동 순서</option>
            <option value="recent">최근 수정</option>
            <option value="oldest">오래된 순</option>
            <option value="dueDate">마감일</option>
            <option value="priority">우선순위</option>
          </CompactSelect>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 min-h-9 w-9 rounded-md border-surface-border-soft bg-surface-raised text-text-primary shadow-none hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
            title="새로고침"
            aria-label="새로고침"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCcw className="size-4" />
          </Button>
          <Button type="button" className={controlButtonClassName} onClick={onCreate}>
            <Plus className="mr-2 size-4" />새 업무
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={controlButtonClassName}
            onClick={() => openHelp('markdown')}
          >
            <FileText className="mr-2 size-4" />
            MD 등록
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={controlButtonClassName}
            onClick={() => openHelp('codex')}
          >
            <Bot className="mr-2 size-4" />
            Agent 입력
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={controlButtonClassName}
            onClick={() => fileInputRef.current?.click()}
            disabled={!onCreateFromFile || isCreateFromFilePending}
          >
            {isCreateFromFilePending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 size-4" />
            )}
            파일로 등록
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 min-h-9 w-9 rounded-md border-surface-border-soft bg-surface-raised text-text-primary shadow-none hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
            title="업무 등록 도움말"
            aria-label="업무 등록 도움말"
            onClick={() => openHelp('markdown')}
          >
            <HelpCircle className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--text-primary)_35%,transparent)]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[86vh] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-6 py-5">
              <div>
                <Dialog.Title className="text-xl font-black text-text-primary">
                  업무 등록 방법
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-text-secondary">
                  마크다운을 직접 붙여넣거나 파일을 올려 업무와 구현 계획을 함께 만들 수 있습니다.
                </Dialog.Description>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={() =>
                    helpTab === 'codex'
                      ? handleCopyAiText('prompt', 'Agent 입력 프롬프트', codexPromptExample)
                      : handleCopyTemplate()
                  }
                >
                  {(helpTab === 'codex' && aiCopiedKey === 'prompt') ||
                  (helpTab !== 'codex' && templateCopied) ? (
                    <Check className="mr-1.5 size-3.5 text-brand-primary" />
                  ) : (
                    <Copy className="mr-1.5 size-3.5" />
                  )}
                  {helpTab === 'codex'
                    ? aiCopiedKey === 'prompt'
                      ? '복사됨'
                      : '프롬프트 복사'
                    : templateCopied
                      ? '복사됨'
                      : '형식 복사'}
                </Button>
                <Dialog.Close asChild>
                  <Button variant="secondary" size="icon" aria-label="닫기">
                    <X className="size-4" />
                  </Button>
                </Dialog.Close>
              </div>
            </div>

            <Tabs.Root
              value={helpTab}
              onValueChange={(value) => setHelpTab(value as TaskHelpTab)}
              className="max-h-[calc(86vh-96px)] overflow-y-auto px-6 py-5"
            >
              <Tabs.List className="grid grid-cols-3 rounded-md border border-surface-border-soft bg-surface-muted p-1">
                <Tabs.Trigger
                  value="markdown"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  MD 직접 입력
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="file"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  파일로 등록
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="codex"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  Agent 입력
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="markdown" className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-text-primary">마크다운 붙여넣기</h3>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => setMarkdownInput(TASK_FILE_TEMPLATE)}
                      >
                        예시 채우기
                      </Button>
                    </div>
                    <Textarea
                      value={markdownInput}
                      onChange={(event) => {
                        setMarkdownInput(event.target.value)
                        setMarkdownTouched(true)
                      }}
                      placeholder="업무 등록 Markdown을 붙여넣으세요."
                      className="min-h-[420px] resize-y font-mono text-xs leading-5"
                      spellCheck={false}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-text-muted">
                        {markdownHasText
                          ? `${markdownInput.length.toLocaleString()}자 입력됨`
                          : '등록 전에 필수 섹션과 frontmatter 값을 검사합니다.'}
                      </div>
                      <Button
                        type="button"
                        className="h-9"
                        onClick={handleSubmitMarkdown}
                        disabled={!markdownCanSubmit || isCreateFromFilePending}
                      >
                        {isMarkdownSubmitting || isCreateFromFilePending ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 size-4" />
                        )}
                        검증 후 등록
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div
                      className={`rounded-md border p-4 ${
                        markdownHasText && markdownValidation.errors.length === 0
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border-soft bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {markdownHasText && markdownValidation.errors.length === 0 ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                        ) : (
                          <AlertCircle className="mt-0.5 size-4 shrink-0 text-text-muted" />
                        )}
                        <div>
                          <h3 className="text-sm font-black text-text-primary">
                            {markdownHasText && markdownValidation.errors.length === 0
                              ? '등록 가능'
                              : '형식 검사'}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-text-secondary">
                            필수 섹션은 제목, 내용, 완료 기준, 단계별 계획입니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    {markdownTouched && markdownValidation.errors.length > 0 ? (
                      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="text-sm font-black text-text-primary">수정 필요</h3>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-text-secondary">
                          {markdownValidation.errors.map((issue) => (
                            <li key={issue}>- {issue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {markdownHasText && markdownValidation.warnings.length > 0 ? (
                      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="text-sm font-black text-text-primary">확인 권장</h3>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-text-secondary">
                          {markdownValidation.warnings.map((issue) => (
                            <li key={issue}>- {issue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {markdownValidation.parsed ? (
                      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                        <h3 className="text-sm font-black text-text-primary">파싱 결과</h3>
                        <dl className="mt-2 space-y-1 text-xs leading-5">
                          <div>
                            <dt className="inline font-bold text-text-primary">제목</dt>
                            <dd className="inline text-text-secondary">
                              {' '}
                              {markdownValidation.parsed.payload.title}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-bold text-text-primary">유형/상태/우선순위</dt>
                            <dd className="inline text-text-secondary">
                              {' '}
                              {markdownValidation.parsed.payload.taskType} /{' '}
                              {markdownValidation.parsed.payload.status} /{' '}
                              {markdownValidation.parsed.payload.priority}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-bold text-text-primary">체크리스트</dt>
                            <dd className="inline text-text-secondary">
                              {' '}
                              {markdownValidation.parsed.checklistItems.length}개
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="file" className="mt-5 space-y-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">지원 파일</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    `.md`, `.markdown`, `.txt` 파일을 올릴 수 있습니다. 제목은 frontmatter의
                    `title`, 첫 번째 `# 제목`, 파일명 순서로 결정됩니다. `내용`은 기본 탭,
                    `단계별 계획`, `예상 파일 구조`, `MMD`는 계획 탭, `완료 기준`과
                    `체크리스트`는 테스트 탭에 등록됩니다.
                  </p>
                </div>
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">AI 참고 URL</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    파일 등록 후 업무 상세 헤더의 `AI 참고 URL` 버튼을 누르면 로그인 없이
                    GET으로 조회할 수 있는 JSON 주소가 복사됩니다. GPT나 Codex가 해당 URL을
                    열어 업무 내용, 완료 기준, 계획, 파일 구조, MMD, 체크리스트를 한 번에
                    참고할 수 있습니다.
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="ui-icon-button absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold"
                    title="참고 형식 복사"
                    aria-label="참고 형식 복사"
                  >
                    {templateCopied ? (
                      <Check className="h-3.5 w-3.5 text-brand-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{templateCopied ? '복사됨' : '복사'}</span>
                  </button>
                  <pre className="max-h-[320px] overflow-auto rounded-md border border-surface-border-soft bg-surface-strong p-4 pt-12 text-xs leading-6 text-text-primary">
{TASK_FILE_TEMPLATE}
                  </pre>
                </div>
              </Tabs.Content>

              <Tabs.Content value="codex" className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <h3 className="text-sm font-black text-text-primary">Agent 할일 입력 API</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      커밋 후 남은 할일이나 후속 검증 항목을 현재 워크스페이스에 여러 건 등록하는
                      전용 POST API입니다. Agent에게 아래 프롬프트를 그대로 전달하면 됩니다.
                    </p>
                    {currentWorkspaceId ? (
                      <div className="mt-3 rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs leading-5 text-text-primary">
                        <p className="font-bold">현재 워크스페이스</p>
                        <p className="mt-1">{currentWorkspaceName ?? '이 워크스페이스'}</p>
                        <p className="font-mono">{currentWorkspaceId}</p>
                      </div>
                    ) : null}
                    <p className="mt-3 break-all rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 font-mono text-xs text-text-primary">
                      POST {getCodexCommitTasksEndpoint(currentWorkspaceId)}
                    </p>
                  </div>

                  <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <h3 className="text-sm font-black text-text-primary">필수 헤더</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      이 API는 브라우저 로그인 토큰 대신 Agent 전용 키를 사용합니다.
                      서버 환경 변수 <code className="rounded bg-surface-raised px-1">TOWERCRANE_AGENT_KEY</code>와
                      같은 값을 요청 헤더에 넣게 지시하세요.
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-xs leading-6 text-text-secondary">
                      <li>x-towercrane-agent-key: &lt;TOWERCRANE_AGENT_KEY&gt;</li>
                      <li>Content-Type: application/json</li>
                    </ul>
                  </div>

                  <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <h3 className="text-sm font-black text-text-primary">본문 필드</h3>
                    <dl className="mt-2 space-y-1.5 text-xs leading-5">
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">title</dt>
                        <dd className="inline text-text-secondary"> — 업무 제목. 필수.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">content</dt>
                        <dd className="inline text-text-secondary"> — 업무 배경과 구현 범위.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">acceptanceCriteria</dt>
                        <dd className="inline text-text-secondary"> — 완료 기준 문자열.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">plan</dt>
                        <dd className="inline text-text-secondary"> — 단계별 구현 계획 문자열.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">folderStructure</dt>
                        <dd className="inline text-text-secondary"> — 예상 수정 경로.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">mmdContent</dt>
                        <dd className="inline text-text-secondary"> — Mermaid 흐름도.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">commitHash</dt>
                        <dd className="inline text-text-secondary"> — 선택. 현재 커밋 SHA.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">tasks</dt>
                        <dd className="inline text-text-secondary"> — 등록할 할일 배열. 1~50개.</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCopyAiText('curl', 'cURL 예시', codexCurlExample)}
                      className="ui-icon-button absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold"
                      title="cURL 예시 복사"
                      aria-label="cURL 예시 복사"
                    >
                      {aiCopiedKey === 'curl' ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{aiCopiedKey === 'curl' ? '복사됨' : '복사'}</span>
                    </button>
                    <h3 className="mb-2 text-sm font-black text-text-primary">Agent 호출 예시</h3>
                    <pre className="overflow-auto rounded-md border border-surface-border-soft bg-surface-strong p-4 pt-12 text-xs leading-5 text-text-primary">
{codexCurlExample}
                    </pre>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCopyAiText('prompt', 'Agent 입력 프롬프트', codexPromptExample)}
                      className="ui-icon-button absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold"
                      title="Agent 입력 프롬프트 복사"
                      aria-label="Agent 입력 프롬프트 복사"
                    >
                      {aiCopiedKey === 'prompt' ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{aiCopiedKey === 'prompt' ? '복사됨' : '복사'}</span>
                    </button>
                    <h3 className="mb-2 text-sm font-black text-text-primary">Agent에게 입력할 프롬프트</h3>
                    <pre className="max-h-[520px] overflow-auto rounded-md border border-surface-border-soft bg-surface-strong p-4 pt-12 text-xs leading-5 text-text-primary">
{codexPromptExample}
                    </pre>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
