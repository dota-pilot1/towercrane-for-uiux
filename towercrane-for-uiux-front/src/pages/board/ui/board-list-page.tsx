import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  FileText,
  MessageSquareReply,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react'
import {
  useBoardComments,
  useBoardDetail,
  useBoards,
  useCreateBoard,
  useCreateBoardComment,
  useDeleteBoard,
  useUpdateBoard,
} from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { LexicalEditor } from '../../../shared/ui/lexical/lexical-editor'
import { SearchField } from '../../../shared/ui/search-field'
import { Textarea } from '../../../shared/ui/textarea'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
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
  const paragraphs = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => ({
      children: line
        ? [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: line,
              type: 'text',
              version: 1,
            },
          ]
        : [],
      direction: null,
      format: '',
      indent: 0,
      type: 'paragraph',
      version: 1,
    }))

  return JSON.stringify({
    root: {
      children: paragraphs.length > 0 ? paragraphs : [{ children: [], direction: null, format: '', indent: 0, type: 'paragraph', version: 1 }],
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

function BoardContent({ content }: { content: string }) {
  if (!content) return <span className="text-text-muted">내용이 없습니다.</span>
  if (isLexicalJson(content)) {
    return (
      <div className="overflow-hidden rounded-md border border-surface-border-soft">
        <LexicalEditor
          initialState={content}
          onChange={() => undefined}
          readOnly
          minHeight="120px"
        />
      </div>
    )
  }
  return <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">{content}</p>
}

// ── 댓글 섹션 ─────────────────────────────────────────────────────────────────

function CommentSection({ code, boardId }: { code: string; boardId: string }) {
  const commentsQuery = useBoardComments(code, boardId)
  const createComment = useCreateBoardComment(code, boardId)
  const [text, setText] = useState('')
  const comments = commentsQuery.data ?? []

  const handleSubmit = () => {
    if (!text.trim()) return
    createComment.mutate(text.trim(), { onSuccess: () => setText('') })
  }

  return (
    <div className="border-t border-surface-border-soft">
      <div className="flex items-center gap-2 bg-surface-muted px-5 py-3.5">
        <MessageSquareReply className="size-4 text-brand-primary" />
        <span className="text-sm font-black text-text-primary">
          댓글{' '}
          <span className="font-normal text-text-muted">{comments.length}</span>
        </span>
      </div>

      {comments.length > 0 && (
        <ul className="divide-y divide-[var(--surface-border-soft)]">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-glass text-xs font-black text-brand-primary">
                {c.authorName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{c.authorName}</span>
                  {c.adminReply && (
                    <span className="rounded bg-brand-glass px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
                      관리자
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {comments.length === 0 && !commentsQuery.isLoading && (
        <p className="px-5 py-3 text-xs text-text-muted">첫 댓글을 남겨보세요.</p>
      )}

      <div className="space-y-2 border-t border-surface-border-soft bg-surface-muted px-5 py-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows={2}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={createComment.isPending || !text.trim()}
            onClick={handleSubmit}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── 상세 패널 ─────────────────────────────────────────────────────────────────

function DetailPanel({
  code,
  boardId,
  onDeleted,
}: {
  code: string
  boardId: string
  onDeleted: () => void
}) {
  const detailQuery = useBoardDetail(code, boardId)
  const updateBoard = useUpdateBoard()
  const deleteBoard = useDeleteBoard()
  const board = detailQuery.data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '' })

  const startEdit = () => {
    if (!board) return
    setDraft({ title: board.title, content: board.content })
    setEditing(true)
  }

  const handleSave = async () => {
    await updateBoard.mutateAsync({ code, boardId, body: draft })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return
    await deleteBoard.mutateAsync({ code, boardId })
    onDeleted()
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded-md bg-surface-muted" />
        ))}
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-text-muted">
        게시글을 불러올 수 없습니다.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="border-b border-brand-border bg-brand-glass px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                className="h-9 text-base font-bold"
              />
            ) : (
              <h2 className="truncate text-base font-black leading-6 text-text-primary">
                {board.title}
              </h2>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              {board.pinned && (
                <span className="inline-flex items-center gap-1 font-bold text-brand-primary">
                  <Pin className="size-3" />
                  공지
                </span>
              )}
              <span className="font-bold text-text-secondary">{board.authorName}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDateTime(board.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3" />
                {board.viewCount}
              </span>
              {board.answered && (
                <span className="font-bold text-brand-primary">답변 완료</span>
              )}
            </div>
          </div>

          {board.canEdit && !editing && (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex size-8 items-center justify-center rounded-md border border-surface-border bg-background text-text-secondary transition-colors hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
                title="수정"
                aria-label="수정"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={deleteBoard.isPending}
                onClick={handleDelete}
                className="inline-flex size-8 items-center justify-center rounded-md border border-surface-border bg-background text-text-secondary transition-colors hover:border-destructive hover:bg-danger-glass hover:text-destructive disabled:opacity-40"
                title="삭제"
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 bg-surface-raised px-6 py-6">
        {editing ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border border-surface-border-soft">
              <LexicalEditor
                key={`board-edit-${boardId}`}
                initialState={toLexicalInitialState(draft.content)}
                onChange={(content) => setDraft((p) => ({ ...p, content }))}
                minHeight="240px"
                placeholder="내용을 입력하세요."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button
                size="sm"
                disabled={updateBoard.isPending || !draft.title.trim() || !hasLexicalContent(draft.content)}
                onClick={handleSave}
              >
                {updateBoard.isPending ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        ) : (
          <BoardContent content={board.content} />
        )}
      </div>

      {/* 댓글 */}
      <CommentSection code={code} boardId={boardId} />
    </div>
  )
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div className="flex h-full min-h-96 flex-col items-center justify-center gap-2.5 bg-surface-muted px-8 py-10 text-center">
      <div className="relative h-20 w-28">
        <div className="absolute left-3 top-3 h-14 w-16 rounded-lg border border-surface-border-soft bg-surface-raised shadow-sm" />
        <div className="absolute left-8 top-0 h-16 w-16 rounded-lg border border-surface-border bg-background shadow-sm">
          <div className="flex h-full flex-col gap-1.5 p-3">
            <div className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-brand-primary" />
              <span className="h-1.5 w-6 rounded-full bg-brand-glass" />
            </div>
            <span className="h-1 rounded-full bg-surface-muted" />
            <span className="h-1 rounded-full bg-surface-muted" />
            <span className="h-1 w-7 rounded-full bg-surface-muted" />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 size-3 rounded-full border border-brand-border bg-brand-glass" />
      </div>
      <p className="text-sm font-bold text-text-primary">선택된 게시글이 없습니다</p>
      <p className="text-xs text-text-muted">목록에서 게시글을 선택하면 내용이 표시됩니다.</p>
    </div>
  )
}

// ── 글쓰기 폼 ─────────────────────────────────────────────────────────────────

function WriteForm({ code, onDone }: { code: string; onDone: () => void }) {
  const createBoard = useCreateBoard()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ title: '', content: '' })

  const handleSubmit = async () => {
    if (!draft.title.trim() || !hasLexicalContent(draft.content)) return
    const board = await createBoard.mutateAsync({ code, body: draft })
    onDone()
    navigate({ to: `/boards/${code}/${board.id}` })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-border-soft px-6 py-4">
        <p className="text-base font-black text-text-primary">새 게시글 작성</p>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-surface-border px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:bg-surface-muted"
        >
          취소
        </button>
      </div>
      <div className="flex flex-col gap-3 p-6">
        <Input
          value={draft.title}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          placeholder="제목을 입력하세요"
          autoFocus
        />
        <div className="overflow-hidden rounded-md border border-surface-border-soft">
          <LexicalEditor
            initialState={draft.content}
            onChange={(content) => setDraft((p) => ({ ...p, content }))}
            placeholder="내용을 입력하세요."
            minHeight="260px"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={createBoard.isPending || !draft.title.trim() || !hasLexicalContent(draft.content)}
          >
            {createBoard.isPending ? '등록 중…' : '등록하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

function BoardListContent({ code }: { code: string }) {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showWrite, setShowWrite] = useState(false)
  const filters = useMemo(() => ({ page: 1, pageSize: 30, q }), [q])
  const boardsQuery = useBoards(code, filters)
  const data = boardsQuery.data
  const items = data?.items ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6 lg:px-8 xl:px-10">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
            onClick={() => navigate({ to: '/boards' })}
          >
            <ArrowLeft className="size-3.5" />
            게시판
          </button>
          <h1 className="text-2xl font-black text-text-primary">
            {data?.config.name ?? '게시판'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {data?.config.description ?? '게시글을 확인합니다.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 text-xs text-text-muted shadow-sm">
            <span className="font-black text-text-primary">{data?.total ?? 0}</span> posts
          </div>
          {data?.config.allowUserWrite && (
            <Button
              size="sm"
              onClick={() => {
                setShowWrite((v) => !v)
                setSelectedId(null)
              }}
            >
              <Pencil className="mr-1.5 size-3.5" />
              {showWrite ? '닫기' : '글쓰기'}
            </Button>
          )}
        </div>
      </div>

      {/* 스플릿 뷰 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(360px,0.4fr)_minmax(0,0.6fr)]" style={{ minHeight: 640 }}>
        {/* 왼쪽: 목록 */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
          {/* 검색 */}
          <div className="border-b border-surface-border-soft p-3">
            <SearchField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSearch={() => setQ(input)}
              placeholder="제목 또는 내용 검색"
              wrapperClassName="h-10"
            />
          </div>

          {/* 컬럼 헤더 */}
          <div className="flex items-center border-b border-surface-border-soft bg-surface-muted px-4 py-3">
              <span className="w-10 shrink-0 text-center text-[11px] font-black uppercase tracking-widest text-text-muted">
                NO.
              </span>
              <span className="flex-1 pl-3 text-[11px] font-black uppercase tracking-widest text-text-muted">
                제목
              </span>
              <span className="w-20 shrink-0 text-right text-[11px] font-black uppercase tracking-widest text-text-muted">
                날짜
              </span>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
              {boardsQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                  <p className="text-sm text-text-muted">게시글이 없습니다.</p>
                </div>
              ) : (
                <ul className="space-y-1.5 p-3">
                  {items.map((board, idx) => {
                    const active = board.id === selectedId
                    const rowNum = (data?.total ?? items.length) - idx
                    return (
                      <li key={board.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowWrite(false)
                            setSelectedId(board.id)
                          }}
                          className={[
                            'group relative flex w-full items-center overflow-hidden rounded-lg border px-3.5 py-2.5 text-left shadow-sm transition-all duration-150',
                            'before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-primary before:transition-opacity',
                            active
                              ? 'border-brand-border bg-brand-glass before:opacity-100 shadow-md'
                              : 'border-surface-border-soft bg-surface-raised before:opacity-0 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md hover:before:opacity-60',
                          ].join(' ')}
                        >
                          {/* 번호 배지 */}
                          <span className="w-10 shrink-0 text-center">
                            {board.pinned ? (
                              <span className="inline-flex items-center justify-center rounded-md border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[9px] font-black text-brand-primary">
                                공지
                              </span>
                            ) : (
                              <span
                                className={[
                                  'inline-flex size-5 items-center justify-center rounded-md text-[11px] font-black tabular-nums transition-colors',
                                  active
                                    ? 'bg-brand-primary text-surface-raised shadow-sm'
                                    : 'text-text-muted group-hover:bg-brand-glass group-hover:text-brand-primary',
                                ].join(' ')}
                              >
                                {rowNum}
                              </span>
                            )}
                          </span>

                          {/* 제목 / 작성자 */}
                          <div className="min-w-0 flex-1 pl-3">
                            <p
                              className={[
                                'truncate text-sm leading-snug',
                                active
                                  ? 'font-black text-brand-primary'
                                  : 'font-bold text-text-primary transition-colors group-hover:text-brand-primary',
                              ].join(' ')}
                            >
                              {board.title}
                            </p>
                            <p
                              className={[
                                'truncate text-[11px] leading-4 transition-colors',
                                active
                                  ? 'font-bold text-brand-primary/70'
                                  : 'text-text-muted group-hover:text-text-secondary',
                              ].join(' ')}
                            >
                              {board.authorName}
                            </p>
                          </div>

                          {/* 날짜 배지 */}
                          <span className="w-20 shrink-0 text-right">
                            <span
                              className={[
                                'inline-flex rounded-md px-2 py-0.5 text-[11px] tabular-nums transition-colors',
                                active
                                  ? 'bg-brand-primary font-black text-surface-raised shadow-sm'
                                  : 'text-text-muted group-hover:bg-brand-glass group-hover:text-brand-primary',
                              ].join(' ')}
                            >
                              {formatDate(board.createdAt).replace(/\d{4}\. /, '')}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
          </div>
        </section>

        {/* 오른쪽: 상세 / 글쓰기 */}
        <section className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised shadow-sm">
          {showWrite ? (
            <WriteForm code={code} onDone={() => setShowWrite(false)} />
          ) : selectedId ? (
            <DetailPanel
              key={selectedId}
              code={code}
              boardId={selectedId}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <EmptyDetail />
          )}
        </section>
      </div>
    </div>
  )
}

export function BoardListPage() {
  const params = useParams({ strict: false }) as { code?: string }
  const code = params.code ?? ''

  return <BoardListContent key={code} code={code} />
}
