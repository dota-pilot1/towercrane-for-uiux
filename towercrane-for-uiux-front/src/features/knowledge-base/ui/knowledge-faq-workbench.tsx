import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  FileQuestion,
  HelpCircle,
  Plus,
  RefreshCw,
  Save,
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

type FaqFormState = {
  question: string
  summary: string
  answerJson: string
  answerMarkdown: string
  tags: string[]
  status: KnowledgeStatus
  category: string
  ownerTeam: string
  relatedKeywords: string
}

const DEFAULT_FORM: FaqFormState = {
  question: '',
  summary: '',
  answerJson: createLexicalJsonFromText(''),
  answerMarkdown: '',
  tags: [],
  status: 'draft',
  category: 'account',
  ownerTeam: 'AX 운영팀',
  relatedKeywords: '',
}

const STATUS_LABELS: Record<KnowledgeStatus, string> = {
  draft: '임시저장',
  published: '게시',
  archived: '보관',
}

const CATEGORY_LABELS: Record<string, string> = {
  account: '계정/권한',
  request: '서비스 신청',
  chatbot: '챗봇',
  billing: '정산/결재',
  troubleshooting: '오류 대응',
  general: '일반',
}

function metadataString(metadata: KnowledgeDocumentMetadata, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

function toFormState(document: KnowledgeDocumentDetail): FaqFormState {
  const answerJson =
    document.contentJson ?? createLexicalJsonFromText(document.contentMarkdown)
  return {
    question: document.title,
    summary: document.summary ?? '',
    answerJson,
    answerMarkdown: lexicalJsonToMarkdown(answerJson) || document.contentMarkdown,
    tags: document.tags,
    status: document.status,
    category: metadataString(document.metadata, 'category') || 'general',
    ownerTeam: metadataString(document.metadata, 'ownerTeam') || 'AX 운영팀',
    relatedKeywords: metadataString(document.metadata, 'relatedKeywords'),
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

function buildChunkPreview(form: FaqFormState) {
  const categoryLabel = CATEGORY_LABELS[form.category] ?? form.category
  return [
    '[FAQ]',
    `질문: ${form.question || '(질문 미입력)'}`,
    form.summary ? `요약: ${form.summary}` : '',
    form.category ? `카테고리: ${categoryLabel}` : '',
    form.ownerTeam ? `담당: ${form.ownerTeam}` : '',
    form.relatedKeywords ? `관련 키워드: ${form.relatedKeywords}` : '',
    form.tags.length > 0 ? `태그: ${form.tags.join(', ')}` : '',
    '',
    '답변:',
    form.answerMarkdown || '(답변 미입력)',
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

type FaqListItemProps = {
  document: KnowledgeDocumentSummary
  selected: boolean
  onSelect: () => void
}

function FaqListItem({ document, selected, onSelect }: FaqListItemProps) {
  const category = metadataString(document.metadata, 'category')
  const categoryLabel = CATEGORY_LABELS[category] ?? category
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
        <FileQuestion className="mt-0.5 size-4 shrink-0 text-brand-primary" />
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
            {categoryLabel && (
              <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-text-secondary">
                {categoryLabel}
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

export function KnowledgeFaqWorkbench() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FaqFormState>(DEFAULT_FORM)
  const [isNew, setIsNew] = useState(true)
  const [editorRevision, setEditorRevision] = useState(0)

  const listQuery = useKnowledgeDocuments({
    channel: 'faq',
    q: query.trim() || undefined,
    page: 1,
    pageSize: 50,
  })
  const detailQuery = useKnowledgeDocument(selectedId)
  const createMutation = useCreateKnowledgeDocument()
  const updateMutation = useUpdateKnowledgeDocument()
  const deleteMutation = useDeleteKnowledgeDocument()

  const selectedDocument = detailQuery.data
  const savedChunkText = selectedDocument?.chunks[0]?.chunkText
  const chunkPreview = savedChunkText || buildChunkPreview(form)
  const isSaving = createMutation.isPending || updateMutation.isPending

  const documents = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )

  useEffect(() => {
    const documentId = getDocumentIdFromUrl()
    if (!documentId) return
    setSelectedId(documentId)
    setIsNew(false)
  }, [])

  useEffect(() => {
    if (!selectedDocument) return
    setForm(toFormState(selectedDocument))
    setIsNew(false)
    setEditorRevision((revision) => revision + 1)
  }, [selectedDocument])

  function updateForm<K extends keyof FaqFormState>(
    key: K,
    value: FaqFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleNew() {
    setSelectedId(null)
    setForm(DEFAULT_FORM)
    setIsNew(true)
    setEditorRevision((revision) => revision + 1)
    replaceDocumentIdInUrl(null)
  }

  async function handleSubmit() {
    const categoryLabel = CATEGORY_LABELS[form.category] ?? form.category
    const payload = {
      channel: 'faq' as const,
      title: form.question,
      summary: form.summary,
      contentMarkdown: form.answerMarkdown,
      contentJson: form.answerJson,
      tags: form.tags,
      status: form.status,
      visibility: 'all' as const,
      metadata: {
        category: form.category,
        categoryLabel,
        ownerTeam: form.ownerTeam,
        relatedKeywords: form.relatedKeywords,
      },
    }

    if (isNew || !selectedId) {
      const document = await createMutation.mutateAsync(payload)
      setSelectedId(document.id)
      setIsNew(false)
      replaceDocumentIdInUrl(document.id)
      return
    }

    await updateMutation.mutateAsync({ id: selectedId, payload })
    replaceDocumentIdInUrl(selectedId)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm('FAQ를 삭제할까요?')) return
    await deleteMutation.mutateAsync(selectedId)
    handleNew()
  }

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="ui-icon-button-brand rounded-md p-2">
            <HelpCircle className="size-4" />
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="shrink-0 text-lg font-bold ui-text-primary">
              FAQ 지식 채널
            </h2>
            <p className="truncate text-xs ui-text-secondary">
              질문/답변 저장 후 검색용 chunk 자동 생성
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
            <Plus className="mr-1.5 size-3.5" />새 FAQ
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-muted shadow-sm">
          <div className="border-b border-surface-border bg-surface-raised px-3 py-2.5">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="질문, 답변, 태그 검색"
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
                  등록된 FAQ가 없습니다.
                </p>
                <p className="text-xs ui-text-muted">새 FAQ를 눌러 첫 데이터를 넣으세요.</p>
              </div>
            ) : (
              documents.map((document) => (
                <FaqListItem
                  key={document.id}
                  document={document}
                  selected={document.id === selectedId}
                  onSelect={() => {
                    setSelectedId(document.id)
                    setIsNew(false)
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
                {isNew ? 'FAQ 등록' : 'FAQ 수정'}
              </h3>
              <p className="text-xs ui-text-muted">질문과 답변이 원본 문서로 저장됩니다.</p>
            </div>
            <span
              className={`rounded-sm border px-2 py-1 text-xs font-semibold ${statusBadgeClass(form.status)}`}
            >
              {STATUS_LABELS[form.status]}
            </span>
          </div>

          <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="질문">
                <Input
                  value={form.question}
                  onChange={(event) => updateForm('question', event.target.value)}
                  placeholder="예: AI 서비스는 어떻게 신청하나요?"
                />
              </Field>
              <Field label="요약">
                <Input
                  value={form.summary}
                  onChange={(event) => updateForm('summary', event.target.value)}
                  placeholder="챗봇 참고용 한 줄 답변"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
              <Field label="카테고리">
                <Select
                  value={form.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                >
                  <option value="account">계정/권한</option>
                  <option value="request">서비스 신청</option>
                  <option value="chatbot">챗봇</option>
                  <option value="billing">정산/결재</option>
                  <option value="troubleshooting">오류 대응</option>
                  <option value="general">일반</option>
                </Select>
              </Field>
              <Field label="담당">
                <Input
                  value={form.ownerTeam}
                  onChange={(event) => updateForm('ownerTeam', event.target.value)}
                  placeholder="예: AX 운영팀"
                />
              </Field>
            </div>

            <Field label="키워드">
              <Input
                value={form.relatedKeywords}
                onChange={(event) => updateForm('relatedKeywords', event.target.value)}
                placeholder="예: 권한 신청, 계정 잠금, 챗봇 오류"
              />
            </Field>

            <Field label="태그">
              <TagInput
                value={form.tags}
                onChange={(tags) => updateForm('tags', tags)}
                placeholder="예: 계정, 권한, 신청"
              />
            </Field>

            <Field label="답변">
              <div className="overflow-hidden rounded-md border border-surface-border bg-surface-raised">
                <LexicalEditor
                  key={`${selectedId ?? 'new-faq'}-${editorRevision}`}
                  initialState={form.answerJson}
                  minHeight="260px"
                  placeholder="FAQ 답변을 입력하세요..."
                  toolbarVariant="simple"
                  onChange={(answerJson) => {
                    updateForm('answerJson', answerJson)
                    updateForm('answerMarkdown', lexicalJsonToMarkdown(answerJson))
                  }}
                />
              </div>
            </Field>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs ui-text-muted">
              게시 상태인 FAQ만 챗봇 검색 대상에 포함됩니다.
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
                disabled={isSaving || !form.question.trim() || !form.answerMarkdown.trim()}
              >
                <Save className="mr-1.5 size-3.5" />
                저장
              </Button>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-muted shadow-sm">
          <div className="shrink-0 border-b border-surface-border bg-surface-raised px-4 py-3">
            <h3 className="text-sm font-semibold ui-text-primary">검색 chunk preview</h3>
            <p className="text-xs ui-text-muted">
              백엔드가 GPT 없이 생성하는 검색 대상 텍스트입니다.
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
