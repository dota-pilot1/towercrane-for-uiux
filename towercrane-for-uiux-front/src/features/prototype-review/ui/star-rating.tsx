import { useState } from 'react'
import { Star } from 'lucide-react'

type Props = {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showNumber = false,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const displayValue = hoverValue ?? value

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="inline-flex items-center gap-0.5"
        onMouseLeave={() => setHoverValue(null)}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const filled = n <= displayValue
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onMouseEnter={readOnly ? undefined : () => setHoverValue(n)}
              onClick={readOnly ? undefined : () => onChange?.(n)}
              className={`p-0.5 rounded transition-colors ${
                readOnly ? 'cursor-default' : 'hover:scale-110'
              }`}
              aria-label={`${n}점`}
            >
              <Star
                className={`${SIZE_CLASS[size]} transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-slate-600'
                }`}
              />
            </button>
          )
        })}
      </div>
      {showNumber ? (
        <span className="text-sm text-slate-300 font-semibold tabular-nums">
          {displayValue > 0 ? displayValue.toFixed(1) : '—'}
          <span className="text-xs text-slate-500"> / 10</span>
        </span>
      ) : null}
    </div>
  )
}
