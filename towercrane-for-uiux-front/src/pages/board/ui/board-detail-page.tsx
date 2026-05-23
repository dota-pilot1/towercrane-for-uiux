import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import {
  useBoardComments,
  useBoardDetail,
  useCreateBoardComment,
  useDeleteBoard,
  useUpdateBoard,
} from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { BackLinkButton } from '../../../shared/ui/back-link-button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { LexicalEditor } from '../../../shared/ui/lexical/lexical-editor'
import { Textarea } from '../../../shared/ui/textarea'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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
      if (node?.type === 'image' || node?.type === 'youtube') return true
      if (Array.isArray(node?.children)) queue.push(...node.children)
    }
  } catch {
    return value.trim().length > 0
  }
  return false
}

function createPlainTextLexicalState(value: string) {
  return JSON.stringify({
    root: {
      children: value.replace(/\r\n?/g, '\n').split('\n').map((line) => ({
        children: line
          ? [{ detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 }]
          : [],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}

function toLexicalInitialState(value: string) {
  if (!value.trim()) return ''
  return isLexicalJson(value) ? value : createPlainTextLexicalState(value)
}

export function BoardDetailPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { code?: string; boardId?: string }
  const code = params.code ?? ''
  const boardId = params.boardId ?? null
  const detailQuery = useBoardDetail(code, boardId)
  const commentsQuery = useBoardComments(code, boardId)
  const updateBoard = useUpdateBoard()
  const deleteBoard = useDeleteBoard()
  const createComment = useCreateBoardComment(code, boardId)
  const board = detailQuery.data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '' })
  const [comment, setComment] = useState('')

  const startEdit = () => {
    if (!board) return
    setDraft({ title: board.title, content: board.content })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!boardId) return
    await updateBoard.mutateAsync({ code, boardId, body: draft })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!boardId) return
    await deleteBoard.mutateAsync({ code, boardId })
    navigate({ to: `/boards/${code}` })
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    await createComment.mutateAsync(comment)
    setComment('')
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <BackLinkButton onClick={() => navigate({ to: `/boards/${code}` })} />

      <Card className="rounded-md border border-surface-border-soft p-6">
        {editing ? (
          <div className="flex flex-col gap-3">
            <Input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
            <div className="overflow-hidden rounded-md border border-surface-border-soft">
              <LexicalEditor
                key={`board-detail-edit-${boardId}`}
                initialState={toLexicalInitialState(draft.content)}
                onChange={(content) => setDraft((prev) => ({ ...prev, content }))}
                minHeight="260px"
                placeholder="내용을 입력하세요."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>취소</Button>
              <Button onClick={handleSave} disabled={updateBoard.isPending || !draft.title.trim() || !hasLexicalContent(draft.content)}>저장</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black text-text-primary">{board?.title ?? '게시글'}</h1>
                {board && (
                  <p className="mt-2 text-sm text-text-muted">
                    {board.authorName} · {formatDate(board.createdAt)} · 조회 {board.viewCount}
                  </p>
                )}
              </div>
              {board?.canEdit && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm-icon" variant="secondary" onClick={startEdit} title="수정">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm-icon" variant="secondary" tone="danger" onClick={handleDelete} title="삭제">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {board?.content && isLexicalJson(board.content) ? (
              <div className="mt-6 overflow-hidden rounded-md border border-surface-border-soft">
                <LexicalEditor
                  initialState={board.content}
                  onChange={() => undefined}
                  readOnly
                  minHeight="160px"
                />
              </div>
            ) : (
              <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-text-primary">
                {board?.content}
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="rounded-md border border-surface-border-soft p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquareReply className="size-4 text-brand-primary" />
          <h2 className="text-base font-black text-text-primary">댓글</h2>
        </div>
        <div className="flex flex-col gap-3">
          {(commentsQuery.data ?? []).map((item) => (
            <div key={item.id} className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-text-primary">{item.authorName}</span>
                {item.adminReply && <span className="text-xs font-bold text-brand-primary">관리자 답변</span>}
              </div>
              <p className="whitespace-pre-wrap text-sm text-text-secondary">{item.content}</p>
            </div>
          ))}
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="댓글 입력" />
          <Button className="self-end" onClick={handleComment} disabled={createComment.isPending}>댓글 등록</Button>
        </div>
      </Card>
    </div>
  )
}
