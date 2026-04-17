import { useReviewList } from '../../../shared/api/reviews'
import { StarRating } from './star-rating'

export function ReviewStats({ prototypeId }: { prototypeId: string }) {
  const query = useReviewList(prototypeId, { page: 1, pageSize: 1 })
  const stats = query.data?.stats
  const avg = stats?.avgRating ?? 0
  const count = stats?.count ?? 0
  const distribution = stats?.distribution ?? {}

  const max = Math.max(1, ...Object.values(distribution))

  return (
    <div className="ui-panel rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <div className="ui-text-primary text-3xl font-bold tabular-nums">
            {avg.toFixed(1)}
            <span className="ui-text-muted text-lg font-normal"> / 10</span>
          </div>
          <div className="ui-text-muted mt-1 text-[11px] uppercase tracking-widest">
            {count} reviews
          </div>
        </div>
        <StarRating value={Math.round(avg)} readOnly size="sm" />
      </div>

      {count > 0 ? (
        <div className="space-y-1">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
            const cnt = distribution[String(rating)] ?? 0
            const ratio = (cnt / max) * 100
            return (
              <div key={rating} className="flex items-center gap-2 text-xs">
                <span className="ui-text-muted w-5 tabular-nums text-right">
                  {rating}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-border-soft)]">
                  <div
                    className="h-full bg-amber-400/80 rounded-full transition-all"
                    style={{ width: `${ratio}%` }}
                  />
                </div>
                <span className="ui-text-muted w-6 tabular-nums">{cnt}</span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
