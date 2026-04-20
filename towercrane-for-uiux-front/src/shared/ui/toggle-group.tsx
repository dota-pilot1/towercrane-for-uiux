import { clsx } from 'clsx'

type ToggleGroupOption<T> = {
  value: T
  label: string
}

type ToggleGroupProps<T> = {
  value: T
  onChange: (value: T) => void
  options: ToggleGroupOption<T>[]
  className?: string
}

export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
  className,
}: ToggleGroupProps<T>) {
  return (
    <div className={clsx('flex rounded-[10px] border border-surface-border-soft bg-surface-muted p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex-1 rounded-[8px] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200',
            value === option.value
              ? 'bg-brand-glass text-brand-primary shadow-sm border border-brand-border'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
