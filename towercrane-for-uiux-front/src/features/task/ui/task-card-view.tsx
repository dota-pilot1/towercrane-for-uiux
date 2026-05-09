import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '../../../entities/task/model/constants'
import type { Task, TaskStatus } from '../../../entities/task/model/types'
import { Button } from '../../../shared/ui/button'
import { useUpdateTaskStatus } from '../model/use-task-queries'
import { TaskCard } from './task-card'

function DraggableCard({
  task,
  onOpenTask,
}: {
  task: Task
  onOpenTask: (taskId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={clsx(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onOpen={onOpenTask} />
    </div>
  )
}

function DropGroup({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        'min-h-[420px] rounded-md border border-surface-border-soft bg-surface-muted p-4 transition-colors',
        isOver && 'border-brand-border bg-brand-glass',
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-black text-text-primary">{title}</h3>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function TaskCardView({
  tasks,
  onOpenTask,
}: {
  tasks: Task[]
  onOpenTask: (taskId: string) => void
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    TODO: false,
    IN_PROGRESS: false,
    REVIEW: false,
    DONE: false,
    HOLD: false,
  })
  const updateStatus = useUpdateTaskStatus()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'DONE'),
    [tasks],
  )
  const doneTasks = useMemo(
    () => tasks.filter((task) => task.status === 'DONE'),
    [tasks],
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
    const target = event.over?.id
    setActiveTask(null)

    if (!task || !target) return
    if (target === 'done-group' && task.status !== 'DONE') {
      updateStatus.mutate({ id: task.id, status: 'DONE' })
      return
    }
    if (target === 'open-group' && task.status === 'DONE') {
      updateStatus.mutate({ id: task.id, status: 'TODO' })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const task = event.active.data.current?.task as Task | undefined
        setActiveTask(task ?? null)
      }}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DropGroup
          id="open-group"
          title={`미완료 업무 ${openTasks.length}`}
          description="진행 중인 업무를 상태별로 확인합니다."
        >
          <div className="space-y-3">
            {TASK_STATUS_ORDER.filter((status) => status !== 'DONE').map((status) => (
              <div key={status} className="rounded-md border border-surface-border-soft bg-surface-raised">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }))
                  }
                >
                  <span className="text-sm font-bold text-text-primary">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {tasksByStatus[status].length}
                    {collapsed[status] ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </span>
                </button>
                {!collapsed[status] ? (
                  <div className="space-y-2 border-t border-surface-border-soft p-2">
                    {tasksByStatus[status].length === 0 ? (
                      <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-6 text-center text-xs text-text-muted">
                        업무 없음
                      </div>
                    ) : (
                      tasksByStatus[status].map((task) => (
                        <DraggableCard
                          key={task.id}
                          task={task}
                          onOpenTask={onOpenTask}
                        />
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </DropGroup>

        <DropGroup
          id="done-group"
          title={`완료 업무 ${doneTasks.length}`}
          description="완료 영역으로 드래그하면 DONE 상태로 저장됩니다."
        >
          <div className="space-y-2">
            {doneTasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-12 text-center text-sm text-text-muted">
                완료된 업무가 없습니다.
              </div>
            ) : (
              doneTasks.map((task) => (
                <div key={task.id} className="space-y-2">
                  <DraggableCard task={task} onOpenTask={onOpenTask} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: task.id, status: 'TODO' })}
                  >
                    대기로 되돌리기
                  </Button>
                </div>
              ))
            )}
          </div>
        </DropGroup>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-[300px]">
            <TaskCard task={activeTask} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
