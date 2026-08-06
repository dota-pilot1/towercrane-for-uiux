import { type ReactNode, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BookOpen, Check, CheckSquare, ChevronDown, ClipboardCheck, Copy, GripVertical, Loader2, MessageCircle, Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { Select } from '../../../shared/ui/select'
import { useSessionStore } from '../../../shared/store/session-store'
import type {
  DevChallengeAssignment,
  DevChallengeAssignmentBlock,
  DevChallengeAssignmentDetail,
  DevChallengeChecklistItem,
  DevChallengeSubmissionStatus,
  DevChallengeSubmissionWithAuthor,
} from '../../../entities/dev-challenge/model/types'
import {
  buildChecklistItems,
  useCreateDevChallengeAssignment,
  useCreateDevChallengeAssignmentBlock,
  useCreateDevChallengeSubmission,
  useCreateDevChallengeSubmissionComment,
  useDeleteDevChallengeAssignment,
  useDeleteDevChallengeSubmission,
  useDeleteDevChallengeSubmissionComment,
  useDevChallengeAssignment,
  useDevChallengeAssignments,
  useDevChallengeSubmissions,
  useDevChallengeSubmissionComments,
  useMyDevChallengeSubmission,
  useReorderDevChallengeAssignments,
  useUpdateDevChallengeAssignment,
  useUpdateDevChallengeAssignmentBlock,
  useUpdateDevChallengeSubmission,
  useUpdateDevChallengeSubmissionComment,
} from '../lib/hooks'

type DevChallengeMainPanelProps = {
  sectionId: string | null
  selectedAssignmentId: string | null
  onSelectAssignment: (id: string | null) => void
}

type AssignmentItemProps = {
  assignment: DevChallengeAssignment
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

function AssignmentItem({ assignment, selected, onSelect, onEdit, onDelete }: AssignmentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: assignment.id })
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border p-3 transition-colors ${
        selected
          ? 'border-brand-border bg-brand-glass'
          : 'border-surface-border-soft bg-surface-raised hover:bg-surface-muted'
      }`}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 hover:bg-surface-border active:cursor-grabbing" tabIndex={-1}>
          <GripVertical className="size-3.5 ui-text-muted" />
        </button>
        <button onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold ui-text-primary">{assignment.title}</p>
          </div>
          {assignment.summary ? (
            <p className="mt-1 line-clamp-2 text-xs ui-text-secondary">{assignment.summary}</p>
          ) : (
            <p className="mt-1 text-xs ui-text-muted">요약 없음</p>
          )}
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider ui-text-muted">
            {assignment.difficulty}
          </p>
        </button>
        <button onClick={onEdit} className="shrink-0 rounded p-1 hover:bg-surface-muted" title="수정">
          <Pencil className="size-3.5 ui-text-secondary" />
        </button>
        <button onClick={onDelete} className="shrink-0 rounded p-1 hover:bg-danger-glass" title="삭제">
          <Trash2 className="size-3.5 text-destructive" />
        </button>
      </div>
    </div>
  )
}

function parseChecklist(content: string): DevChallengeChecklistItem[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => ({
          id: typeof item?.id === 'string' ? item.id : String(index),
          label: typeof item?.label === 'string' ? item.label : String(item),
        }))
        .filter((item) => item.label.trim())
    }
  } catch {
    // Fall through to plain text parsing.
  }
  return buildChecklistItems(content)
}

function AssignmentBlockViewer({ block }: { block: DevChallengeAssignmentBlock }) {
  if (block.blockType === 'CHECKLIST') {
    const items = parseChecklist(block.content)
    return (
      <section className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckSquare className="size-4 text-brand-primary" />
          <h4 className="text-sm font-bold ui-text-primary">{block.title || '완료 조건'}</h4>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm ui-text-secondary">
              <input type="checkbox" disabled className="mt-0.5 size-4 rounded border border-surface-border" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="size-4 text-brand-primary" />
        <h4 className="text-sm font-bold ui-text-primary">{block.title || '챌린지 설명'}</h4>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 ui-text-secondary">{block.content}</p>
    </section>
  )
}

function CopyAssignmentLinkButton() {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title="이 챌린지 링크 복사"
      className="flex items-center gap-1 rounded border border-surface-border bg-surface-muted px-2 py-1 text-[10px] font-bold transition-colors hover:bg-surface-raised ui-text-secondary"
    >
      {copied ? <Check className="size-3 text-brand-primary" /> : <Copy className="size-3" />}
      {copied ? '복사됨' : '링크'}
    </button>
  )
}

function AssignmentDetail({ assignmentId }: { assignmentId: string | null }) {
  const { data: assignment, isLoading } = useDevChallengeAssignment(assignmentId ?? '')

  if (!assignmentId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm ui-text-muted">출제를 선택하세요</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin ui-text-secondary" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm ui-text-muted">출제를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="ui-panel-soft overflow-hidden">
        <div className="border-b border-surface-border-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black ui-text-primary">{assignment.title}</h3>
              {assignment.summary ? (
                <p className="mt-1 text-sm ui-text-secondary">{assignment.summary}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <CopyAssignmentLinkButton />
              <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[10px] font-bold ui-text-secondary">
                {assignment.difficulty}
              </span>
            </div>
          </div>
        </div>

        {assignment.blocks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm ui-text-muted">아직 출제 본문이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border-soft">
            {assignment.blocks.map((block) => (
              <AssignmentBlockViewer key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FormRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2 border-b border-surface-border-soft py-5 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-6">
      <div className="pt-1">
        <label htmlFor={htmlFor} className="text-sm font-bold ui-text-primary">
          {label}
        </label>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed ui-text-muted">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function CreateAssignmentDialog({
  sectionId,
  open,
  onOpenChange,
  onCreated,
}: {
  sectionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (assignmentId: string) => void
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [difficulty, setDifficulty] = useState('BASIC')
  const [noteContent, setNoteContent] = useState('')
  const [checklistText, setChecklistText] = useState('')
  const createAssignment = useCreateDevChallengeAssignment()

  const reset = () => {
    setTitle('')
    setSummary('')
    setDifficulty('BASIC')
    setNoteContent('')
    setChecklistText('')
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    const assignment = await createAssignment.mutateAsync({
      sectionId,
      title: title.trim(),
      summary: summary.trim() || undefined,
      difficulty,
      status: 'PUBLISHED',
      noteContent,
      checklistItems: buildChecklistItems(checklistText),
    })
    reset()
    onOpenChange(false)
    onCreated(assignment.id)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[min(880px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <ClipboardCheck className="size-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold ui-text-primary">새 챌린지 출제</Dialog.Title>
                <p className="mt-0.5 text-xs ui-text-muted">학습자에게 바로 공개되는 챌린지를 만듭니다.</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex size-7 items-center justify-center rounded-md ui-text-secondary hover:bg-surface-muted hover:ui-text-primary">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <FormRow label="제목" description="목록 카드와 상세 헤더에 노출됩니다." htmlFor="create-title">
              <input
                id="create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 컴포넌트 상태 관리 챌린지"
                className="ui-input"
              />
            </FormRow>
            <FormRow label="요약" description="카드에 표시될 한두 줄 설명." htmlFor="create-summary">
              <textarea
                id="create-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="간단한 요구사항을 읽고 상태 기반 UI를 구현합니다."
                className="ui-input min-h-20 py-2"
              />
            </FormRow>
            <FormRow label="난이도" description="학습자가 챌린지를 고를 때 보입니다." htmlFor="create-difficulty">
              <Select
                id="create-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="BASIC">BASIC</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </Select>
            </FormRow>
            <FormRow
              label="챌린지 설명"
              description="문제 배경과 요구사항을 자세히 적어주세요."
              htmlFor="create-note"
            >
              <textarea
                id="create-note"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요."
                className="ui-input min-h-36 py-2"
              />
            </FormRow>
            <FormRow
              label="완료 조건"
              description="줄 단위로 입력하면 체크리스트가 됩니다."
              htmlFor="create-checklist"
            >
              <textarea
                id="create-checklist"
                value={checklistText}
                onChange={(event) => setChecklistText(event.target.value)}
                placeholder={'상태별 UI가 명확하게 구분된다\n빈 상태, 로딩, 오류 상태를 처리한다\n모바일/데스크톱 레이아웃이 깨지지 않는다'}
                className="ui-input min-h-32 py-2"
              />
            </FormRow>
          </div>

          <footer className="flex justify-end gap-2 border-t border-surface-border bg-surface-muted/40 px-6 py-3">
            <Dialog.Close asChild>
              <button className="rounded-md border border-surface-border bg-surface-raised px-3.5 py-1.5 text-xs font-bold ui-text-secondary hover:bg-surface-muted">
                취소
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || createAssignment.isPending}
              className="rounded-md bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-text-on-brand hover:brightness-110 disabled:opacity-50"
            >
              {createAssignment.isPending ? '저장 중...' : '저장'}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function checklistItemsToText(items: DevChallengeChecklistItem[]): string {
  return items.map((item) => item.label).join('\n')
}

function EditAssignmentDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: DevChallengeAssignmentDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [difficulty, setDifficulty] = useState('BASIC')
  const [noteContent, setNoteContent] = useState('')
  const [checklistText, setChecklistText] = useState('')
  const updateAssignment = useUpdateDevChallengeAssignment()
  const updateBlock = useUpdateDevChallengeAssignmentBlock()
  const createBlock = useCreateDevChallengeAssignmentBlock()

  useEffect(() => {
    if (!assignment) return
    setTitle(assignment.title)
    setSummary(assignment.summary ?? '')
    setDifficulty(assignment.difficulty)
    const noteBlock = assignment.blocks.find((block) => block.blockType === 'NOTE')
    const checklistBlock = assignment.blocks.find((block) => block.blockType === 'CHECKLIST')
    setNoteContent(noteBlock?.content ?? '')
    setChecklistText(checklistBlock ? checklistItemsToText(parseChecklist(checklistBlock.content)) : '')
  }, [assignment?.id, open])

  if (!assignment) return null

  const handleSubmit = async () => {
    if (!title.trim()) return
    await updateAssignment.mutateAsync({
      id: assignment.id,
      sectionId: assignment.sectionId,
      data: {
        title: title.trim(),
        summary: summary.trim(),
        difficulty,
      },
    })

    const noteBlock = assignment.blocks.find((block) => block.blockType === 'NOTE')
    const trimmedNote = noteContent.trim()
    if (noteBlock) {
      if (noteBlock.content !== trimmedNote) {
        await updateBlock.mutateAsync({
          blockId: noteBlock.id,
          assignmentId: assignment.id,
          data: { content: trimmedNote },
        })
      }
    } else if (trimmedNote) {
      await createBlock.mutateAsync({
        assignmentId: assignment.id,
        data: { blockType: 'NOTE', title: '챌린지 설명', content: trimmedNote },
      })
    }

    const checklistBlock = assignment.blocks.find((block) => block.blockType === 'CHECKLIST')
    const nextItems = buildChecklistItems(checklistText)
    const nextItemsJson = JSON.stringify(nextItems)
    if (checklistBlock) {
      if (checklistBlock.content !== nextItemsJson) {
        await updateBlock.mutateAsync({
          blockId: checklistBlock.id,
          assignmentId: assignment.id,
          data: { content: nextItemsJson },
        })
      }
    } else if (nextItems.length > 0) {
      await createBlock.mutateAsync({
        assignmentId: assignment.id,
        data: { blockType: 'CHECKLIST', title: '완료 조건', content: nextItemsJson },
      })
    }

    onOpenChange(false)
  }

  const isPending = updateAssignment.isPending || updateBlock.isPending || createBlock.isPending

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[min(880px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                <Pencil className="size-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold ui-text-primary">챌린지 수정</Dialog.Title>
                <p className="mt-0.5 text-xs ui-text-muted">제목, 본문, 완료 조건을 함께 수정합니다.</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex size-7 items-center justify-center rounded-md ui-text-secondary hover:bg-surface-muted hover:ui-text-primary">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <FormRow label="제목" description="목록 카드와 상세 헤더에 노출됩니다." htmlFor="edit-title">
              <input
                id="edit-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 컴포넌트 상태 관리 챌린지"
                className="ui-input"
              />
            </FormRow>
            <FormRow label="요약" description="카드에 표시될 한두 줄 설명." htmlFor="edit-summary">
              <textarea
                id="edit-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="간단한 요구사항을 읽고 상태 기반 UI를 구현합니다."
                className="ui-input min-h-20 py-2"
              />
            </FormRow>
            <FormRow label="난이도" description="학습자가 챌린지를 고를 때 보입니다." htmlFor="edit-difficulty">
              <Select
                id="edit-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="BASIC">BASIC</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </Select>
            </FormRow>
            <FormRow
              label="챌린지 설명"
              description="문제 배경과 요구사항을 자세히 적어주세요."
              htmlFor="edit-note"
            >
              <textarea
                id="edit-note"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요."
                className="ui-input min-h-36 py-2"
              />
            </FormRow>
            <FormRow
              label="완료 조건"
              description="줄 단위로 입력하면 체크리스트가 됩니다."
              htmlFor="edit-checklist"
            >
              <textarea
                id="edit-checklist"
                value={checklistText}
                onChange={(event) => setChecklistText(event.target.value)}
                placeholder={'상태별 UI가 명확하게 구분된다\n빈 상태, 로딩, 오류 상태를 처리한다\n모바일/데스크톱 레이아웃이 깨지지 않는다'}
                className="ui-input min-h-32 py-2"
              />
            </FormRow>
          </div>

          <footer className="flex justify-end gap-2 border-t border-surface-border bg-surface-muted/40 px-6 py-3">
            <Dialog.Close asChild>
              <button className="rounded-md border border-surface-border bg-surface-raised px-3.5 py-1.5 text-xs font-bold ui-text-secondary hover:bg-surface-muted">
                취소
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              className="rounded-md bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-text-on-brand hover:brightness-110 disabled:opacity-50"
            >
              {isPending ? '저장 중...' : '저장'}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const SUBMISSION_STATUS_LABEL: Record<DevChallengeSubmissionStatus, string> = {
  SUBMITTED: '제출됨',
  NEEDS_CHANGES: '수정 필요',
  APPROVED: '승인',
  REJECTED: '반려',
}

function SubmissionStatusBadge({ status }: { status: DevChallengeSubmissionStatus }) {
  const isPositive = status === 'APPROVED'
  const isNegative = status === 'REJECTED' || status === 'NEEDS_CHANGES'
  const className = isPositive
    ? 'border-brand-border bg-brand-glass text-brand-primary'
    : isNegative
      ? 'border-destructive bg-danger-glass text-destructive'
      : 'border-surface-border-soft bg-surface-muted ui-text-secondary'
  return (
    <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold ${className}`}>
      {SUBMISSION_STATUS_LABEL[status]}
    </span>
  )
}

function formatSubmittedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SubmissionComments({ submissionId }: { submissionId: string }) {
  const userId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const { data: comments = [], isLoading } = useDevChallengeSubmissionComments(submissionId)
  const createComment = useCreateDevChallengeSubmissionComment()
  const updateComment = useUpdateDevChallengeSubmissionComment()
  const deleteComment = useDeleteDevChallengeSubmissionComment()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const handleCreate = async () => {
    const content = draft.trim()
    if (!content || createComment.isPending) return
    await createComment.mutateAsync({ submissionId, content })
    setDraft('')
  }

  const handleUpdate = async () => {
    const content = editingContent.trim()
    if (!editingId || !content || updateComment.isPending) return
    await updateComment.mutateAsync({ id: editingId, submissionId, content })
    setEditingId(null)
    setEditingContent('')
  }

  return (
    <div className="mt-3 border-t border-surface-border-soft pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <MessageCircle className="size-3.5 text-brand-primary" />
        <p className="text-[11px] font-bold ui-text-secondary">제출 댓글</p>
        <span className="text-[10px] ui-text-muted">{comments.length}</span>
      </div>

      {isLoading ? (
        <Loader2 className="my-3 size-3.5 animate-spin ui-text-muted" />
      ) : comments.length > 0 ? (
        <div className="mb-2 space-y-2">
          {comments.map((comment) => {
            const canManage = comment.userId === userId || userRole === 'admin'
            const isEditing = editingId === comment.id
            return (
              <div key={comment.id} className="rounded-md bg-surface-muted px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-bold ui-text-primary">{comment.authorName}</span>
                      <span className="text-[10px] ui-text-muted">{formatSubmittedAt(comment.createdAt)}</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="ui-input mt-1 min-h-16 py-1.5 text-xs"
                        maxLength={2000}
                        autoFocus
                      />
                    ) : (
                      <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed ui-text-secondary">{comment.content}</p>
                    )}
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdate}
                            disabled={!editingContent.trim() || updateComment.isPending}
                            className="ui-icon-button-brand disabled:opacity-50"
                            title="댓글 저장"
                          >
                            <Check className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="ui-icon-button"
                            title="수정 취소"
                          >
                            <X className="size-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(comment.id)
                              setEditingContent(comment.content)
                            }}
                            className="ui-icon-button"
                            title="댓글 수정"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('이 댓글을 삭제할까요?')) {
                                deleteComment.mutate({ id: comment.id, submissionId })
                              }
                            }}
                            disabled={deleteComment.isPending}
                            className="ui-icon-button-danger disabled:opacity-50"
                            title="댓글 삭제"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleCreate()
            }
          }}
          placeholder="제출에 대한 댓글을 남겨주세요."
          className="ui-input min-h-9 flex-1 py-2 text-xs"
          rows={1}
          maxLength={2000}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!draft.trim() || createComment.isPending}
          className="ui-icon-button-brand size-9 disabled:opacity-50"
          title="댓글 등록"
        >
          {createComment.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

function SubmissionCard({ submission }: { submission: DevChallengeSubmissionWithAuthor }) {
  const initial = submission.authorName.trim().charAt(0) || '?'
  const userId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const deleteSubmission = useDeleteDevChallengeSubmission()
  const canDelete = submission.userId === userId || userRole === 'admin'

  const handleDelete = () => {
    if (!window.confirm('이 제출을 삭제할까요?')) return
    deleteSubmission.mutate({ id: submission.id, assignmentId: submission.assignmentId })
  }

  return (
    <div className="ui-panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {submission.authorImageUrl ? (
            <img
              src={submission.authorImageUrl}
              alt={submission.authorName}
              className="size-7 shrink-0 rounded-full border border-surface-border-soft object-cover"
            />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-surface-border-soft bg-surface-muted text-xs font-bold ui-text-secondary">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold ui-text-primary">{submission.authorName}</p>
            <p className="text-[11px] ui-text-muted">{formatSubmittedAt(submission.updatedAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SubmissionStatusBadge status={submission.status} />
          <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-bold ui-text-secondary">
            {submission.score}/{submission.maxScore}
          </span>
          {canDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleteSubmission.isPending}
              title="제출 삭제"
              className="ui-icon-button-danger disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {submission.comment ? (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed ui-text-secondary">{submission.comment}</p>
      ) : null}

      {submission.githubUrl ? (
        <a
          href={submission.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs font-bold text-brand-primary hover:underline"
        >
          {submission.githubUrl}
        </a>
      ) : null}

      {submission.adminFeedback ? (
        <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 py-2">
          <p className="text-[10px] font-bold ui-text-muted">리뷰 피드백</p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs ui-text-secondary">{submission.adminFeedback}</p>
        </div>
      ) : null}

      <SubmissionComments submissionId={submission.id} />
    </div>
  )
}

function SubmissionsList({ assignmentId }: { assignmentId: string }) {
  const { data: submissions = [], isLoading } = useDevChallengeSubmissions(assignmentId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-black ui-text-primary">제출 현황</p>
        <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold ui-text-muted">
          {submissions.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-4 animate-spin ui-text-secondary" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="rounded-md border border-dashed border-surface-border-soft p-4 text-center text-xs ui-text-muted">
          아직 제출이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionPanel({ assignmentId }: { assignmentId: string | null }) {
  const userRole = useSessionStore((state) => state.userRole)
  const { data: assignment, isLoading: assignmentLoading } = useDevChallengeAssignment(assignmentId ?? '')
  const { data: submission, isLoading: submissionLoading } = useMyDevChallengeSubmission(assignmentId ?? '')
  const createSubmission = useCreateDevChallengeSubmission()
  const updateSubmission = useUpdateDevChallengeSubmission()
  const deleteSubmission = useDeleteDevChallengeSubmission()
  const [comment, setComment] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  const checklistItems = assignment?.blocks
    .filter((block) => block.blockType === 'CHECKLIST')
    .flatMap((block) => parseChecklist(block.content)) ?? []

  useEffect(() => {
    setComment(submission?.comment ?? '')
    setGithubUrl(submission?.githubUrl ?? '')
    setCheckedItems(submission?.checkedItems ?? [])
    setError(null)
  }, [submission?.id, submission?.comment, submission?.githubUrl, submission?.checkedItems])

  if (!assignmentId) {
    return null
  }

  if (assignmentLoading || submissionLoading) {
    return (
      <div className="flex items-center justify-center border-t border-surface-border p-6">
        <Loader2 className="size-5 animate-spin ui-text-secondary" />
      </div>
    )
  }

  const handleSubmit = async () => {
    try {
      setError(null)
      const payload = {
        assignmentId,
        comment: comment.trim(),
        githubUrl: githubUrl.trim() || undefined,
        checkedItems,
      }
      if (!payload.comment && !payload.githubUrl) {
        setError('설명 또는 GitHub 링크 중 하나는 필요합니다.')
        return
      }
      if (submission?.id) {
        await updateSubmission.mutateAsync({ id: submission.id, assignmentId, data: payload })
      } else {
        await createSubmission.mutateAsync(payload)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '제출에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!submission?.id) return
    if (!window.confirm('내 제출을 삭제할까요?')) return
    try {
      setError(null)
      await deleteSubmission.mutateAsync({ id: submission.id, assignmentId })
      setComment('')
      setGithubUrl('')
      setCheckedItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="ui-panel-soft overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CheckSquare className="size-4 shrink-0 text-brand-primary" />
          <span className="text-sm font-black ui-text-primary">제출</span>
          {submission ? (
            <>
              <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                {submission.status}
              </span>
              <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-bold ui-text-secondary">
                {submission.score}/{submission.maxScore}
              </span>
            </>
          ) : (
            <span className="text-[11px] ui-text-muted">아직 제출하지 않았습니다</span>
          )}
        </div>
        <ChevronDown className={`size-4 shrink-0 ui-text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-surface-border-soft p-4">
          <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold ui-text-primary">설명</label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="구현 내용, 고민한 점, 확인 방법을 적어주세요."
            className="ui-input min-h-32 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold ui-text-primary">GitHub 링크</label>
          <input
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="https://github.com/user/repo/pull/1"
            className="ui-input"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold ui-text-primary">제출 체크리스트</p>
            <p className="text-xs font-bold text-brand-primary">
              {checkedItems.length}/{checklistItems.length}
            </p>
          </div>
          {checklistItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-surface-border-soft p-4 text-center text-xs ui-text-muted">
              출제 체크리스트가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(item.id)}
                    onChange={(event) => {
                      setCheckedItems((prev) =>
                        event.target.checked
                          ? [...prev, item.id]
                          : prev.filter((checkedItem) => checkedItem !== item.id),
                      )
                    }}
                    className="mt-0.5 size-4 rounded border border-surface-border"
                  />
                  <span className="text-sm ui-text-secondary">{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive bg-danger-glass px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={createSubmission.isPending || updateSubmission.isPending}
            className="flex-1 rounded-md bg-brand-primary px-3 py-2 text-sm font-bold text-text-on-brand hover:brightness-110 disabled:opacity-50"
          >
            {createSubmission.isPending || updateSubmission.isPending
              ? '제출 중...'
              : submission
                ? '제출 수정'
                : '제출'}
          </button>
          {submission ? (
            <button
              onClick={handleDelete}
              disabled={deleteSubmission.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive bg-danger-glass px-3 py-2 text-sm font-bold text-destructive hover:brightness-110 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              {deleteSubmission.isPending ? '삭제 중...' : '삭제'}
            </button>
          ) : null}
        </div>
          </div>

          {userRole === 'admin' ? (
            <SubmissionsList assignmentId={assignmentId} />
          ) : submission ? (
            <div className="ui-panel-soft p-3">
              <SubmissionComments submissionId={submission.id} />
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  )
}

export function DevChallengeMainPanel({ sectionId, selectedAssignmentId, onSelectAssignment }: DevChallengeMainPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null)
  const { data: editingAssignment } = useDevChallengeAssignment(editAssignmentId ?? '')
  const { data: assignments = [], isLoading } = useDevChallengeAssignments(sectionId ?? '')
  const deleteAssignment = useDeleteDevChallengeAssignment()
  const reorderAssignments = useReorderDevChallengeAssignments()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!selectedAssignmentId && assignments[0]) {
      onSelectAssignment(assignments[0].id)
    }
  }, [assignments])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!sectionId || !over || active.id === over.id) return
    const activeIndex = assignments.findIndex((assignment) => assignment.id === active.id)
    const overIndex = assignments.findIndex((assignment) => assignment.id === over.id)
    if (activeIndex === -1 || overIndex === -1) return
    const reordered = [...assignments]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)
    reorderAssignments.mutate({ sectionId, assignmentIds: reordered.map((assignment) => assignment.id) })
  }

  if (!sectionId) {
    return (
      <Card className="flex flex-1 items-center justify-center rounded-md p-6 text-center">
        <p className="text-sm ui-text-muted">2차 주제를 선택하세요</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-1 flex-col overflow-hidden rounded-md">
      <CreateAssignmentDialog
        sectionId={sectionId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onSelectAssignment}
      />
      <EditAssignmentDialog
        assignment={editingAssignment ?? null}
        open={!!editAssignmentId}
        onOpenChange={(open) => {
          if (!open) setEditAssignmentId(null)
        }}
      />

      <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-brand-primary" />
          <p className="text-sm font-black ui-text-primary">챌린지 출제 · 제출</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-surface-muted"
        >
          <Plus className="size-3.5" />
          출제 추가
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(260px,340px)_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-surface-border p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin ui-text-secondary" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-md border border-dashed border-surface-border-soft p-8 text-center">
              <p className="text-sm ui-text-muted">첫 챌린지를 출제하세요.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={assignments.map((assignment) => assignment.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <AssignmentItem
                      key={assignment.id}
                      assignment={assignment}
                      selected={selectedAssignmentId === assignment.id}
                      onSelect={() => onSelectAssignment(assignment.id)}
                      onEdit={() => setEditAssignmentId(assignment.id)}
                      onDelete={() => {
                        deleteAssignment.mutate({ id: assignment.id, sectionId })
                        if (selectedAssignmentId === assignment.id) onSelectAssignment(null)
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="min-h-0 overflow-y-auto">
          <AssignmentDetail assignmentId={selectedAssignmentId} />
          <SubmissionPanel assignmentId={selectedAssignmentId} />
        </div>
      </div>
    </Card>
  )
}
