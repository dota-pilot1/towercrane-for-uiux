import { Award, MessageSquare } from 'lucide-react'

interface SubmissionCardProps {
  id: string
  score: number
  maxScore: number
  content: string
  adminRating?: number
  adminFeedback?: string
  userName?: string
  isOwn?: boolean
}

export function SubmissionCard({
  id,
  score,
  maxScore,
  content,
  adminRating,
  adminFeedback,
  userName,
  isOwn = false,
}: SubmissionCardProps) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  return (
    <div className="ui-panel-soft rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs ui-text-secondary">{userName || '나'}</p>
          {adminRating !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <Award className="size-3.5 text-brand-primary" />
              <span className="text-sm font-bold text-brand-primary">{adminRating}/100</span>
            </div>
          )}
        </div>
        {maxScore > 0 && (
          <div className="text-right">
            <p className="text-xs ui-text-secondary">자동 채점</p>
            <p className={`text-lg font-bold ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
              {percentage}%
            </p>
          </div>
        )}
      </div>

      <div className="rounded-md bg-surface-muted p-3">
        <p className="text-xs ui-text-secondary whitespace-pre-wrap line-clamp-4">{content}</p>
      </div>

      {adminFeedback && (
        <div className="border-l-2 border-brand-primary pl-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="size-3.5 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs ui-text-secondary italic">{adminFeedback}</p>
          </div>
        </div>
      )}

      {maxScore > 0 && (
        <div className="pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs ui-text-secondary">점수</span>
            <span className="text-sm font-bold ui-text-primary">
              {score} / {maxScore}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-primary to-brand-primary/70 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
