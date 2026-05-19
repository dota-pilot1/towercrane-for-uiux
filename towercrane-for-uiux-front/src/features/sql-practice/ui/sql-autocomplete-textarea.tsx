import { forwardRef, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { applyCompletion, getAllMatches } from '../lib/autocomplete-sql'
import { getCaretCoords } from '../lib/get-caret-coords'
import { SqlAutocompletePopover } from './sql-autocomplete-popover'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  keywords: readonly string[]
  tableNames?: string[]
  columnNames?: string[]
  className?: string
  placeholder?: string
  rows?: number
  spellCheck?: boolean
}

export const SqlAutocompleteTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function SqlAutocompleteTextarea(
    { value, onChange, onSubmit, keywords, tableNames = [], columnNames = [], className, placeholder, rows, spellCheck },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(forwardedRef, () => innerRef.current!, [])

    const [acCandidates, setAcCandidates] = useState<string[]>([])
    const [acIndex, setAcIndex] = useState(0)
    const [caretCoords, setCaretCoords] = useState({ top: 0, left: 0 })

    const applyCandidate = (candidate: string) => {
      const textarea = innerRef.current
      if (!textarea) return
      const { newText, newPos } = applyCompletion(value, textarea.selectionStart, candidate)
      onChange(newText)
      setAcCandidates([])
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(newPos, newPos)
      })
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        setAcCandidates([])
        onSubmit?.()
        return
      }

      if (acCandidates.length > 0) {
        if (event.key === 'Escape') { event.preventDefault(); setAcCandidates([]); return }
        if (event.key === 'ArrowDown' || event.key === 'Tab') {
          event.preventDefault()
          setAcIndex((i) => (i + 1) % acCandidates.length)
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setAcIndex((i) => (i - 1 + acCandidates.length) % acCandidates.length)
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          applyCandidate(acCandidates[acIndex])
          return
        }
        setAcCandidates([])
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const textarea = event.currentTarget
        const start = textarea.selectionStart
        const matches = getAllMatches(value, start, keywords, tableNames, columnNames)
        if (matches.length === 1) {
          const result = applyCompletion(value, start, matches[0])
          onChange(result.newText)
          requestAnimationFrame(() => {
            innerRef.current?.setSelectionRange(result.newPos, result.newPos)
          })
        } else if (matches.length > 1) {
          setCaretCoords(getCaretCoords(textarea, start))
          setAcCandidates(matches)
          setAcIndex(0)
        } else {
          const end = textarea.selectionEnd
          onChange(value.slice(0, start) + '  ' + value.slice(end))
          requestAnimationFrame(() => {
            innerRef.current?.setSelectionRange(start + 2, start + 2)
          })
        }
      }
    }

    return (
      <div className="relative">
        <textarea
          ref={innerRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
          rows={rows}
          spellCheck={spellCheck}
        />
        {acCandidates.length > 0 && (
          <div
            className="absolute z-50"
            style={{ top: caretCoords.top, left: caretCoords.left, transform: 'translateY(-100%)' }}
          >
            <SqlAutocompletePopover
              candidates={acCandidates}
              activeIndex={acIndex}
              onSelect={applyCandidate}
              onClose={() => setAcCandidates([])}
            />
          </div>
        )}
      </div>
    )
  },
)
