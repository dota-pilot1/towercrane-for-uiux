import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'ui-input w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border',
          className,
        )}
        {...props}
      />
    )
  },
)
