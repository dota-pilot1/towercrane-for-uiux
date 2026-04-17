import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDeleteMyReview, useUpdateMyReview } from '../../../shared/api/reviews'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import { StarRating } from './star-rating'
import { useReviewList } from '../../../shared/api/reviews'

export function ReviewList({
  prototypeId,
  headerAction,
}: {
  prototypeId: string
  headerAction?: ReactNode
}) {
  const [page, setPage] = useState(1)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [draftRating, setDraftRating] = useState(0)
  const [draftContent, setDraftContent] = useState('')
  const pageSize = 10
  const updateMutation = useUpdateMyReview(prototypeId)
  const deleteMutation = useDeleteMyReview(prototypeId)

  const reviewsQuery = useReviewList(prototypeId, { page, pageSize })
  const items = reviewsQuery.data?.items ?? []
  const totalPages = reviewsQuery.data?.totalPages ?? 1
  const total = reviewsQuery.data?.total ?? 0

  useEffect(() => {
    if (editingReviewId && !items.some((item) => item.id === editingReviewId)) {
      setEditingReviewId(null)
      setDraftRating(0)
      setDraftContent('')
    }
  }, [editingReviewId, items])

  if (reviewsQuery.isLoading) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        리뷰 불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="text-[11px] uppercase tracking-widest text-text-muted font-semibold">
          리뷰 {total}
        </div>
        {headerAction}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-muted">
          아직 리뷰가 없습니다. 첫 리뷰를 남겨보세요.
        </div>
      ) : null}

      {items.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isEditing={editingReviewId === review.id}
          draftRating={draftRating}
          draftContent={draftContent}
          onStartEdit={() => {
            setEditingReviewId(review.id)
            setDraftRating(review.rating)
            setDraftContent(review.content)
          }}
          onCancelEdit={() => {
            setEditingReviewId(null)
            setDraftRating(0)
            setDraftContent('')
          }}
          onChangeDraftRating={setDraftRating}
          onChangeDraftContent={setDraftContent}
          onSubmitEdit={() => {
            if (draftRating < 1 || draftContent.trim().length === 0) return
            updateMutation.mutate(
              { rating: draftRating, content: draftContent.trim() },
              {
                onSuccess: () => {
                  setEditingReviewId(null)
                  setDraftRating(0)
                  setDraftContent('')
                },
              },
            )
          }}
          onDelete={() => {
            if (!window.confirm('리뷰를 삭제할까요?')) return
            deleteMutation.mutate(undefined, {
              onSuccess: () => {
                setEditingReviewId(null)
                setDraftRating(0)
                setDraftContent('')
              },
            })
          }}
          pending={updateMutation.isPending || deleteMutation.isPending}
        />
      ))}

      {items.length > 0 && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-[11px] text-text-muted">
            {page} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              size="icon"
              tone="default"
              className="size-7 rounded-lg"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              size="icon"
              tone="default"
              className="size-7 rounded-lg"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type ReviewCardProps = {
  review: {
    id: string
    userName: string
    rating: number
    content: string
    createdAt: string
    updatedAt: string
    isMine: boolean
  }
  isEditing: boolean
  draftRating: number
  draftContent: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onChangeDraftRating: (value: number) => void
  onChangeDraftContent: (value: string) => void
  onSubmitEdit: () => void
  onDelete: () => void
  pending: boolean
}

function ReviewCard({
  review,
  isEditing,
  draftRating,
  draftContent,
  onStartEdit,
  onCancelEdit,
  onChangeDraftRating,
  onChangeDraftContent,
  onSubmitEdit,
  onDelete,
  pending,
}: ReviewCardProps) {
  return (
    <div className="ui-panel rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="ui-text-primary text-sm font-medium">
            {review.userName}
          </span>
          {review.isMine ? (
            <span className="rounded bg-brand-glass px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-primary">
              나
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <StarRating
            value={isEditing ? draftRating : review.rating}
            onChange={isEditing ? onChangeDraftRating : undefined}
            readOnly={!isEditing}
            size="sm"
            showNumber
          />
          {review.isMine ? (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={onCancelEdit}
                    disabled={pending}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={onSubmitEdit}
                    disabled={pending || draftRating < 1 || draftContent.trim().length === 0}
                  >
                    {pending ? '저장 중...' : '수정'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={onStartEdit}
                  >
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7 px-2.5 text-[11px] text-rose-600 hover:bg-rose-50"
                    onClick={onDelete}
                    disabled={pending}
                  >
                    삭제
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {isEditing ? (
        <Textarea
          value={draftContent}
          onChange={(e) => onChangeDraftContent(e.target.value)}
          rows={3}
          className="min-h-[96px] rounded-lg resize-y px-3 py-2"
        />
      ) : (
        <p className="ui-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
          {review.content}
        </p>
      )}
      <div className="ui-text-muted font-mono text-[10px]">
        {new Date(review.createdAt).toLocaleDateString()}
        {review.updatedAt !== review.createdAt ? ' · 수정됨' : null}
      </div>
    </div>
  )
}
