import { useEffect, useRef } from 'react'

type Props = {
  candidates: string[]
  activeIndex: number
  onSelect: (candidate: string) => void
  onClose: () => void
}

export function SqlAutocompletePopover({ candidates, activeIndex, onSelect, onClose }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 z-50 mb-1 max-h-52 min-w-[180px] overflow-y-auto rounded-md border border-surface-border bg-surface-raised shadow-lg"
    >
      {candidates.map((c, i) => (
        <button
          key={c}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
          className={`flex w-full items-center px-3 py-1.5 text-left font-mono text-xs font-bold transition-colors ${
            i === activeIndex
              ? 'bg-brand-glass text-brand-primary'
              : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
          }`}
        >
          {c}
        </button>
      ))}
      <div className="sticky bottom-0 border-t border-surface-border bg-surface-raised px-3 py-1 text-[10px] text-text-muted">
        Tab·↑↓ 이동 &nbsp;·&nbsp; Enter 선택 &nbsp;·&nbsp; Esc 닫기
      </div>
    </div>
  )
}
