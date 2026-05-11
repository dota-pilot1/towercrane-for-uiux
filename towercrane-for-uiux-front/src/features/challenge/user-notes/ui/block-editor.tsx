import { useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { LexicalEditor } from '../../../../shared/ui/lexical/lexical-editor'
import { Mermaid } from '../../../../shared/ui/mermaid'
import {
  type BlockType,
  type ChecklistItem,
  BLOCK_META,
  parseChecklist,
  serializeChecklist,
  parseGitHub,
  toFigmaEmbedUrl,
} from '../lib/block-types'

interface BlockEditorProps {
  blockType: BlockType
  data: string
  onBlockTypeChange: (type: BlockType) => void
  onDataChange: (data: string) => void
}

const BLOCK_TYPES: BlockType[] = ['NOTE', 'MMD', 'FIGMA', 'GITHUB', 'CHECKLIST']

export function BlockEditor({ blockType, data, onBlockTypeChange, onDataChange }: BlockEditorProps) {
  return (
    <div className="space-y-3">
      {/* 블록 타입 선택 */}
      <div className="flex flex-wrap gap-1.5">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onBlockTypeChange(type)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              blockType === type
                ? 'bg-brand-glass border border-brand-border text-brand-primary'
                : 'border border-surface-border ui-text-secondary hover:bg-surface-muted'
            }`}
          >
            <span>{BLOCK_META[type].icon}</span>
            <span>{BLOCK_META[type].label}</span>
          </button>
        ))}
      </div>

      {/* 블록 타입별 입력 영역 */}
      {blockType === 'NOTE' && (
        <NoteInput data={data} onChange={onDataChange} key="note" />
      )}
      {blockType === 'MMD' && (
        <MmdInput data={data} onChange={onDataChange} />
      )}
      {blockType === 'FIGMA' && (
        <FigmaInput data={data} onChange={onDataChange} />
      )}
      {blockType === 'GITHUB' && (
        <GitHubInput data={data} onChange={onDataChange} />
      )}
      {blockType === 'CHECKLIST' && (
        <ChecklistInput data={data} onChange={onDataChange} />
      )}
    </div>
  )
}

// ─── NOTE ───────────────────────────────────────────────────────────────────

function NoteInput({ data, onChange }: { data: string; onChange: (v: string) => void }) {
  return (
    <div
      className="border border-surface-border rounded-md overflow-auto resize-y"
      style={{ minHeight: '200px' }}
    >
      <LexicalEditor
        initialState={data || undefined}
        onChange={onChange}
        placeholder="내용을 입력하세요..."
        minHeight="160px"
      />
    </div>
  )
}

// ─── MMD ────────────────────────────────────────────────────────────────────

function MmdInput({ data, onChange }: { data: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <p className="text-[10px] ui-text-muted font-medium uppercase tracking-wide">코드</p>
        <textarea
          value={data}
          onChange={(e) => onChange(e.target.value)}
          placeholder={BLOCK_META.MMD.placeholder}
          className="ui-input w-full min-h-[200px] font-mono text-xs resize-y"
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] ui-text-muted font-medium uppercase tracking-wide">미리보기</p>
        <div className="border border-surface-border rounded-md p-3 min-h-[200px] bg-surface-muted overflow-auto">
          {data.trim() ? <Mermaid chart={data} /> : (
            <p className="text-xs ui-text-muted text-center pt-8">코드를 입력하면 여기에 미리보기가 표시됩니다</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FIGMA ──────────────────────────────────────────────────────────────────

function FigmaInput({ data, onChange }: { data: string; onChange: (v: string) => void }) {
  const embedUrl = toFigmaEmbedUrl(data)

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={data}
        onChange={(e) => onChange(e.target.value)}
        placeholder={BLOCK_META.FIGMA.placeholder}
        className="ui-input w-full text-sm"
      />
      {embedUrl && (
        <div className="rounded-md overflow-hidden border border-surface-border">
          <iframe
            src={embedUrl}
            className="w-full"
            style={{ height: 360 }}
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}

// ─── GITHUB ─────────────────────────────────────────────────────────────────

function GitHubInput({ data, onChange }: { data: string; onChange: (v: string) => void }) {
  const gh = parseGitHub(data)

  const update = (patch: Partial<typeof gh>) => {
    onChange(JSON.stringify({ ...gh, ...patch }))
  }

  return (
    <div className="space-y-2">
      <input
        type="url"
        value={gh.url}
        onChange={(e) => update({ url: e.target.value })}
        placeholder={BLOCK_META.GITHUB.placeholder}
        className="ui-input w-full text-sm"
      />
      <input
        type="text"
        value={gh.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="제목 (선택)"
        className="ui-input w-full text-sm"
      />
      <textarea
        value={gh.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="설명 (선택)"
        className="ui-input w-full text-sm min-h-[80px] resize-none"
      />
    </div>
  )
}

// ─── CHECKLIST ──────────────────────────────────────────────────────────────

function ChecklistInput({ data, onChange }: { data: string; onChange: (v: string) => void }) {
  const items = parseChecklist(data)
  const [draft, setDraft] = useState('')

  const emit = (next: ChecklistItem[]) => onChange(serializeChecklist(next))

  const addItem = () => {
    if (!draft.trim()) return
    emit([...items, { id: crypto.randomUUID(), text: draft.trim(), checked: false }])
    setDraft('')
  }

  const removeItem = (id: string) => emit(items.filter((i) => i.id !== id))

  const updateText = (id: string, text: string) =>
    emit(items.map((i) => (i.id === id ? { ...i, text } : i)))

  const toggleItem = (id: string) =>
    emit(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggleItem(item.id)}
            className="shrink-0 size-4 rounded accent-brand-primary"
          />
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateText(item.id, e.target.value)}
            className={`flex-1 bg-transparent text-sm ui-text-primary outline-none border-b border-surface-border focus:border-brand-border pb-0.5 ${
              item.checked ? 'line-through ui-text-muted' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="shrink-0 p-0.5 rounded hover:bg-surface-border transition-colors"
          >
            <Trash2 className="size-3 text-red-400" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={BLOCK_META.CHECKLIST.placeholder}
          className="flex-1 bg-transparent text-sm ui-text-secondary outline-none border-b border-surface-border focus:border-brand-border pb-0.5"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="shrink-0 p-0.5 rounded hover:bg-surface-border transition-colors disabled:opacity-30"
        >
          <Plus className="size-3.5 ui-text-muted" />
        </button>
      </div>
    </div>
  )
}
