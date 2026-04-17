import { LexicalEditor } from '../../../../shared/ui/lexical/lexical-editor'

export function NoteBlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  return (
    <LexicalEditor
      initialState={content}
      onChange={onChange}
      placeholder="내용을 입력하세요..."
      minHeight="220px"
    />
  )
}
