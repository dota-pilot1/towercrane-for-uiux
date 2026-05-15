import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, MessageSquarePlus, Pin, Search } from 'lucide-react'
import { useBoards, useCreateBoard } from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

export function BoardListPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { code?: string }
  const code = params.code ?? ''
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState({ title: '', content: '' })
  const filters = useMemo(() => ({ page: 1, pageSize: 30, q }), [q])
  const boardsQuery = useBoards(code, filters)
  const createBoard = useCreateBoard()
  const data = boardsQuery.data

  const handleSubmit = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return
    const board = await createBoard.mutateAsync({ code, body: draft })
    setDraft({ title: '', content: '' })
    navigate({ to: `/boards/${code}/${board.id}` })
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              type="button"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
              onClick={() => navigate({ to: '/boards' })}
            >
              <ArrowLeft className="size-3.5" />
              게시판
            </button>
            <h1 className="text-2xl font-black text-text-primary">{data?.config.name ?? '게시판'}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {data?.config.description ?? '게시글을 확인합니다.'}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="제목 또는 내용 검색"
            className="pl-10"
          />
        </div>

        <Card className="overflow-hidden rounded-md border border-surface-border-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_100px] border-b border-surface-border-soft bg-surface-muted px-4 py-3 text-xs font-black text-text-muted">
            <span>제목</span>
            <span>작성자</span>
            <span>작성일</span>
          </div>
          <div className="divide-y divide-[var(--surface-border-soft)]">
            {(data?.items ?? []).map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => navigate({ to: `/boards/${code}/${board.id}` })}
                className="grid w-full grid-cols-[minmax(0,1fr)_120px_100px] items-center gap-3 px-4 py-4 text-left transition hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    {board.pinned && <Pin className="size-3.5 shrink-0 text-brand-primary" />}
                    <span className="truncate text-sm font-bold text-text-primary">{board.title}</span>
                  </span>
                  {board.answered && (
                    <span className="mt-1 inline-flex text-xs font-bold text-brand-primary">답변 완료</span>
                  )}
                </span>
                <span className="truncate text-sm text-text-secondary">{board.authorName}</span>
                <span className="text-xs text-text-muted">{formatDate(board.createdAt)}</span>
              </button>
            ))}
            {!boardsQuery.isLoading && (data?.items.length ?? 0) === 0 && (
              <div className="px-4 py-14 text-center text-sm text-text-muted">게시글이 없습니다.</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="h-fit rounded-md border border-surface-border-soft p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="ui-icon-button-brand size-8">
            <MessageSquarePlus className="size-4" />
          </div>
          <h2 className="text-base font-black text-text-primary">새 글</h2>
        </div>
        {data?.config.allowUserWrite ? (
          <div className="flex flex-col gap-3">
            <Input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="제목"
            />
            <Textarea
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="내용"
              rows={8}
            />
            <Button onClick={handleSubmit} disabled={createBoard.isPending}>
              등록
            </Button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">관리자만 작성할 수 있는 게시판입니다.</p>
        )}
      </Card>
    </div>
  )
}

