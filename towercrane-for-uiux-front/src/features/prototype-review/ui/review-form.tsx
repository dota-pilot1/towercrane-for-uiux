import { ChevronDown, PenSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/ui/button'
import { Textarea } from '../../../shared/ui/textarea'
import { StarRating } from './star-rating'
import { useCreateReview, useMyReview, useUpdateMyReview } from '../../../shared/api/reviews'

type Props = {
  prototypeId: string
  disabled?: boolean
  inlineTrigger?: boolean
}

export function ReviewForm({ prototypeId, disabled = false, inlineTrigger = false }: Props) {
  const myReviewQuery = useMyReview(prototypeId)
  const createMutation = useCreateReview(prototypeId)
  const updateMutation = useUpdateMyReview(prototypeId)

  const existing = myReviewQuery.data ?? null
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (existing) {
      setRating(existing.rating)
      setContent(existing.content)
      setOpen(false)
    } else {
      setRating(0)
      setContent('')
    }
  }, [existing])

  const pending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || content.trim().length === 0) return

    const payload = { rating, content: content.trim() }
    if (existing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (disabled) {
    return (
      <div className={`${inlineTrigger ? 'col-span-2' : ''} ui-panel rounded-xl p-4 text-center text-sm ui-text-secondary`}>
        로그인 후 리뷰를 작성할 수 있습니다.
      </div>
    )
  }

  // 이미 리뷰를 작성했으면 헤더 트리거 숨김 (수정/삭제는 리뷰 카드 인라인 버튼으로)
  if (existing) {
    return null
  }

  if (inlineTrigger) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={() => setOpen((prev) => !prev)}
        >
          <PenSquare className="size-3.5" />
          {open ? '작성 닫기' : '리뷰 작성'}
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>

        {open ? (
          <form
            onSubmit={handleSubmit}
            className="col-span-2 ui-panel rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="ui-text-secondary text-[11px] font-semibold uppercase tracking-widest">
                리뷰 작성
              </span>
              <StarRating value={rating} onChange={setRating} showNumber />
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="이 프로토타입에 대한 평가를 남겨주세요..."
              className="min-h-[96px] rounded-lg resize-y px-3 py-2"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-4 text-xs"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                닫기
              </Button>
              <Button
                type="submit"
                disabled={pending || rating < 1 || content.trim().length === 0}
                className="h-8 px-4 text-xs"
              >
                {pending ? '저장 중...' : '등록'}
              </Button>
            </div>
          </form>
        ) : null}
      </>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="ui-text-secondary text-[11px] font-semibold uppercase tracking-widest">
          리뷰 작성
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={() => setOpen((prev) => !prev)}
        >
          <PenSquare className="size-3.5" />
          {open ? '작성 닫기' : '리뷰 작성'}
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="ui-panel rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="ui-text-secondary text-[11px] font-semibold uppercase tracking-widest">
              리뷰 작성
            </span>
            <StarRating value={rating} onChange={setRating} showNumber />
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="이 프로토타입에 대한 평가를 남겨주세요..."
            className="min-h-[96px] rounded-lg resize-y px-3 py-2"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-4 text-xs"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              닫기
            </Button>
            <Button
              type="submit"
              disabled={pending || rating < 1 || content.trim().length === 0}
              className="h-8 px-4 text-xs"
            >
              {pending ? '저장 중...' : '등록'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
