import { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import {
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type NodeKey,
} from 'lexical'
import { $isImageNode, type ImageAlignment } from '../nodes/image-node'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

type Props = {
  src: string
  altText: string
  width: number
  height: number
  alignment: ImageAlignment
  nodeKey: NodeKey
  editable: boolean
}

/**
 * Single component for both edit and view mode image rendering.
 * When `editable=false` we skip selection/resize/toolbar registration
 * so the DOM structure is identical across modes (only interactivity changes).
 */
export function ImageComponent({
  src,
  altText,
  width,
  height,
  alignment,
  nodeKey,
  editable,
}: Props) {
  const [editor] = useLexicalComposerContext()
  const imageRef = useRef<HTMLImageElement>(null)
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)
  const [isResizing, setIsResizing] = useState(false)
  const [currentWidth, setCurrentWidth] = useState(width)
  const [currentHeight, setCurrentHeight] = useState(height)

  useEffect(() => {
    setCurrentWidth(width)
    setCurrentHeight(height)
  }, [width, height])

  // 편집 가능할 때만 커맨드 등록 (클릭 선택 / Delete / Backspace)
  useEffect(() => {
    if (!editable) return
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (imageRef.current && imageRef.current.contains(event.target as Node)) {
            if (!event.shiftKey) clearSelection()
            setSelected(true)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        () => {
          if (isSelected) {
            editor.update(() => {
              const node = $getNodeByKey(nodeKey)
              if ($isImageNode(node)) node.remove()
            })
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          if (isSelected) {
            editor.update(() => {
              const node = $getNodeByKey(nodeKey)
              if ($isImageNode(node)) node.remove()
            })
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, editable, isSelected, nodeKey, setSelected, clearSelection])

  // view 모드로 전환될 때 선택 상태 정리
  useEffect(() => {
    if (!editable && isSelected) clearSelection()
  }, [editable, isSelected, clearSelection])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!editable) return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)

      const startX = e.clientX
      const startY = e.clientY
      const startWidth = currentWidth || imageRef.current?.naturalWidth || 300
      const startHeight = currentHeight || imageRef.current?.naturalHeight || 200
      const aspectRatio = startWidth / startHeight

      let latestWidth = startWidth
      let latestHeight = startHeight

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const newWidth = Math.max(50, startWidth + deltaX)
        const newHeight = moveEvent.shiftKey
          ? Math.max(50, startHeight + (moveEvent.clientY - startY))
          : newWidth / aspectRatio

        latestWidth = Math.round(newWidth)
        latestHeight = Math.round(newHeight)
        setCurrentWidth(latestWidth)
        setCurrentHeight(latestHeight)
      }

      const onMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isImageNode(node)) {
            node.setWidthAndHeight(latestWidth, latestHeight)
          }
        })
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [editable, editor, nodeKey, currentWidth, currentHeight],
  )

  const handleAlignment = useCallback(
    (next: ImageAlignment) => {
      if (!editable) return
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) node.setAlignment(next)
      })
    },
    [editable, editor, nodeKey],
  )

  // 정렬 래퍼는 항상 동일한 구조로 렌더 (view/edit 레이아웃 일관성 보장).
  // 외곽 div가 text-align으로 inline-block 자식을 정렬한다.
  const outerStyle: React.CSSProperties = {
    textAlign: alignment,
    width: '100%',
    margin: '8px 0',
  }

  const innerStyle: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
  }
  if (alignment === 'left') {
    innerStyle.float = 'left'
    innerStyle.marginRight = '12px'
  } else if (alignment === 'right') {
    innerStyle.float = 'right'
    innerStyle.marginLeft = '12px'
  }

  const showSelectionChrome = editable && isSelected

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <img
          ref={imageRef}
          src={src}
          alt={altText}
          width={currentWidth || undefined}
          height={currentHeight || undefined}
          className={`max-w-full rounded-md ${
            showSelectionChrome ? 'ring-2 ring-emerald-400' : ''
          } ${isResizing ? 'select-none' : ''}`}
          style={{ display: 'block' }}
          draggable={false}
        />

        {showSelectionChrome ? (
          <div
            className="absolute bottom-0 right-0 size-3 bg-brand-primary cursor-se-resize rounded-tl"
            onMouseDown={handleResizeStart}
            title="드래그로 크기 조절 (Shift: 비율 무시)"
          />
        ) : null}

        {showSelectionChrome ? (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-surface-strong border border-surface-border rounded-md shadow-md px-1 py-0.5 z-10 backdrop-blur-sm">
            <AlignButton
              active={alignment === 'left'}
              onClick={() => handleAlignment('left')}
              title="왼쪽 정렬"
            >
              <AlignLeft className="size-3.5" />
            </AlignButton>
            <AlignButton
              active={alignment === 'center'}
              onClick={() => handleAlignment('center')}
              title="가운데 정렬"
            >
              <AlignCenter className="size-3.5" />
            </AlignButton>
            <AlignButton
              active={alignment === 'right'}
              onClick={() => handleAlignment('right')}
              title="오른쪽 정렬"
            >
              <AlignRight className="size-3.5" />
            </AlignButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AlignButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? 'bg-brand-glass text-brand-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
      }`}
    >
      {children}
    </button>
  )
}
