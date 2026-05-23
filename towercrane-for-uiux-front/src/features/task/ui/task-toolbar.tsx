import { Plus, RefreshCcw } from 'lucide-react'
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

type TaskToolbarProps = {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  users: AssignableUser[]
  assigneeLabel?: string
  isFetching?: boolean
  onCreate: () => void
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
  onRefresh,
  showAssigneeFilter = true,
}: TaskToolbarProps) {
  const controlClassName = 'h-9 min-h-9 rounded-md'
  const controlButtonClassName =
    'h-9 min-h-9 rounded-md px-4 py-0 text-sm font-bold leading-none'

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
        </div>
      </div>

    </div>
  )
}
