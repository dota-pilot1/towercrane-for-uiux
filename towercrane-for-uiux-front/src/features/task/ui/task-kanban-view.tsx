import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { clsx } from 'clsx'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
import type { Task, TaskStatus } from '../../../entities/task/model/types'
import { useUpdateTaskStatus } from '../model/use-task-queries'
import { TaskCard } from './task-card'

function DraggableTaskCard({
  task,
  onOpenTask,
}: {
  task: Task
  onOpenTask: (taskId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      className={clsx(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onOpen={onOpenTask} />
    </div>
  )
}

function KanbanColumn({
  status,
  tasks,
  onOpenTask,
}: {
  status: TaskStatus
  tasks: Task[]
  onOpenTask: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        'flex min-h-[440px] min-w-[260px] flex-col rounded-md border border-surface-border-soft bg-surface-muted p-3 transition-colors',
        isOver && 'border-brand-border bg-brand-glass',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black text-text-primary">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-xs font-bold text-text-secondary">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-surface-border-soft text-xs text-text-muted">
            업무 없음
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onOpenTask={onOpenTask}
            />
          ))
        )}
      </div>
    </section>
  )
}

export function TaskKanbanView({
  tasks,
  onOpenTask,
}: {
  tasks: Task[]
  onOpenTask: (taskId: string) => void
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOverlayWidth, setActiveOverlayWidth] = useState<number | null>(null)
  const updateStatus = useUpdateTaskStatus()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const tasksByStatus = useMemo(
    () =>
      TASK_STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
        (acc, status) => {
          acc[status] = tasks.filter((task) => task.status === status)
          return acc
        },
        {
          TODO: [],
          IN_PROGRESS: [],
          REVIEW: [],
          DONE: [],
          HOLD: [],
        },
      ),
    [tasks],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const task = event.active.data.current?.task as Task | undefined
    const targetStatus = event.over?.id as TaskStatus | undefined
    setActiveTask(null)
    setActiveOverlayWidth(null)

    if (!task || !targetStatus || task.status === targetStatus) return
    updateStatus.mutate({ id: task.id, status: targetStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const task = event.active.data.current?.task as Task | undefined
        setActiveTask(task ?? null)
        setActiveOverlayWidth(event.active.rect.current.initial?.width ?? null)
      }}
      onDragCancel={() => {
        setActiveTask(null)
        setActiveOverlayWidth(null)
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-5">
        {TASK_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div style={activeOverlayWidth ? { width: activeOverlayWidth } : undefined}>
            <TaskCard task={activeTask} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
