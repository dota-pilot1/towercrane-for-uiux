import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'ui-input w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/20',
        className,
      )}
      {...props}
    />
  )
}
