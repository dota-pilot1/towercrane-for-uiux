import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Bot,
  Brain,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { SearchField } from '../../../shared/ui/search-field'
import { Select } from '../../../shared/ui/select'
import { LexicalEditor } from '../../../shared/ui/lexical/lexical-editor'
import { TagInput } from '../../../shared/ui/tag-input'
import type {
  KnowledgeDocumentDetail,
  KnowledgeDocumentMetadata,
  KnowledgeDocumentSummary,
  KnowledgeStatus,
} from '../../../entities/knowledge-base/model/types'
import {
  createLexicalJsonFromText,
  lexicalJsonToMarkdown,
} from '../lib/lexical-markdown'
import {
  useCreateKnowledgeDocument,
  useDeleteKnowledgeDocument,
  useKnowledgeDocument,
  useKnowledgeDocuments,
  useUpdateKnowledgeDocument,
} from '../model/use-knowledge-documents'

type AiFormState = {
  title: string
  summary: string
  contentJson: string
  contentMarkdown: string
  tags: string[]
  status: KnowledgeStatus
  aiDocType: string
  difficulty: string
  targetRole: string
  businessDomain: string
  toolNames: string[]
  hasPromptTemplate: boolean
  hasExample: boolean
  policyLevel: string
  ownerTeam: string
}

const DEFAULT_FORM: AiFormState = {
  title: '',
  summary: '',
  contentJson: createLexicalJsonFromText(''),
  contentMarkdown: '',
  tags: [],
  status: 'draft',
  aiDocType: 'usage_guide',
  difficulty: 'basic',
  targetRole: '',
  businessDomain: '',
  toolNames: [],
  hasPromptTemplate: false,
  hasExample: true,
  policyLevel: 'none',
  ownerTeam: 'AX 운영팀',
}

const STATUS_LABELS: Record<KnowledgeStatus, string> = {
  draft: '임시저장',
  published: '게시',
  archived: '보관',
}

const AI_DOC_TYPE_LABELS: Record<string, string> = {
  usage_guide: 'AI 활용 가이드',
  prompt_template: '프롬프트 템플릿',
  case_study: '적용 사례',
  policy: '보안/정책',
  rag_guide: 'AI 개발/RAG 자료',
  tool_intro: 'AI 도구 소개',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  basic: '기초',
  normal: '일반',
  advanced: '심화',
}

const POLICY_LEVEL_LABELS: Record<string, string> = {
  none: '일반',
  recommended: '권장',
  required: '필수 준수',
}

function metadataString(metadata: KnowledgeDocumentMetadata, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

function metadataBoolean(metadata: KnowledgeDocumentMetadata, key: string) {
  const value = metadata[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return false
}

function metadataStringArray(metadata: KnowledgeDocumentMetadata, key: string) {
  const value = metadata[key]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function toFormState(document: KnowledgeDocumentDetail): AiFormState {
  const contentJson =
    document.contentJson ?? createLexicalJsonFromText(document.contentMarkdown)
  return {
    title: document.title,
    summary: document.summary ?? '',
    contentJson,
    contentMarkdown: lexicalJsonToMarkdown(contentJson) || document.contentMarkdown,
    tags: document.tags,
    status: document.status,
    aiDocType: metadataString(document.metadata, 'aiDocType') || 'usage_guide',
    difficulty: metadataString(document.metadata, 'difficulty') || 'basic',
    targetRole: metadataString(document.metadata, 'targetRole'),
    businessDomain: metadataString(document.metadata, 'businessDomain'),
    toolNames: metadataStringArray(document.metadata, 'toolNames'),
    hasPromptTemplate: metadataBoolean(document.metadata, 'hasPromptTemplate'),
    hasExample: metadataBoolean(document.metadata, 'hasExample'),
    policyLevel: metadataString(document.metadata, 'policyLevel') || 'none',
    ownerTeam: metadataString(document.metadata, 'ownerTeam') || 'AX 운영팀',
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function booleanLabel(value: boolean) {
  return value ? '예' : '아니오'
}

function buildChunkPreview(form: AiFormState) {
  const docTypeLabel = AI_DOC_TYPE_LABELS[form.aiDocType] ?? form.aiDocType
  const difficultyLabel = DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty
  const policyLevelLabel = POLICY_LEVEL_LABELS[form.policyLevel] ?? form.policyLevel

  return [
    '[AI 자료]',
    `제목: ${form.title || '(제목 미입력)'}`,
    form.summary ? `요약: ${form.summary}` : '',
    form.aiDocType ? `자료 유형: ${docTypeLabel}` : '',
    form.difficulty ? `난이도: ${difficultyLabel}` : '',
    form.targetRole ? `대상 역할: ${form.targetRole}` : '',
    form.businessDomain ? `업무 영역: ${form.businessDomain}` : '',
    form.toolNames.length > 0 ? `사용 도구: ${form.toolNames.join(', ')}` : '',
    `프롬프트 템플릿 포함: ${booleanLabel(form.hasPromptTemplate)}`,
    `예시 포함: ${booleanLabel(form.hasExample)}`,
    form.policyLevel ? `정책 중요도: ${policyLevelLabel}` : '',
    form.ownerTeam ? `담당: ${form.ownerTeam}` : '',
    form.tags.length > 0 ? `태그: ${form.tags.join(', ')}` : '',
    '',
    '내용:',
    form.contentMarkdown || '(내용 미입력)',
  ]
    .filter(Boolean)
    .join('\n')
}

function statusBadgeClass(status: KnowledgeStatus) {
  if (status === 'published') return 'bg-brand-glass text-brand-primary border-brand-border'
  if (status === 'archived') return 'bg-surface-muted ui-text-muted border-surface-border-soft'
  return 'bg-surface-raised ui-text-secondary border-surface-border'
}

function getDocumentIdFromUrl() {
  return new URLSearchParams(window.location.search).get('documentId')
}

function replaceDocumentIdInUrl(documentId: string | null) {
  const url = new URL(window.location.href)
  if (documentId) {
    url.searchParams.set('documentId', documentId)
  } else {
    url.searchParams.delete('documentId')
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

type AiListItemProps = {
  document: KnowledgeDocumentSummary
  selected: boolean
  onSelect: () => void
}

function AiListItem({ document, selected, onSelect }: AiListItemProps) {
  const aiDocType = metadataString(document.metadata, 'aiDocType')
  const aiDocTypeLabel = AI_DOC_TYPE_LABELS[aiDocType] ?? aiDocType

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-3 text-left transition-all duration-200 ${
        selected
          ? 'border-brand-border bg-brand-glass shadow-xs ring-1 ring-brand-border/10'
          : 'border-surface-border-soft bg-surface-raised shadow-2xs hover:-translate-y-[1px] hover:border-brand-border/30 hover:shadow-xs hover:bg-surface-raised/90'
      }`}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold ui-text-primary">
              {document.title}
            </p>
            <span
              className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(document.status)}`}
            >
              {STATUS_LABELS[document.status]}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs ui-text-muted">
            {document.summary || '요약 없음'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] ui-text-muted">
            <span>{formatDateTime(document.updatedAt)}</span>
            {aiDocTypeLabel && (
              <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-text-secondary">
                {aiDocTypeLabel}
              </span>
            )}
            {document.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-text-secondary"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

type FieldProps = {
  label: string
  children: ReactNode
  className?: string
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium ui-text-secondary">{label}</span>
      {children}
    </label>
  )
}

export function KnowledgeAiWorkbench() {
  const [selectedId, setSelectedId] = useState<string | null>(() => getDocumentIdFromUrl())
  const [query, setQuery] = useState('')
  const [draftForm, setDraftForm] = useState<AiFormState | null>(() =>
    getDocumentIdFromUrl() ? null : DEFAULT_FORM,
  )
  const [editorRevision, setEditorRevision] = useState(0)

  const listQuery = useKnowledgeDocuments({
    channel: 'ai',
    q: query.trim() || undefined,
    page: 1,
    pageSize: 50,
  })
  const detailQuery = useKnowledgeDocument(selectedId)
  const createMutation = useCreateKnowledgeDocument()
  const updateMutation = useUpdateKnowledgeDocument()
  const deleteMutation = useDeleteKnowledgeDocument()

  const selectedDocument = detailQuery.data
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isNew = !selectedId

  const documents = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )

  const baseForm = useMemo(
    () => (selectedDocument ? toFormState(selectedDocument) : DEFAULT_FORM),
    [selectedDocument],
  )
  const form = draftForm ?? baseForm
  const savedChunkText = selectedDocument?.chunks[0]?.chunkText
  const chunkPreview = draftForm
    ? buildChunkPreview(form)
    : savedChunkText || buildChunkPreview(form)

  function updateForm<K extends keyof AiFormState>(
    key: K,
    value: AiFormState[K],
  ) {
    setDraftForm((current) => ({ ...(current ?? baseForm), [key]: value }))
  }

  function handleNew() {
    setSelectedId(null)
    setDraftForm(DEFAULT_FORM)
    setEditorRevision((revision) => revision + 1)
    replaceDocumentIdInUrl(null)
  }

  async function handleSubmit() {
    const aiDocTypeLabel = AI_DOC_TYPE_LABELS[form.aiDocType] ?? form.aiDocType
    const difficultyLabel = DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty
    const policyLevelLabel = POLICY_LEVEL_LABELS[form.policyLevel] ?? form.policyLevel
    const payload = {
      channel: 'ai' as const,
      title: form.title,
      summary: form.summary,
      contentMarkdown: form.contentMarkdown,
      contentJson: form.contentJson,
      tags: form.tags,
      status: form.status,
      visibility: 'all' as const,
      metadata: {
        aiDocType: form.aiDocType,
        aiDocTypeLabel,
        difficulty: form.difficulty,
        difficultyLabel,
        targetRole: form.targetRole,
        businessDomain: form.businessDomain,
        toolNames: form.toolNames,
        hasPromptTemplate: form.hasPromptTemplate,
        hasExample: form.hasExample,
        policyLevel: form.policyLevel,
        policyLevelLabel,
        ownerTeam: form.ownerTeam,
      },
    }

    if (isNew || !selectedId) {
      const document = await createMutation.mutateAsync(payload)
      setSelectedId(document.id)
      setDraftForm(null)
      replaceDocumentIdInUrl(document.id)
      return
    }

    await updateMutation.mutateAsync({ id: selectedId, payload })
    setDraftForm(null)
    replaceDocumentIdInUrl(selectedId)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm('AI 자료를 삭제할까요?')) return
    await deleteMutation.mutateAsync(selectedId)
    handleNew()
  }

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="ui-icon-button-brand rounded-md p-2">
            <Brain className="size-4" />
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="shrink-0 text-lg font-bold ui-text-primary">
              AI 자료 지식 채널
            </h2>
            <p className="truncate text-xs ui-text-secondary">
              AI 활용 가이드·프롬프트·정책 자료 기반 chunk 자동 생성
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            새로고침
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="mr-1.5 size-3.5" />새 AI 자료
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-muted shadow-sm">
          <div className="border-b border-surface-border bg-surface-raised px-3 py-2.5">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 내용, 도구, 태그 검색"
              wrapperClassName="h-9"
            />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {listQuery.isLoading ? (
              <p className="py-10 text-center text-sm ui-text-muted">불러오는 중...</p>
            ) : documents.length === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center">
                <AlertCircle className="size-6 ui-text-muted" />
                <p className="text-sm font-semibold ui-text-secondary">
                  등록된 AI 자료가 없습니다.
                </p>
                <p className="text-xs ui-text-muted">새 AI 자료를 눌러 첫 데이터를 넣으세요.</p>
              </div>
            ) : (
              documents.map((document) => (
                <AiListItem
                  key={document.id}
                  document={document}
                  selected={document.id === selectedId}
                  onSelect={() => {
                    setSelectedId(document.id)
                    setDraftForm(null)
                    replaceDocumentIdInUrl(document.id)
                  }}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised shadow-md">
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border bg-brand-glass px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold ui-text-primary">
                {isNew ? 'AI 자료 등록' : 'AI 자료 수정'}
              </h3>
              <p className="text-xs ui-text-muted">
                AI 활용법과 정책 자료가 챗봇 답변 근거로 저장됩니다.
              </p>
            </div>
            <span
              className={`rounded-sm border px-2 py-1 text-xs font-semibold ${statusBadgeClass(form.status)}`}
            >
              {STATUS_LABELS[form.status]}
            </span>
          </div>

          <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="제목">
                <Input
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="예: ChatGPT로 회의록 요약하기"
                />
              </Field>
              <Field label="요약">
                <Input
                  value={form.summary}
                  onChange={(event) => updateForm('summary', event.target.value)}
                  placeholder="챗봇 참고용 한 줄 요약"
                />
              </Field>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Field label="상태">
                <Select
                  value={form.status}
                  onChange={(event) =>
                    updateForm('status', event.target.value as KnowledgeStatus)
                  }
                >
                  <option value="draft">임시저장</option>
                  <option value="published">게시</option>
                  <option value="archived">보관</option>
                </Select>
              </Field>
              <Field label="자료 유형">
                <Select
                  value={form.aiDocType}
                  onChange={(event) => updateForm('aiDocType', event.target.value)}
                >
                  <option value="usage_guide">AI 활용 가이드</option>
                  <option value="prompt_template">프롬프트 템플릿</option>
                  <option value="case_study">적용 사례</option>
                  <option value="policy">보안/정책</option>
                  <option value="rag_guide">AI 개발/RAG 자료</option>
                  <option value="tool_intro">AI 도구 소개</option>
                </Select>
              </Field>
              <Field label="난이도">
                <Select
                  value={form.difficulty}
                  onChange={(event) => updateForm('difficulty', event.target.value)}
                >
                  <option value="basic">기초</option>
                  <option value="normal">일반</option>
                  <option value="advanced">심화</option>
                </Select>
              </Field>
              <Field label="정책 중요도">
                <Select
                  value={form.policyLevel}
                  onChange={(event) => updateForm('policyLevel', event.target.value)}
                >
                  <option value="none">일반</option>
                  <option value="recommended">권장</option>
                  <option value="required">필수 준수</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <Field label="대상 역할">
                <Input
                  value={form.targetRole}
                  onChange={(event) => updateForm('targetRole', event.target.value)}
                  placeholder="예: 기획자, 개발자, 운영자"
                />
              </Field>
              <Field label="업무 영역">
                <Input
                  value={form.businessDomain}
                  onChange={(event) => updateForm('businessDomain', event.target.value)}
                  placeholder="예: 문서 작성, 코드 리뷰, CS"
                />
              </Field>
              <Field label="담당">
                <Input
                  value={form.ownerTeam}
                  onChange={(event) => updateForm('ownerTeam', event.target.value)}
                  placeholder="AX 운영팀"
                />
              </Field>
            </div>

            <Field label="사용 도구">
              <TagInput
                value={form.toolNames}
                onChange={(toolNames) => updateForm('toolNames', toolNames)}
                placeholder="예: ChatGPT, Gemini, Claude, Copilot"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="프롬프트 템플릿 포함">
                <Select
                  value={String(form.hasPromptTemplate)}
                  onChange={(event) =>
                    updateForm('hasPromptTemplate', event.target.value === 'true')
                  }
                >
                  <option value="false">아니오</option>
                  <option value="true">예</option>
                </Select>
              </Field>
              <Field label="예시 포함">
                <Select
                  value={String(form.hasExample)}
                  onChange={(event) => updateForm('hasExample', event.target.value === 'true')}
                >
                  <option value="true">예</option>
                  <option value="false">아니오</option>
                </Select>
              </Field>
            </div>

            <Field label="태그">
              <TagInput
                value={form.tags}
                onChange={(tags) => updateForm('tags', tags)}
                placeholder="예: 프롬프트, 회의록, 보안, RAG"
              />
            </Field>

            <Field label="본문">
              <div className="overflow-hidden rounded-md border border-surface-border bg-surface-raised">
                <LexicalEditor
                  key={`${selectedId ?? 'new-ai'}-${selectedDocument?.updatedAt ?? 'empty'}-${editorRevision}`}
                  initialState={form.contentJson}
                  minHeight="260px"
                  placeholder="AI 활용 방법, 프롬프트 예시, 정책 기준, 적용 사례를 입력하세요..."
                  toolbarVariant="simple"
                  onChange={(contentJson) => {
                    updateForm('contentJson', contentJson)
                    updateForm('contentMarkdown', lexicalJsonToMarkdown(contentJson))
                  }}
                />
              </div>
            </Field>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs ui-text-muted">
              게시 상태인 AI 자료만 지식 검색 챗봇의 답변 근거에 포함됩니다.
            </p>
            <div className="flex justify-end gap-2">
              {!isNew && (
                <Button
                  variant="secondary"
                  tone="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  삭제
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSaving || !form.title.trim() || !form.contentMarkdown.trim()}
              >
                <Save className="mr-1.5 size-3.5" />
                저장
              </Button>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-muted shadow-sm">
          <div className="shrink-0 border-b border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-brand-primary" />
              <h3 className="text-sm font-semibold ui-text-primary">검색 chunk preview</h3>
            </div>
            <p className="text-xs ui-text-muted">
              챗봇이 AI 자료를 검색할 때 참고하는 텍스트입니다.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap rounded-md border border-surface-border-soft bg-surface-muted p-3 text-xs leading-6 ui-text-secondary">
              {chunkPreview}
            </pre>
          </div>
          <div className="shrink-0 border-t border-surface-border px-4 py-3 text-xs ui-text-muted">
            {selectedDocument ? (
              <div className="grid gap-1">
                <span>문서 ID: {selectedDocument.id}</span>
                <span>chunk 수: {selectedDocument.chunks.length}</span>
                <span>최종 수정: {formatDateTime(selectedDocument.updatedAt)}</span>
              </div>
            ) : (
              <span>저장 전에는 폼 값 기준으로 미리보기합니다.</span>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
