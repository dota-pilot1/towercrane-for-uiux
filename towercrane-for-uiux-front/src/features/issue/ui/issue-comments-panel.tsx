import { useState, type FormEvent } from 'react'
import { Check, Pencil, Send, Trash2, X } from 'lucide-react'
import { useSessionStore } from '../../../shared/store/session-store'
import { Button } from '../../../shared/ui/button'
import { LexicalEditor } from '../../../shared/ui/lexical/lexical-editor'
import {
  useCreateIssueComment,
  useDeleteIssueComment,
  useIssueComments,
  useUpdateIssueComment,
} from '../model/use-issue-queries'

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
    const queue = Array.isArray(parsed?.root?.children) ? [...parsed.root.children] : []
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

export function IssueCommentsPanel({ issueId }: { issueId: string | null }) {
  const currentUserId = useSessionStore((state) => state.userId)
  const userRole = useSessionStore((state) => state.userRole)
  const [content, setContent] = useState('')
  const [draftVersion, setDraftVersion] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const commentsQuery = useIssueComments(issueId)
  const createComment = useCreateIssueComment(issueId)
  const updateComment = useUpdateIssueComment(issueId)
  const deleteComment = useDeleteIssueComment(issueId)
  const comments = commentsQuery.data ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasLexicalContent(content)) return
    await createComment.mutateAsync(content.trim())
    setContent('')
    setDraftVersion((v) => v + 1)
  }

  const handleSave = async (commentId: string) => {
    if (!hasLexicalContent(editingContent)) return
    await updateComment.mutateAsync({ commentId, content: editingContent.trim() })
    setEditingId(null)
    setEditingContent('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="overflow-hidden rounded-md border border-surface-border-soft">
          <LexicalEditor
            key={`comment-draft-${draftVersion}`}
            initialState={content}
            onChange={setContent}
            minHeight="120px"
            placeholder="댓글을 입력하세요."
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={createComment.isPending}>
            <Send className="mr-2 size-4" />
            등록
          </Button>
        </div>
      </form>

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
