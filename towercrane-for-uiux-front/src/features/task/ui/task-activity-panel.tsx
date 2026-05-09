import { Activity } from 'lucide-react'
import { TASK_ACTIVITY_LABELS } from '../../../entities/task/model/constants'
import { useTaskActivity } from '../model/use-task-queries'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TaskActivityPanel({ taskId }: { taskId: string | null }) {
  const activityQuery = useTaskActivity(taskId)
  const activities = activityQuery.data ?? []

  return (
    <div className="space-y-3">
      {activityQuery.isLoading ? (
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm text-text-muted">
          활동 로그를 불러오는 중입니다.
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
          활동 로그가 없습니다.
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 rounded-md border border-surface-border-soft bg-surface-raised p-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <Activity className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                  {TASK_ACTIVITY_LABELS[activity.activityType]}
                </span>
                <span className="text-xs text-text-muted">
                  {formatDateTime(activity.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-primary">
                {activity.message ?? '업무 이력이 기록되었습니다.'}
              </p>
              {activity.fromValue || activity.toValue ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {activity.fromValue ?? '-'} → {activity.toValue ?? '-'}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-text-muted">
                {activity.actorName ?? '시스템'}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
