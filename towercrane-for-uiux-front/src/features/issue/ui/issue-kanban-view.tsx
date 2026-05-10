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
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from '../../../entities/issue/model/constants'
import type { Issue, IssueStatus } from '../../../entities/issue/model/types'
import { useUpdateIssueStatus } from '../model/use-issue-queries'
import { IssueCard } from './issue-card'

function DraggableIssueCard({
  issue,
  onOpen,
}: {
  issue: Issue
  onOpen: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    data: { issue },
  })

  return (
    <div
      ref={setNodeRef}
      className={clsx('touch-none', isDragging && 'opacity-30')}
      {...attributes}
      {...listeners}
    >
      <IssueCard issue={issue} onOpen={onOpen} />
    </div>
  )
}

function KanbanColumn({
  status,
  issues,
  onOpen,
}: {
  status: IssueStatus
  issues: Issue[]
  onOpen: (id: string) => void
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
          {ISSUE_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-0.5 text-xs font-bold text-text-secondary">
          {issues.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {issues.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-surface-border-soft text-xs text-text-muted">
            이슈 없음
          </div>
        ) : (
          issues.map((issue) => (
            <DraggableIssueCard key={issue.id} issue={issue} onOpen={onOpen} />
          ))
        )}
      </div>
    </section>
  )
}

export function IssueKanbanView({
  issues,
  onOpen,
}: {
  issues: Issue[]
  onOpen: (id: string) => void
}) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const updateStatus = useUpdateIssueStatus()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const issuesByStatus = useMemo(
    () =>
      ISSUE_STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
        (acc, status) => {
          acc[status] = issues.filter((i) => i.status === status)
          return acc
        },
        { OPEN: [], IN_PROGRESS: [], TESTING: [], CLOSED: [] },
      ),
    [issues],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const issue = event.active.data.current?.issue as Issue | undefined
    const targetStatus = event.over?.id as IssueStatus | undefined
    setActiveIssue(null)
    if (!issue || !targetStatus || issue.status === targetStatus) return
    updateStatus.mutate({ id: issue.id, status: targetStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const issue = event.active.data.current?.issue as Issue | undefined
        setActiveIssue(issue ?? null)
      }}
      onDragCancel={() => setActiveIssue(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-4">
        {ISSUE_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={issuesByStatus[status]}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <div className="w-[260px] rotate-1 scale-105 shadow-2xl opacity-95">
            <IssueCard issue={activeIssue} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
