import * as Dialog from '@radix-ui/react-dialog'
import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { LexicalEditor } from '../../../shared/ui/lexical/lexical-editor'
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from '../model/use-task-queries'

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

function isLexicalJson(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Boolean(parsed?.root)
  } catch {
    return false
  }
}

function hasLexicalContent(value: string) {
  try {
    const parsed = JSON.parse(value)
    const queue = Array.isArray(parsed?.root?.children)
      ? [...parsed.root.children]
      : []

    while (queue.length > 0) {
      const node = queue.shift()
      if (typeof node?.text === 'string' && node.text.trim()) return true
      if (node?.type === 'image') return true
      if (Array.isArray(node?.children)) queue.push(...node.children)
    }
  } catch {
    return value.trim().length > 0
  }

  return false
}

function CommentForm({
  content,
  draftVersion,
  isPending,
  onChange,
  onSubmit,
}: {
  content: string
  draftVersion: number
  isPending: boolean
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="overflow-hidden rounded-md border border-surface-border-soft">
        <LexicalEditor
          key={`comment-draft-${draftVersion}`}
          initialState={content}
          onChange={onChange}
          minHeight="120px"
          placeholder="댓글을 입력하세요."
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Send className="mr-2 size-4" />
          등록
        </Button>
      </div>
    </form>
  )
}

export function TaskCommentCreateButton({ taskId }: { taskId: string | null }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [draftVersion, setDraftVersion] = useState(0)
  const createComment = useCreateTaskComment(taskId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasLexicalContent(content)) return
    await createComment.mutateAsync(content.trim())
    setContent('')
    setDraftVersion((value) => value + 1)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" size="sm" disabled={!taskId}>
          <Plus className="mr-1.5 size-3.5" />
          댓글 작성
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] flex w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-black text-text-primary">
                댓글 작성
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                업무 논의와 결정 내용을 남깁니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5">
            <CommentForm
              content={content}
              draftVersion={draftVersion}
              isPending={createComment.isPending}
              onChange={setContent}
              onSubmit={handleSubmit}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function TaskCommentsPanel({
  taskId,
  showComposer = true,
}: {
  taskId: string | null
  showComposer?: boolean
}) {
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const [content, setContent] = useState('')
  const [draftVersion, setDraftVersion] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const commentsQuery = useTaskComments(taskId)
  const createComment = useCreateTaskComment(taskId)
  const updateComment = useUpdateTaskComment(taskId)
  const deleteComment = useDeleteTaskComment(taskId)
  const comments = commentsQuery.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasLexicalContent(content)) return
    await createComment.mutateAsync(content.trim())
    setContent('')
    setDraftVersion((value) => value + 1)
  }

  const handleSave = async (commentId: string) => {
    if (!hasLexicalContent(editingContent)) return
    await updateComment.mutateAsync({ commentId, content: editingContent.trim() })
    setEditingId(null)
    setEditingContent('')
  }

  return (
    <div className="space-y-4">
      {showComposer ? (
        <CommentForm
          content={content}
          draftVersion={draftVersion}
          isPending={createComment.isPending}
          onChange={setContent}
          onSubmit={handleSubmit}
        />
      ) : null}

      <div className="space-y-3">
        {commentsQuery.isLoading ? (
          <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm text-text-muted">
            댓글을 불러오는 중입니다.
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
            댓글이 없습니다.
          </div>
        ) : (
          comments.map((comment) => {
            const canEdit = comment.userId === currentUserId || userRole === 'admin'
            return (
              <article
                key={comment.id}
                className="rounded-md border border-surface-border-soft bg-surface-raised p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary">
                      {comment.userName ?? '알 수 없음'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      {editingId === comment.id ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm-icon"
                            onClick={() => handleSave(comment.id)}
                            aria-label="댓글 저장"
                            title="저장"
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm-icon"
                            onClick={() => setEditingId(null)}
                            aria-label="댓글 수정 취소"
                            title="취소"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm-icon"
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditingContent(comment.content)
                          }}
                          aria-label="댓글 수정"
                          title="수정"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm-icon"
                        tone="danger"
                        onClick={() => deleteComment.mutate(comment.id)}
                        aria-label="댓글 삭제"
                        title="삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {editingId === comment.id ? (
                  <div className="overflow-hidden rounded-md border border-surface-border-soft">
                    <LexicalEditor
                      key={comment.id}
                      initialState={editingContent}
                      onChange={setEditingContent}
                      minHeight="120px"
                      placeholder="댓글을 입력하세요."
                    />
                  </div>
                ) : isLexicalJson(comment.content) ? (
                  <div className="overflow-hidden rounded-md border border-surface-border-soft">
                    <LexicalEditor
                      key={comment.id}
                      initialState={comment.content}
                      onChange={() => undefined}
                      readOnly
                      minHeight="80px"
                    />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {comment.content}
                  </p>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
