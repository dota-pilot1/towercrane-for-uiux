import { Plus, RefreshCcw } from 'lucide-react'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
} from '../../../entities/task/model/constants'
import type { Task, TaskFilters, TaskPriority, TaskStatus, TaskType } from '../../../entities/task/model/types'
import type { AssignableUser } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { SearchField } from '../../../shared/ui/search-field'
import { Switch } from '../../../shared/ui/switch'
import { ToggleGroup } from '../../../shared/ui/toggle-group'

export type TaskViewMode = 'table' | 'kanban' | 'card'

type TaskToolbarProps = {
  viewMode: TaskViewMode
  onViewModeChange: (mode: TaskViewMode) => void
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  tasks: Task[]
  users: AssignableUser[]
  total: number
  isFetching?: boolean
  onCreate: () => void
  onRefresh: () => void
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
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  tasks,
  users,
  total,
  isFetching,
  onCreate,
  onRefresh,
}: TaskToolbarProps) {
  const statusCounts = TASK_STATUS_ORDER.reduce<Record<TaskStatus, number>>(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status).length
      return acc
    },
    {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
      HOLD: 0,
    },
  )

  return (
    <div className="ui-panel-soft space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup<TaskViewMode>
            value={viewMode}
            onChange={onViewModeChange}
            className="w-full min-w-[260px] sm:w-auto"
            options={[
              { value: 'table', label: '테이블' },
              { value: 'kanban', label: '칸반' },
              { value: 'card', label: '카드' },
            ]}
          />
          <div className="inline-flex h-9 items-center rounded-md border border-surface-border-soft bg-surface-raised px-3 text-xs font-bold text-text-secondary">
            Total {total}
          </div>
          {TASK_STATUS_ORDER.map((status) => (
            <div
              key={status}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 text-xs text-text-secondary"
            >
              <span>{TASK_STATUS_LABELS[status]}</span>
              <span className="font-black text-text-primary">{statusCounts[status]}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="새로고침"
            aria-label="새로고침"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCcw className="size-4" />
          </Button>
          <Button type="button" onClick={onCreate}>
            <Plus className="mr-2 size-4" />새 업무
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,auto))]">
        <SearchField
          value={filters.q ?? ''}
          onChange={(event) =>
            onFiltersChange(updateFilter(filters, 'q', event.target.value))
          }
          placeholder="제목 또는 내용 검색"
          hint="Search"
        />

        <CompactSelect
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
          value={filters.status ?? ''}
          onChange={(event) =>
            onFiltersChange(
              updateFilter(filters, 'status', event.target.value as TaskStatus | ''),
            )
          }
          aria-label="상태 필터"
        >
          <option value="">전체 상태</option>
          {TASK_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </CompactSelect>

        <CompactSelect
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

        <CompactSelect
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

        <CompactSelect
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

      <div className="flex items-center justify-between gap-3 border-t border-surface-border-soft pt-3">
        <Switch
          checked={Boolean(filters.archived)}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, archived: checked, page: 1 })
          }
          label={filters.archived ? '보관함 보기' : '진행 업무 보기'}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({
              page: 1,
              pageSize: filters.pageSize ?? 50,
              archived: false,
              sort: 'order',
            })
          }
        >
          필터 초기화
        </Button>
      </div>
    </div>
  )
}
