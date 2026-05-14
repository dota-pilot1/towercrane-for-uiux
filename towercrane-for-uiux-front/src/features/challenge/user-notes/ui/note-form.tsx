import { useState } from 'react'
import { type BlockType, serializeBlock } from '../lib/block-types'
import { BlockEditor } from './block-editor'
import { cn } from '../../../../shared/lib/utils'

interface NoteFormProps {
  onSubmit: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => void
  onCancel: () => void
  loading?: boolean
  initialTitle?: string
  initialContent?: string
  initialBlockType?: BlockType
  surface?: 'panel' | 'plain'
}

export function NoteForm({
  onSubmit,
  onCancel,
  loading = false,
  initialTitle = '',
  initialContent = '',
  initialBlockType = 'NOTE',
  surface = 'panel',
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [blockType, setBlockType] = useState<BlockType>(initialBlockType)
  const [blockData, setBlockData] = useState(initialContent)

  const handleBlockTypeChange = (type: BlockType) => {
    setBlockType(type)
    setBlockData('')
  }

  const handleSubmit = () => {
    const content = serializeBlock({ blockType, data: blockData })
    onSubmit({ title: title || undefined, content, visibility: 'private', pinned: false })
  }

  const isEmpty = !blockData.trim() || blockData === '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md',
        surface === 'panel' ? 'ui-panel-soft space-y-3 p-4' : 'space-y-4 bg-transparent',
      )}
    >
      <input
        type="text"
        placeholder="제목 (선택)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="ui-input text-sm"
      />

      <div className="flex-1 min-h-0">
        <BlockEditor
          blockType={blockType}
          data={blockData}
          onBlockTypeChange={handleBlockTypeChange}
          onDataChange={setBlockData}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 rounded-md border border-surface-border-soft bg-surface-muted/60 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex h-9 min-w-16 items-center justify-center rounded-md border border-surface-border bg-surface-raised px-3 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || isEmpty}
          className="inline-flex h-9 min-w-16 items-center justify-center rounded-md border border-brand-border bg-brand-primary px-3 text-xs font-bold text-text-on-brand shadow-sm transition-colors hover:brightness-110 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
