import { LexicalEditor } from '../../../../shared/ui/lexical/lexical-editor'

export function NoteBlockEditor({
  content,
  onChange,
  readOnly = false,
}: {
  content: string
  onChange: (val: string) => void
  readOnly?: boolean
}) {
  return (
    <LexicalEditor
      initialState={content}
      onChange={onChange}
      placeholder="내용을 입력하세요..."
      minHeight="220px"
      readOnly={readOnly}
    />
  )
}
