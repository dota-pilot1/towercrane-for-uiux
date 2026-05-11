import { useState } from 'react'
import { type BlockType, serializeBlock } from '../lib/block-types'
import { BlockEditor } from './block-editor'

interface NoteFormProps {
  onSubmit: (data: { title?: string; content: string; visibility: string; pinned: boolean }) => void
  onCancel: () => void
  loading?: boolean
  initialTitle?: string
  initialContent?: string
  initialBlockType?: BlockType
}

export function NoteForm({
  onSubmit,
  onCancel,
  loading = false,
  initialTitle = '',
  initialContent = '',
  initialBlockType = 'NOTE',
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
    <div className="ui-panel-soft rounded-md p-4 space-y-3 h-full flex flex-col">
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

      <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded border border-surface-border ui-text-secondary hover:bg-surface-muted disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || isEmpty}
          className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
