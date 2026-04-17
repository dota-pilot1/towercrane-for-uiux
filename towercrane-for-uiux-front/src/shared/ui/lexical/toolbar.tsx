import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  $createParagraphNode,
  type TextFormatType,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { $createCodeNode } from '@lexical/code'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from 'lucide-react'
import { useRef } from 'react'
import { INSERT_IMAGE_COMMAND } from './plugins/image-plugin'

type Props = {
  className?: string
  onImageUpload?: (file: File) => Promise<string>
}

export function LexicalToolbar({ className, onImageUpload }: Props) {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setActiveFormats({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
      })
    }
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar)
        return false
      },
      1,
    )
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload)
        return false
      },
      1,
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload)
        return false
      },
      1,
    )
  }, [editor])

  const format = (type: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatHeading = (tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }

  const insertUnorderedList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  }

  const insertOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/5 bg-slate-950/60 ${className ?? ''}`}
    >
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} title="실행 취소">
        <Undo className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} title="다시 실행">
        <Redo className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => format('bold')} active={activeFormats.bold} title="Bold (⌘B)">
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('italic')} active={activeFormats.italic} title="Italic (⌘I)">
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('underline')} active={activeFormats.underline} title="Underline (⌘U)">
        <Underline className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('strikethrough')} active={activeFormats.strikethrough} title="Strikethrough">
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('code')} active={activeFormats.code} title="Inline code">
        <Code className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={formatParagraph} title="본문">
        <span className="text-[11px] font-semibold px-1">P</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h1')} title="Heading 1">
        <Heading1 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h2')} title="Heading 2">
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h3')} title="Heading 3">
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={insertUnorderedList} title="Bulleted list">
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={insertOrderedList} title="Numbered list">
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatQuote} title="인용">
        <Quote className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatCodeBlock} title="Code block">
        <span className="text-[10px] font-mono font-semibold px-1">{'{ }'}</span>
      </ToolbarButton>

      {onImageUpload ? (
        <>
          <Divider />
          <ImageInsertButton onUpload={onImageUpload} />
        </>
      ) : null}
    </div>
  )
}

function ImageInsertButton({ onUpload }: { onUpload: (file: File) => Promise<string> }) {
  const [editor] = useLexicalComposerContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하만 업로드 가능합니다.')
      return
    }

    try {
      const url = await onUpload(file)
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: url,
        altText: file.name,
      })
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('이미지 업로드에 실패했습니다.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="이미지 삽입">
        <ImageIcon className="size-3.5" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-w-[28px] h-7 flex items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-emerald-500/20 text-emerald-200'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
      } disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-white/10 mx-1" />
}
