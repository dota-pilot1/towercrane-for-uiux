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
    <div className={clsx('flex p-1 rounded-2xl bg-slate-950/40 border border-white/5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-xl',
            value === option.value
              ? 'bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
