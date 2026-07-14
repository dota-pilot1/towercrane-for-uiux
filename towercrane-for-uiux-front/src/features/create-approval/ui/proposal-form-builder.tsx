import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  type FormField,
  type FormFieldType,
} from '../../../shared/api/approval'
import { CompactSelect } from '../../../shared/ui/compact-select'

function uid() {
  try {
    return crypto.randomUUID()
  } catch {
    return `f_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}

const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: '텍스트',
  textarea: '여러 줄',
  number: '숫자',
  date: '날짜',
  select: '선택',
}

export function ProposalFormBuilder({
  fields,
  onChange,
}: {
  fields: FormField[]
  onChange: (f: FormField[]) => void
}) {
  const update = (id: string, patch: Partial<FormField>) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...fields]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  const addField = () => onChange([...fields, { id: uid(), label: '', type: 'text', value: '' }])

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-surface-border text-[12px] text-text-muted">
          "필드 추가"로 원하는 양식을 직접 구성하세요
        </div>
      )}
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="rounded-lg border border-surface-border-soft bg-surface-muted/40 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              value={f.label}
              onChange={(e) => update(f.id, { label: e.target.value })}
              placeholder="항목 이름 (예: 예산)"
              className="ui-input flex-1"
            />
            <CompactSelect
              wrapperClassName="w-28"
              value={f.type}
              onChange={(e) => {
                const type = e.target.value as FormFieldType
                update(f.id, {
                  type,
                  value: '',
                  options: type === 'select' ? (f.options ?? []) : undefined,
                })
              }}
            >
              {(Object.keys(FIELD_TYPE_LABEL) as FormFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABEL[t]}
                </option>
              ))}
            </CompactSelect>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === fields.length - 1}
              className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(f.id)}
              className="text-text-muted hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {f.type === 'select' && (
            <input
              value={(f.options ?? []).join(', ')}
              onChange={(e) =>
                update(f.id, {
                  options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="선택지 (쉼표로 구분: 예 · 아니오)"
              className="ui-input w-full"
            />
          )}

          {f.type === 'textarea' ? (
            <textarea
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
              placeholder="값 입력"
              rows={2}
              className="ui-input h-auto py-2 w-full resize-none"
            />
          ) : f.type === 'select' ? (
            <CompactSelect
              wrapperClassName="w-full"
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
            >
              <option value="">선택하세요</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </CompactSelect>
          ) : (
            <input
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              value={f.value}
              onChange={(e) => update(f.id, { value: e.target.value })}
              placeholder="값 입력"
              className="ui-input w-full"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary hover:opacity-70 transition-opacity"
      >
        <Plus className="size-3.5" /> 필드 추가
      </button>
    </div>
  )
}
