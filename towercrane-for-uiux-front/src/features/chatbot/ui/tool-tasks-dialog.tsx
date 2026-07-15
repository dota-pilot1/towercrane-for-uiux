import { ClipboardList, Clock, X } from 'lucide-react'
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTypeBadge,
} from '../../../entities/task/ui/task-badges'
import { useToolDialogStore } from '../model/tool-dialog-store'

// get_my_tasks 툴 호출 결과 — 담당 업무 목록
// 라벨·색상은 entities/task의 정식 뱃지를 쓴다 (업무 관리 화면과 같은 표기)
export function ToolTasksDialog() {
  const { tasksOpen, tasks, closeTasksDialog } = useToolDialogStore()

  if (!tasksOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="ui-panel rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-brand-glass border-b border-brand-border px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-glass border border-brand-border shrink-0">
            <ClipboardList className="size-5 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-brand-primary">내 담당 업무</p>
            <p className="text-xs ui-text-muted">{tasks.length}개 업무</p>
          </div>
          <button onClick={closeTasksDialog} className="ui-icon-button p-1.5 rounded-lg">
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <ClipboardList className="size-8 ui-text-muted" />
              <p className="text-sm font-semibold ui-text-secondary">담당 업무가 없습니다.</p>
            </div>
          ) : tasks.map((task) => (
            <div key={task.id} className="ui-panel-soft rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <p className="text-sm font-semibold ui-text-primary flex-1 leading-snug">{task.title}</p>
                <TaskStatusBadge status={task.status} className="shrink-0" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TaskTypeBadge taskType={task.taskType} />
                <TaskPriorityBadge priority={task.priority} />
                {task.dueDate && (
                  <span className="inline-flex items-center gap-1 text-[10px] ui-text-muted ml-auto">
                    <Clock className="size-3" />
                    {task.dueDate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-surface-border px-6 py-3">
          <button
            onClick={closeTasksDialog}
            className="w-full rounded-lg border border-brand-border bg-brand-glass py-2 text-sm font-bold text-brand-primary hover:bg-brand-glass/80 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
