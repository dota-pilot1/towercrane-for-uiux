import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { type ChangeEvent, useRef, useState } from 'react'
import { Check, Copy, FileUp, HelpCircle, Loader2, Plus, RefreshCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
} from '../../../entities/task/model/constants'
import type { TaskFilters, TaskPriority, TaskType } from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { SearchField } from '../../../shared/ui/search-field'

export type TaskViewMode = 'table' | 'kanban' | 'card'

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
  const [templateCopied, setTemplateCopied] = useState(false)
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
            <CompactSelect
              className={controlClassName}
              value={filters.assigneeId ?? ''}
              onChange={(event) =>
                onFiltersChange(updateFilter(filters, 'assigneeId', event.target.value))
              }
              aria-label="담당자 필터"
            >
              <option value="">전체 담당자</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </CompactSelect>
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
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.45)]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-6 py-5">
              <div>
                <Dialog.Title className="text-xl font-black text-text-primary">
                  업무 등록 방법
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-text-secondary">
                  직접 입력하거나 정해진 마크다운 파일을 올려 업무를 만들 수 있습니다.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="secondary" size="icon" aria-label="닫기">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <Tabs.Root defaultValue="form" className="px-6 py-5">
              <Tabs.List className="grid grid-cols-2 rounded-md border border-surface-border-soft bg-surface-muted p-1">
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
              </Tabs.List>

              <Tabs.Content value="form" className="mt-5 space-y-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">새 업무</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    제목, 내용, 유형, 상태, 우선순위, 담당자, 마감일을 화면에서 입력합니다.
                    빠르게 한두 개 업무를 만들거나 사람이 직접 내용을 다듬어야 할 때 적합합니다.
                  </p>
                </div>
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">권장 사용</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    업무 설명만 간단히 잡고, 세부 계획과 리뷰는 업무 상세의 계획/리뷰 탭에서
                    파일로 추가하거나 별도 화면에서 연결합니다.
                  </p>
                </div>
              </Tabs.Content>

              <Tabs.Content value="file" className="mt-5 space-y-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <h3 className="text-sm font-black text-text-primary">지원 파일</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    `.md`, `.markdown`, `.txt` 파일을 올릴 수 있습니다. 제목은 frontmatter의
                    `title`, 첫 번째 `# 제목`, 파일명 순서로 결정됩니다. 완료 기준과
                    체크리스트는 테스트 탭에 함께 등록됩니다.
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
            </Tabs.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
