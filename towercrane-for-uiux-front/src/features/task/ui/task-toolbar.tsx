import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { type ChangeEvent, useRef, useState } from 'react'
import { Bot, Check, Copy, FileUp, HelpCircle, Loader2, Plus, RefreshCcw, X } from 'lucide-react'
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
import { AssigneeSelect } from './assignee-select'

export type TaskViewMode = 'table' | 'kanban' | 'card'
type TaskHelpTab = 'form' | 'file' | 'ai'

const TASK_INGEST_ENDPOINT = `${API_BASE_URL}/public/task-ingest`

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

const TASK_AI_JSON_EXAMPLE = `{
  "title": "프로토타입 워크스페이스 삭제 기능 구현",
  "content": "관리자가 프로토타입 워크스페이스를 안전하게 삭제할 수 있도록 삭제 API, 확인 다이어로그, 목록 갱신 흐름을 구현한다.",
  "acceptanceCriteria": "- 삭제 버튼은 권한이 있는 사용자에게만 보인다.\\n- 삭제 전 워크스페이스명을 확인한다.\\n- 삭제 성공 후 워크스페이스 목록과 선택 상태가 갱신된다.\\n- 실패 시 사용자가 이해할 수 있는 오류 메시지를 보여준다.",
  "plan": "1. 현재 워크스페이스 목록/상세/삭제 관련 서버 구조를 확인한다.\\n2. 서버에 삭제 가능 조건과 삭제 API를 연결한다.\\n3. 프론트에 확인 다이어로그와 삭제 액션을 추가한다.\\n4. 삭제 후 캐시 무효화와 라우팅 복귀를 검증한다.\\n5. 실패 케이스와 권한 케이스를 테스트한다.",
  "folderStructure": "towercrane-for-uiux-server/src/tasks/\\ntowercrane-for-uiux-front/src/pages/task-workspace/\\ntowercrane-for-uiux-front/src/features/task/",
  "mmdContent": "flowchart TD\\n  A[삭제 버튼 클릭] --> B[확인 다이어로그]\\n  B --> C[DELETE API 호출]\\n  C --> D[목록 캐시 갱신]\\n  D --> E[워크스페이스 목록 이동]",
  "checklists": [
    "삭제 권한 조건 확인",
    "삭제 확인 다이어로그 구현",
    "DELETE API 연동",
    "삭제 후 목록 갱신 검증",
    "실패 메시지 검증"
  ],
  "taskType": "FEATURE",
  "status": "TODO",
  "priority": "MEDIUM",
  "dueDate": "2026-06-01",
  "assigneeEmail": "owner@example.com",
  "workspaceId": "task-workspace-default"
}`

const TASK_AI_CURL_EXAMPLE = `curl -X POST "${TASK_INGEST_ENDPOINT}" \\
  -H "x-towercrane-ingest-key: <TASK_INGEST_KEY>" \\
  -H "Content-Type: application/json" \\
  -d @task.json`

const TASK_AI_PROMPT_EXAMPLE = `아래 요구사항을 Towercrane 업무 등록 API payload JSON으로 만들어줘.

규칙:
- POST ${TASK_INGEST_ENDPOINT} 로 전송할 body만 JSON으로 출력한다.
- 필드는 title, content, acceptanceCriteria, plan, folderStructure, mmdContent, checklists, taskType, status, priority, dueDate, assigneeEmail, workspaceId를 사용한다.
- title은 120자 이내로 쓴다.
- content는 업무 배경과 범위를 구체적으로 쓴다.
- acceptanceCriteria는 완료 기준을 줄바꿈 문자열로 쓴다.
- plan은 단계별 구현 계획을 번호 목록 문자열로 쓴다.
- folderStructure는 예상 수정 경로를 줄바꿈 문자열로 쓴다.
- checklists는 검증 가능한 작업 단위 배열로 쓴다.
- taskType은 FEATURE, BUG, DOCS, DESIGN, REFACTOR, QA, CHORE 중 하나다.
- status는 TODO, IN_PROGRESS, REVIEW, DONE, HOLD 중 하나다.
- priority는 LOW, MEDIUM, HIGH, URGENT 중 하나다.
- 최종 답변은 설명 없이 JSON만 출력한다.

요구사항:
[여기에 업무 요구사항 입력]`

type TaskToolbarProps = {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  users: AssignableUser[]
  assigneeLabel?: string
  isFetching?: boolean
  onCreate: () => void
  onCreateFromFile?: (file: File) => void | Promise<void>
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
  assigneeLabel,
  isFetching,
  onCreate,
  onCreateFromFile,
  isCreateFromFilePending,
  onRefresh,
  showAssigneeFilter = true,
}: TaskToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpTab, setHelpTab] = useState<TaskHelpTab>('form')
  const [templateCopied, setTemplateCopied] = useState(false)
  const [aiCopiedKey, setAiCopiedKey] = useState<string | null>(null)
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
            onClick={() => openHelp('ai')}
          >
            <Bot className="mr-2 size-4" />
            AI 등록
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
            onClick={() => openHelp('form')}
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
                  직접 입력하거나 정해진 마크다운 파일을 올려 업무와 구현 계획을 함께 만들 수 있습니다.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="secondary" size="icon" aria-label="닫기">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <Tabs.Root
              value={helpTab}
              onValueChange={(value) => setHelpTab(value as TaskHelpTab)}
              className="max-h-[calc(86vh-96px)] overflow-y-auto px-6 py-5"
            >
              <Tabs.List className="grid grid-cols-3 rounded-md border border-surface-border-soft bg-surface-muted p-1">
                <Tabs.Trigger
                  value="form"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  직접 등록
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="file"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  파일로 등록
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="ai"
                  className="rounded-sm px-3 py-2 text-sm font-bold text-text-secondary data-[state=active]:bg-brand-primary data-[state=active]:text-text-on-brand"
                >
                  AI 등록
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="form" className="mt-5 space-y-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">새 업무</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    제목, 내용, 유형, 상태, 우선순위, 담당자, 마감일을 화면에서 입력합니다.
                    빠르게 업무를 만들거나 등록 후 계획/테스트/리뷰 탭에서 내용을 직접 다듬을 때 적합합니다.
                  </p>
                </div>
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">권장 사용</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    세부 구현 계획이 아직 없을 때 사용합니다. 이후 업무 상세에서 완료 기준,
                    단계별 계획, 체크리스트, 리뷰를 순서대로 채워 넣습니다.
                  </p>
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

              <Tabs.Content value="ai" className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <h3 className="text-sm font-black text-text-primary">Agent 직접 등록 API</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      로그인 세션 없이 ingest key로 업무 1개를 등록합니다. 업무 하나가 구현
                      범위와 단계별 계획을 크게 가질 수 있으므로 여러 건 배치 등록은 쓰지 않습니다.
                    </p>
                    <p className="mt-3 break-all rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 font-mono text-xs text-text-primary">
                      POST {TASK_INGEST_ENDPOINT}
                    </p>
                  </div>

                  <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                    <h3 className="text-sm font-black text-text-primary">필수 헤더</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      실제 키는 로컬/운영 서버의 <code className="rounded bg-surface-raised px-1">.env</code>
                      에 있는 <code className="rounded bg-surface-raised px-1">TASK_INGEST_KEY</code> 값을
                      사용합니다. 프론트 화면에는 키를 직접 노출하지 않습니다.
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-xs leading-6 text-text-secondary">
                      <li>x-towercrane-ingest-key: &lt;TASK_INGEST_KEY&gt;</li>
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
                        <dt className="inline font-mono font-semibold text-text-primary">checklists</dt>
                        <dd className="inline text-text-secondary"> — 체크리스트 문자열 배열.</dd>
                      </div>
                      <div>
                        <dt className="inline font-mono font-semibold text-text-primary">workspaceId</dt>
                        <dd className="inline text-text-secondary"> — 특정 워크스페이스에 넣을 때 사용.</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCopyAiText('json', 'JSON 예시', TASK_AI_JSON_EXAMPLE)}
                      className="ui-icon-button absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold"
                      title="JSON 예시 복사"
                      aria-label="JSON 예시 복사"
                    >
                      {aiCopiedKey === 'json' ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{aiCopiedKey === 'json' ? '복사됨' : '복사'}</span>
                    </button>
                    <h3 className="mb-2 text-sm font-black text-text-primary">JSON body 예시</h3>
                    <pre className="max-h-[360px] overflow-auto rounded-md border border-surface-border-soft bg-surface-strong p-4 pt-12 text-xs leading-5 text-text-primary">
{TASK_AI_JSON_EXAMPLE}
                    </pre>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCopyAiText('curl', 'cURL 예시', TASK_AI_CURL_EXAMPLE)}
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
{TASK_AI_CURL_EXAMPLE}
                    </pre>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCopyAiText('prompt', 'AI 생성 프롬프트', TASK_AI_PROMPT_EXAMPLE)}
                      className="ui-icon-button absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold"
                      title="AI 생성 프롬프트 복사"
                      aria-label="AI 생성 프롬프트 복사"
                    >
                      {aiCopiedKey === 'prompt' ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{aiCopiedKey === 'prompt' ? '복사됨' : '복사'}</span>
                    </button>
                    <h3 className="mb-2 text-sm font-black text-text-primary">AI 생성 프롬프트</h3>
                    <pre className="max-h-[260px] overflow-auto rounded-md border border-surface-border-soft bg-surface-strong p-4 pt-12 text-xs leading-5 text-text-primary">
{TASK_AI_PROMPT_EXAMPLE}
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
