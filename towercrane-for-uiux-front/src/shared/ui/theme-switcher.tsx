import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { Palette, Check } from 'lucide-react'
import { useUiStore } from '../store/ui-store'
import { HeaderPill } from './header-pill'

const themes = [
  { id: 'light', color: '#7dd3fc', label: 'Light' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
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
      <HeaderPill
        onClick={() => setIsOpen(!isOpen)}
        variant={isOpen ? 'active' : 'default'}
        className={clsx(
          'gap-2.5',
          isOpen && 'shadow-[0_0_20px_rgba(15,23,42,0.06)]',
        )}
      >
        <div className="relative size-4 rounded-full border border-border overflow-hidden">
          <span
            className="absolute inset-0 transition-colors duration-500"
            style={{ backgroundColor: activeTheme.color }}
          />
        </div>
        <Palette className="size-3.5" />
      </HeaderPill>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-md border border-surface-border bg-surface-raised p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-[60]">
          <p className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Appearance
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
                  'flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-300',
                  themeColor === theme.id 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/5' 
                    : 'text-muted-foreground hover:bg-surface-muted hover:ui-text-primary hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-4 rounded-full shadow-inner ring-2 ring-white/10"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="text-[13px] font-semibold">{theme.label}</span>
                </div>
                {themeColor === theme.id && <Check className="size-4 font-black" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
