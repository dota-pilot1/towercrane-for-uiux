import { clsx } from 'clsx'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  id?: string
}

export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2',
          checked
            ? 'bg-text-primary border-transparent'
            : 'bg-background border-text-primary'
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none inline-block size-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
            checked
              ? 'translate-x-5 bg-background'
              : 'translate-x-0 bg-text-primary'
          )}
        />
      </button>
      {label && (
        <span
          className="text-sm font-medium text-text-secondary cursor-pointer select-none"
          onClick={() => onCheckedChange(!checked)}
        >
          {label}
        </span>
      )}
    </div>
  )
}
