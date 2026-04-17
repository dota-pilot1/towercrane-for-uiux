import { useCallback, useEffect, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { type EditorState } from 'lexical'
import { editorTheme } from './theme'
import { LexicalToolbar } from './toolbar'
import { ImageNode } from './nodes/image-node'
import { DragDropImagePlugin, ImagePlugin } from './plugins/image-plugin'
import { uploadImageToS3 } from './utils/upload-image'

type LexicalEditorProps = {
  initialState?: string
  onChange: (state: string) => void
  placeholder?: string
  minHeight?: string
  readOnly?: boolean
}

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => registerCodeHighlighting(editor), [editor])
  return null
}

function EditablePlugin({ readOnly }: { readOnly: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!readOnly)
  }, [editor, readOnly])
  return null
}

function InitialContentPlugin({ initialState }: { initialState?: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (!initialState) return

    try {
      const parsed = JSON.parse(initialState)
      if (!parsed?.root) return
      const editorState = editor.parseEditorState(initialState)
      editor.setEditorState(editorState)
    } catch {
      // 유효한 Lexical JSON 아니면 그냥 빈 에디터로 시작
    }
  }, [editor, initialState])

  return null
}

export function LexicalEditor({
  initialState,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  readOnly = false,
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      onChange(JSON.stringify(editorState.toJSON()))
    },
    [onChange],
  )

  const initialConfig = {
    namespace: 'DocuNoteEditor',
    theme: editorTheme,
    editable: !readOnly,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      ImageNode,
    ],
    onError: (error: Error) => {
      console.error('Lexical error:', error)
    },
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col">
        {readOnly ? null : <LexicalToolbar onImageUpload={uploadImageToS3} />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="px-5 py-4 text-sm text-text-primary outline-none leading-relaxed"
                style={{ minHeight }}
              />
            }
            placeholder={
              readOnly ? null : (
                <div className="absolute top-4 left-5 text-sm text-text-muted pointer-events-none">
                  {placeholder}
                </div>
              )
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {readOnly ? null : <HistoryPlugin />}
        <ListPlugin />
        <LinkPlugin />
        <CodeHighlightPlugin />
        {readOnly ? null : <ImagePlugin />}
        {readOnly ? null : <DragDropImagePlugin onUpload={uploadImageToS3} />}
        <OnChangePlugin onChange={handleChange} />
        <InitialContentPlugin initialState={initialState} />
        <EditablePlugin readOnly={readOnly} />
      </div>
    </LexicalComposer>
  )
}
