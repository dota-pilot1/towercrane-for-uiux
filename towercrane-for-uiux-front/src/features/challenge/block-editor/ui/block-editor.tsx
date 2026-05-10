import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { BlockCard } from './block-card'
import { BlockTypeSelector } from './block-type-selector'
import type { Block, BlockType } from '../lib/block-types'

interface BlockEditorProps {
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
  onSave: () => void
  loading?: boolean
}

export function BlockEditor({ blocks, onBlocksChange, onSave, loading = false }: BlockEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeIndex = blocks.findIndex((b) => b.id === active.id)
    const overIndex = blocks.findIndex((b) => b.id === over.id)

    if (activeIndex === -1 || overIndex === -1) return

    const newBlocks = [...blocks]
    const [moved] = newBlocks.splice(activeIndex, 1)
    newBlocks.splice(overIndex, 0, moved)

    const reordered = newBlocks.map((block, idx) => ({
      ...block,
      orderIdx: idx,
    }))

    onBlocksChange(reordered)
    onSave()
  }

  const handleAddBlock = (blockType: BlockType) => {
    const newBlock: Block = {
      id: `new-${Date.now()}`,
      blockType,
      blockTitle: null,
      content: '',
      orderIdx: blocks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onBlocksChange([...blocks, newBlock])
    setShowTypeSelector(false)
  }

  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    onBlocksChange(
      blocks.map((block) => (block.id === id ? { ...block, ...updates, updatedAt: new Date().toISOString() } : block)),
    )
  }

  const handleDeleteBlock = (id: string) => {
    const newBlocks = blocks.filter((block) => block.id !== id).map((block, idx) => ({ ...block, orderIdx: idx }))
    onBlocksChange(newBlocks)
    onSave()
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              isEditing={editingId === block.id}
              onEdit={() => setEditingId(block.id)}
              onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
              onDelete={() => handleDeleteBlock(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {showTypeSelector && (
        <BlockTypeSelector onSelect={handleAddBlock} onCancel={() => setShowTypeSelector(false)} />
      )}

      <button
        onClick={() => setShowTypeSelector(true)}
        disabled={loading || showTypeSelector}
        className="ui-panel-soft flex items-center justify-center gap-2 rounded-md py-6 transition-colors hover:bg-surface-muted disabled:opacity-50"
      >
        <Plus className="size-4 text-brand-primary" />
        <span className="text-sm ui-text-secondary">블록 추가</span>
      </button>
    </div>
  )
}
