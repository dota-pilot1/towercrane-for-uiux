export type KnowledgeChannel = 'notice' | 'faq' | 'ai' | 'dev'
export type KnowledgeStatus = 'draft' | 'published' | 'archived'
export type KnowledgeVisibility = 'all' | 'department' | 'role'

export type KnowledgeDocumentMetadata = Record<string, unknown>

export type KnowledgeDocumentSummary = {
  id: string
  channel: KnowledgeChannel
  channelLabel: string
  title: string
  summary: string | null
  tags: string[]
  status: KnowledgeStatus
  visibility: KnowledgeVisibility
  ownerId: string
  ownerName: string
  effectiveFrom: string | null
  effectiveTo: string | null
  metadata: KnowledgeDocumentMetadata
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export type KnowledgeChunk = {
  id: string
  documentId: string
  channel: KnowledgeChannel
  chunkIndex: number
  headingPath: string
  chunkText: string
  tokenEstimate: number
  metadata: KnowledgeDocumentMetadata
  createdAt: string
}

export type KnowledgeDocumentDetail = KnowledgeDocumentSummary & {
  contentMarkdown: string
  contentJson: string | null
  chunks: KnowledgeChunk[]
  canEdit: boolean
}

export type ListKnowledgeDocumentsParams = {
  channel?: KnowledgeChannel
  status?: KnowledgeStatus
  q?: string
  page?: number
  pageSize?: number
}

export type ListKnowledgeDocumentsResponse = {
  items: KnowledgeDocumentSummary[]
  total: number
  page: number
  pageSize: number
}

export type SaveKnowledgeDocumentRequest = {
  channel: KnowledgeChannel
  title: string
  summary?: string
  contentMarkdown: string
  contentJson?: string | null
  tags?: string[]
  status?: KnowledgeStatus
  visibility?: KnowledgeVisibility
  effectiveFrom?: string
  effectiveTo?: string
  metadata?: KnowledgeDocumentMetadata
}

export type UpdateKnowledgeDocumentRequest = Partial<SaveKnowledgeDocumentRequest>

export type SearchKnowledgeRequest = {
  query: string
  channels?: KnowledgeChannel[]
  limit?: number
}

export type SearchKnowledgeResponse = {
  items: Array<{
    chunkId: string
    documentId: string
    channel: KnowledgeChannel
    channelLabel: string
    chunkIndex: number
    headingPath: string
    chunkText: string
    title: string
    summary: string | null
    tags: string[]
    updatedAt: string
    score: number
    snippet: string
  }>
}
