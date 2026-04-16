import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/20',
        className,
      )}
      {...props}
    />
  )
}
