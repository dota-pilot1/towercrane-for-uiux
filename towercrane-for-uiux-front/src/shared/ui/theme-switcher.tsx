import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { Palette, Check } from 'lucide-react'
import { useUiStore } from '../store/ui-store'

const themes = [
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'light', color: '#ffffff', label: 'Light' },
] as const

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const themeColor = useUiStore((state) => state.themeColor)
  const setThemeColor = useUiStore((state) => state.setThemeColor)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTheme = themes.find((t) => t.id === themeColor) || themes[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex h-[34px] items-center gap-2.5 rounded-full border px-3 text-[13px] font-medium transition-all duration-300',
          isOpen 
            ? 'border-brand-border bg-brand-glass ui-text-primary shadow-[0_0_20px_rgba(15,23,42,0.06)]' 
            : 'border-[var(--surface-border)] bg-[var(--surface-muted)] ui-text-secondary hover:bg-[var(--surface-strong)]'
        )}
      >
        <div className="relative size-4 rounded-full border border-[var(--surface-border)] overflow-hidden">
          <span 
            className="absolute inset-0 transition-colors duration-500" 
            style={{ backgroundColor: activeTheme.color }} 
          />
        </div>
        <Palette className="size-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-strong)] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 z-50">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest ui-text-muted">
            Workspace Theme
          </p>
          <div className="grid gap-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setThemeColor(theme.id)
                  setIsOpen(false)
                }}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-2 text-sm transition-all duration-200',
                  themeColor === theme.id 
                    ? 'bg-brand-glass text-brand-primary' 
                    : 'ui-text-secondary hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3.5 rounded-full shadow-sm ring-1 ring-[var(--surface-border)]"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="text-[13px] font-medium">{theme.label}</span>
                </div>
                {themeColor === theme.id && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
