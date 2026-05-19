import { Minus, Plus } from 'lucide-react'

interface ScoreStepperProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  onBlur?: () => void
}

export function ScoreStepper({
  value,
  min = 0,
  max = 10,
  onChange,
  onBlur,
}: ScoreStepperProps) {
  const decrement = () => {
    const next = Math.max(min, value - 1)
    onChange(next)
    onBlur?.()
  }

  const increment = () => {
    const next = Math.min(max, value + 1)
    onChange(next)
    onBlur?.()
  }

  return (
    <div className="flex h-7 items-center overflow-hidden rounded-md border border-surface-border-soft bg-surface-muted">
      <span className="flex h-full w-10 translate-y-px items-center justify-center border-r border-surface-border-soft text-sm font-black leading-none text-text-primary tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="flex h-full w-7 items-center justify-center border-r border-surface-border-soft text-text-muted transition-colors hover:text-brand-primary disabled:opacity-30"
      >
        <Minus className="size-3" />
      </button>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className="flex h-full w-7 items-center justify-center text-text-muted transition-colors hover:text-brand-primary disabled:opacity-30"
      >
        <Plus className="size-3" />
      </button>
    </div>
  )
}
