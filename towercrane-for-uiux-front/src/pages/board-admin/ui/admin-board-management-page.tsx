import { useEffect, useMemo, useState } from 'react'
import { MessageSquareReply, Newspaper, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import type { BoardSummary } from '../../../entities/board/model/types'
import {
  useAdminBoardAction,
  useAdminBoardConfigs,
  useAdminBoardDetail,
  useAdminBoards,
  useBoardComments,
  useCreateAdminBoard,
  useCreateAdminReply,
  useUnansweredInquiryCount,
  useUpdateAdminBoard,
} from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short' }).format(new Date(value))
}

export function AdminBoardManagementPage() {
  const configsQuery = useAdminBoardConfigs()
  const configs = configsQuery.data ?? []
  const [code, setCode] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', content: '' })
  const [reply, setReply] = useState('')
  const filters = useMemo(() => ({ page: 1, pageSize: 50 }), [])
  const listQuery = useAdminBoards(code, filters)
  const detailQuery = useAdminBoardDetail(code, selectedId)
  const commentsQuery = useBoardComments(code, selectedId)
  const unansweredQuery = useUnansweredInquiryCount()
  const createBoard = useCreateAdminBoard()
  const updateBoard = useUpdateAdminBoard()
  const action = useAdminBoardAction()
  const createReply = useCreateAdminReply(code, selectedId)

  useEffect(() => {
    if (!code && configs[0]) setCode(configs[0].code)
  }, [code, configs])

  const selectedConfig = configs.find((config) => config.code === code)
  const items = listQuery.data?.items ?? []
  const detail = detailQuery.data

  const submitBoard = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return
    if (selectedId && detail) {
      await updateBoard.mutateAsync({ code, boardId: selectedId, body: draft })
    } else {
      const created = await createBoard.mutateAsync({ code, body: draft })
      setSelectedId(created.id)
    }
    setDraft({ title: '', content: '' })
  }

  const startEdit = (board: BoardSummary) => {
    setSelectedId(board.id)
    setDraft({ title: board.title, content: '' })
  }

  useEffect(() => {
    if (detail) setDraft({ title: detail.title, content: detail.content })
  }, [detail])

  const submitReply = async () => {
    if (!reply.trim()) return
    await createReply.mutateAsync(reply)
    setReply('')
  }

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 xl:grid-cols-[250px_minmax(0,1fr)_420px]">
      <Card className="h-fit rounded-md border border-surface-border-soft p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="ui-icon-button-brand size-8">
            <Newspaper className="size-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-text-primary">게시글 관리</h1>
            <p className="text-xs text-text-muted">미답변 {unansweredQuery.data?.count ?? 0}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {configs.map((config) => (
            <button
              key={config.id}
              type="button"
              onClick={() => {
                setCode(config.code)
                setSelectedId(null)
                setDraft({ title: '', content: '' })
              }}
              className={`rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
                code === config.code
                  ? 'border-brand-border bg-brand-glass text-brand-primary'
                  : 'border-surface-border-soft bg-surface-muted text-text-secondary hover:text-text-primary'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-md border border-surface-border-soft">
        <div className="flex items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-3">
          <div>
            <h2 className="text-lg font-black text-text-primary">{selectedConfig?.name ?? '게시판'}</h2>
            <p className="text-xs text-text-muted">{items.length}개 게시글</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              setSelectedId(null)
              setDraft({ title: '', content: '' })
            }}
          >
            <Plus className="size-3.5" />
            새 글
          </Button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_90px] bg-surface-muted px-4 py-3 text-xs font-black text-text-muted">
          <span>제목</span>
          <span>상태</span>
          <span>답변</span>
          <span>작성일</span>
        </div>
        <div className="divide-y divide-[var(--surface-border-soft)]">
          {items.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setSelectedId(board.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_90px_80px_90px] items-center gap-2 px-4 py-3 text-left transition hover:bg-surface-muted"
            >
              <span className="truncate text-sm font-bold text-text-primary">{board.title}</span>
              <span className="text-xs text-text-secondary">{board.status}</span>
              <span className="text-xs text-text-secondary">{board.answered ? '완료' : '-'}</span>
              <span className="text-xs text-text-muted">{formatDate(board.createdAt)}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="h-fit rounded-md border border-surface-border-soft p-5">
        <h2 className="mb-4 text-base font-black text-text-primary">
          {selectedId ? '게시글 수정' : '새 게시글'}
        </h2>
        <div className="flex flex-col gap-3">
          <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="제목" />
          <Textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="내용" rows={8} />
          <Button onClick={submitBoard} disabled={!code || !draft.title.trim() || !draft.content.trim()}>
            저장
          </Button>

          {selectedId && detail && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-border-soft pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => action.mutate({ action: detail.pinned ? 'unpin' : 'pin', code, boardId: detail.id })}
              >
                {detail.pinned ? <PinOff className="mr-1.5 size-3.5" /> : <Pin className="mr-1.5 size-3.5" />}
                {detail.pinned ? '핀 해제' : '핀 고정'}
              </Button>
              <Select
                value={detail.status}
                className="h-8 py-0"
                wrapperClassName="w-32"
                onChange={(event) => action.mutate({ action: 'status', code, boardId: detail.id, status: event.target.value as typeof detail.status })}
              >
                <option value="PUBLISHED">게시</option>
                <option value="HIDDEN">숨김</option>
                <option value="DRAFT">초안</option>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                tone="danger"
                onClick={() => action.mutate({ action: 'delete', code, boardId: detail.id })}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                삭제
              </Button>
            </div>
          )}

          {selectedId && (
            <div className="mt-3 border-t border-surface-border-soft pt-3">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareReply className="size-4 text-brand-primary" />
                <h3 className="text-sm font-black text-text-primary">답변/댓글</h3>
              </div>
              <div className="mb-3 flex flex-col gap-2">
                {(commentsQuery.data ?? []).map((comment) => (
                  <div key={comment.id} className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
                    <p className="text-xs font-bold text-text-primary">{comment.authorName}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{comment.content}</p>
                  </div>
                ))}
              </div>
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder="관리자 답변" />
              <Button className="mt-2 w-full" onClick={submitReply} disabled={!reply.trim()}>
                답변 등록
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

