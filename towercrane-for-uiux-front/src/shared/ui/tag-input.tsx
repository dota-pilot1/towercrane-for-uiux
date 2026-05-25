import { useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

type TagInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxTags?: number
  className?: string
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, '')
}

function splitTags(value: string) {
  return value
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean)
}

export function TagInput({
  value,
  onChange,
  placeholder = '태그 입력 후 Enter',
  maxTags = 30,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const isComposingRef = useRef(false)

  function addTags(rawValue: string) {
    const nextTags = splitTags(rawValue)
    if (nextTags.length === 0) return

    const next = [...value]
    for (const tag of nextTags) {
      if (next.length >= maxTags) break
      if (!next.includes(tag)) next.push(tag)
    }
    onChange(next)
    setDraft('')
  }

  function removeTag(tagToRemove: string) {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposingRef.current || event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTags(draft)
      return
    }

    if (event.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      event.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-surface-border bg-surface-raised px-2 py-1.5 text-sm transition focus-within:border-brand-border focus-within:ring-2 focus-within:ring-brand-border',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-6 items-center gap-1 rounded-sm border border-brand-border bg-brand-glass px-2 text-xs font-semibold text-brand-primary"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="rounded-sm p-0.5 text-brand-primary hover:bg-surface-muted"
            aria-label={`${tag} 태그 삭제`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onCompositionEnd={(event) => {
          isComposingRef.current = false
          setDraft(event.currentTarget.value)
        }}
        onBlur={(event) => {
          if (isComposingRef.current) return
          addTags(event.currentTarget.value)
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text')
          if (!text.includes(',') && !text.includes('\n')) return
          event.preventDefault()
          addTags(text)
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-36 flex-1 border-0 bg-transparent px-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>
  )
}
