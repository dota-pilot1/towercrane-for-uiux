import { useState } from 'react'
import { BLOCK_TYPE_LABELS } from '../lib/block-types'
import type { Block } from '../lib/block-types'

interface BlockContentEditorProps {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
}

export function BlockContentEditor({ block, onUpdate }: BlockContentEditorProps) {
  const [title, setTitle] = useState(block.blockTitle || '')
  const [content, setContent] = useState(block.content)

  const handleSave = () => {
    onUpdate({
      blockTitle: title || null,
      content,
    })
  }

  return (
    <div className="space-y-3">
      {block.blockType !== 'FILE' && (
        <input
          type="text"
          placeholder="제목 (선택)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="ui-input text-sm"
        />
      )}

      {block.blockType === 'CHECKLIST' ? (
        <textarea
          placeholder="각 항목을 한 줄씩 입력하세요&#10;- 항목 1&#10;- 항목 2"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="ui-input min-h-32 text-sm font-mono"
        />
      ) : block.blockType === 'MMD' ? (
        <textarea
          placeholder="Mermaid 다이어그램 문법"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="ui-input min-h-32 text-sm font-mono"
        />
      ) : block.blockType === 'GITHUB' ? (
        <input
          type="url"
          placeholder="GitHub URL"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="ui-input text-sm"
        />
      ) : block.blockType === 'FIGMA' ? (
        <input
          type="url"
          placeholder="Figma 공유 링크"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="ui-input text-sm"
        />
      ) : block.blockType === 'FILE' ? (
        <div className="ui-panel-soft p-3 rounded-md text-center text-xs ui-text-muted">
          파일 업로드 (추후 구현)
        </div>
      ) : (
        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="ui-input min-h-32 text-sm"
        />
      )}

      <div className="flex justify-end gap-2">
        <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded bg-brand-primary text-white hover:opacity-90">
          저장
        </button>
      </div>
    </div>
  )
}
