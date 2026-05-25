import { useRef, useMemo, useEffect, useState } from 'react'
import { Paperclip, X, FileText, File, Send, HelpCircle, Bell, Code2, Sparkles } from 'lucide-react'

const RAG_SAMPLE_TABS = [
  {
    key: 'notice',
    label: '공지사항',
    Icon: Bell,
    questions: [
      'AX 플랫폼 설명회 일정이 언제야?',
      '챗봇 지식검색 파일럿 어떻게 사용해?',
      'AX 플랫폼 정기 점검 일정 알려줘',
      '프롬프트 보안 가이드 내용이 뭐야?',
      'AI 서비스 신청 프로세스 어떻게 바뀌었어?',
    ],
  },
  {
    key: 'faq',
    label: 'FAQ',
    Icon: HelpCircle,
    questions: [
      'AI 서비스는 어떻게 신청하나요?',
      '프롬프트에 고객 정보를 입력해도 되나요?',
      '계정 권한은 누가 승인하나요?',
      '챗봇 답변이 사내 지식과 다를 때는 어떻게 하나요?',
      '지식 문서는 누가 등록할 수 있나요?',
    ],
  },
  {
    key: 'dev',
    label: '개발 자료',
    Icon: Code2,
    questions: [
      '프론트엔드 저장소 구조와 로컬 실행 방법 알려줘',
      '백엔드 API 서버 실행 방법이 뭐야?',
      '디자인 시스템 토큰과 Tailwind 사용 규칙이 뭐야?',
      '지식검색 챗봇 chunk 검색 구조 설명해줘',
      '프론트와 백엔드 API 연동 및 인증 헤더 방법 알려줘',
    ],
  },
  {
    key: 'ai',
    label: 'AI 자료',
    Icon: Sparkles,
    questions: [
      'ChatGPT로 회의록 요약하는 방법 알려줘',
      '코드 리뷰 요청할 때 쓸 프롬프트 템플릿 뭐야?',
      '개인정보를 AI에 입력하면 안 되는 이유가 뭐야?',
    ],
  },
] as const

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  disabled: boolean
  attachedFiles: File[]
  onFilesChange: (files: File[]) => void
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/')
  const objUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(objUrl), [objUrl])

  return (
    <div className="relative group shrink-0">
      {isImage ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-surface-border bg-surface-muted">
          <img src={objUrl} className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-0.5 right-0.5 size-4 rounded-full bg-surface-strong/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-brand-primary"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-surface-border bg-surface-muted max-w-[130px]">
          {file.type === 'application/pdf'
            ? <FileText className="size-3.5 text-text-muted shrink-0" />
            : <File className="size-3.5 text-text-muted shrink-0" />
          }
          <span className="text-xs text-text-secondary truncate">{file.name}</span>
          <button
            onClick={onRemove}
            className="ml-auto text-text-muted hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}

const MAX_SIZE_MB = 20

export function ChatInputWithFiles({
  value, onChange, onSend, onKeyDown, disabled,
  attachedFiles, onFilesChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  function filterAndMerge(incoming: File[]) {
    const valid = incoming.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024)
    onFilesChange([...attachedFiles, ...valid].slice(0, 5))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    filterAndMerge(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files)
    if (files.length === 0) return
    e.preventDefault()
    filterAndMerge(files)
  }

  return (
    <div className="rounded-lg border border-surface-border-soft bg-surface-muted focus-within:border-brand-border focus-within:ring-2 focus-within:ring-brand-border/10 transition-all">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* 첨부 파일 미리보기 */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2.5">
          {attachedFiles.map((f, i) => (
            <FilePreview
              key={i}
              file={f}
              onRemove={() => onFilesChange(attachedFiles.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* 텍스트 입력 */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈, Ctrl+V로 파일 붙여넣기)"
        rows={3}
        className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed outline-none ui-text-primary placeholder:text-text-muted"
      />

      {/* 하단 툴바 */}
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-text-muted hover:text-brand-primary hover:bg-surface-raised transition-colors"
            title="파일 첨부 (최대 5개, 10MB)"
          >
            <Paperclip className="size-4" />
          </button>
          <button
            onClick={() => setShowSuggestions(true)}
            className="rounded-lg p-2 text-text-muted hover:text-brand-primary hover:bg-surface-raised transition-colors"
            title="RAG 테스트 샘플 질문"
          >
            <HelpCircle className="size-4" />
          </button>
        </div>

        <button
          onClick={onSend}
          disabled={disabled}
          className="ui-icon-button-brand flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          <Send className="size-3.5" />
          <span>전송</span>
        </button>
      </div>

      {/* 샘플 질문 다이어로그 */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowSuggestions(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-surface-border bg-surface-raised shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold ui-text-primary">RAG 테스트 샘플 질문</p>
                <p className="text-xs ui-text-muted">클릭하면 입력창에 바로 채워집니다</p>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="rounded-md p-1 text-text-muted hover:text-brand-primary hover:bg-surface-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-surface-border px-2 pt-1 gap-0.5">
              {RAG_SAMPLE_TABS.map((tab, i) => {
                const TabIcon = tab.Icon
                const isActive = activeTab === i
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors ${
                      isActive
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <TabIcon className="size-3.5 shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* 질문 목록 */}
            <ul className="p-2">
              {RAG_SAMPLE_TABS[activeTab].questions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(q)
                      setShowSuggestions(false)
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm ui-text-primary hover:bg-brand-glass hover:text-brand-primary transition-colors"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
