import { useRef, useMemo, useEffect, useState } from 'react'
import { Paperclip, X, FileText, File, Send, HelpCircle, Bell, Code2, Sparkles, ChevronRight } from 'lucide-react'

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] transition-all"
          onClick={() => setShowSuggestions(false)}
        >
          <div
            className="glass-panel w-full max-w-[500px] rounded-2xl mx-4 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 bg-surface-strong border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold ui-text-primary flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-primary animate-pulse" />
                  <span>RAG 테스트 샘플 질문</span>
                </h3>
                <p className="text-xs ui-text-muted mt-1">클릭하면 입력창에 자동으로 채워집니다</p>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="flex size-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-muted hover:text-text-primary active:scale-95 cursor-pointer"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* 탭 (Segmented Control) */}
            <div className="px-6 py-3 bg-surface-muted border-b border-surface-border">
              <div className="bg-surface-muted/65 p-1 rounded-xl flex gap-1 border border-surface-border-soft">
                {RAG_SAMPLE_TABS.map((tab, i) => {
                  const TabIcon = tab.Icon
                  const isActive = activeTab === i
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(i)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-brand-glass text-brand-primary border-brand-border shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/40 border-transparent'
                      }`}
                    >
                      <TabIcon className={`size-3.5 shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 질문 목록 */}
            <div className="h-[420px] overflow-y-auto px-6 py-5 bg-surface-raised scrollbar-thin">
              <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
                {RAG_SAMPLE_TABS[activeTab].questions.map((q) => (
                  <li key={q} className="list-none m-0">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(q)
                        setShowSuggestions(false)
                      }}
                      className="w-full flex items-center justify-between gap-3 text-left text-sm ui-text-primary bg-surface-muted/30 border border-surface-border-soft rounded-xl px-4 py-3.5 transition-all duration-200 hover:bg-brand-glass hover:border-brand-border hover:text-brand-primary hover:shadow-sm cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-raised border border-surface-border-soft text-text-muted group-hover:bg-brand-glass group-hover:border-brand-border group-hover:text-brand-primary transition-all">
                          <HelpCircle className="size-3.5" />
                        </div>
                        <span className="truncate font-medium">{q}</span>
                      </div>
                      <ChevronRight className="size-4 text-text-muted/70 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
