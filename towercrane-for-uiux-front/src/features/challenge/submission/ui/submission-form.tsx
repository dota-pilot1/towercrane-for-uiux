import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

interface SubmissionFormProps {
  topicId: string
  blockType: string
  blockTitle?: string
  onSubmit: (content: string, checkedItems: string[]) => Promise<void>
  loading?: boolean
}

export function SubmissionForm({ topicId, blockType, blockTitle, onSubmit, loading = false }: SubmissionFormProps) {
  const [content, setContent] = useState('')
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    try {
      setError(null)
      await onSubmit(content, checkedItems)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '제출에 실패했습니다')
    }
  }

  if (blockType === 'CHECKLIST') {
    let items: string[] = []
    try {
      const parsed = JSON.parse(content || '[]')
      items = Array.isArray(parsed) ? parsed : []
    } catch {
      // Assume plain text with newlines
      items = content
        .split('\n')
        .map((line) => line.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean)
    }

    return (
      <div className="ui-panel-soft rounded-md p-4 space-y-4">
        <div>
          <h4 className="text-sm font-bold ui-text-primary mb-3">확인 항목</h4>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(String(idx))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCheckedItems([...checkedItems, String(idx)])
                    } else {
                      setCheckedItems(checkedItems.filter((i) => i !== String(idx)))
                    }
                  }}
                  className="size-4 rounded border border-surface-border cursor-pointer"
                />
                <span className="text-sm ui-text-secondary">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold ui-text-primary">점수</p>
            <p className="text-sm font-bold text-brand-primary">
              {checkedItems.length * 10} / {items.length * 10}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="w-full px-3 py-2 rounded bg-brand-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '제출 중...' : '제출'}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 text-red-500 text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 rounded bg-green-500/10 text-green-600 text-xs">
            <Check className="size-4 shrink-0 mt-0.5" />
            <span>제출되었습니다!</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ui-panel-soft rounded-md p-4 space-y-4">
      <div>
        <label className="text-xs font-bold ui-text-primary">풀이 내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="풀이 내용을 입력하세요"
          className="ui-input mt-2 min-h-32"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
        className="w-full px-3 py-2 rounded bg-brand-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? '제출 중...' : '제출'}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded bg-red-500/10 text-red-500 text-xs">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded bg-green-500/10 text-green-600 text-xs">
          <Check className="size-4 shrink-0 mt-0.5" />
          <span>제출되었습니다!</span>
        </div>
      )}
    </div>
  )
}
