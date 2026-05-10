import { FileText, BarChart3, CheckSquare, Github, Figma, FileUp, Database, X } from 'lucide-react'
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_DESCRIPTIONS, type BlockType } from '../lib/block-types'

interface BlockTypeSelectorProps {
  onSelect: (type: BlockType) => void
  onCancel: () => void
}

const BLOCK_TYPES: Array<{ type: BlockType; icon: React.ReactNode }> = [
  { type: 'NOTE', icon: <FileText className="size-5" /> },
  { type: 'MMD', icon: <BarChart3 className="size-5" /> },
  { type: 'CHECKLIST', icon: <CheckSquare className="size-5" /> },
  { type: 'GITHUB', icon: <Github className="size-5" /> },
  { type: 'FIGMA', icon: <Figma className="size-5" /> },
  { type: 'FILE', icon: <FileUp className="size-5" /> },
  { type: 'DBTABLE', icon: <Database className="size-5" /> },
]

export function BlockTypeSelector({ onSelect, onCancel }: BlockTypeSelectorProps) {
  return (
    <div className="ui-panel-soft rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold ui-text-primary">블록 타입 선택</p>
        <button onClick={onCancel} className="text-surface-border hover:ui-text-secondary">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {BLOCK_TYPES.map(({ type, icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-2 rounded-md border border-surface-border bg-surface-muted p-3 transition-colors hover:border-brand-border hover:bg-brand-glass"
          >
            <span className="text-brand-primary">{icon}</span>
            <span className="text-xs font-medium ui-text-primary text-center">{BLOCK_TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
