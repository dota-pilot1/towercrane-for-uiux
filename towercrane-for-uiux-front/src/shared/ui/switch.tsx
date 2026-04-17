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
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
          checked ? 'bg-emerald-500' : 'bg-slate-700'
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-300 cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  )
}
