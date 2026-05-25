import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { knowledgeBaseApi } from '../../../entities/knowledge-base/api/knowledge-base-api'
import type {
  ListKnowledgeDocumentsParams,
  SaveKnowledgeDocumentRequest,
  UpdateKnowledgeDocumentRequest,
} from '../../../entities/knowledge-base/model/types'

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export const knowledgeBaseQueryKeys = {
  all: ['knowledge-base'] as const,
  documents: (params: ListKnowledgeDocumentsParams) =>
    [...knowledgeBaseQueryKeys.all, 'documents', params] as const,
  detail: (id: string) => [...knowledgeBaseQueryKeys.all, 'document', id] as const,
}

export function useKnowledgeDocuments(params: ListKnowledgeDocumentsParams) {
  return useQuery({
    queryKey: knowledgeBaseQueryKeys.documents(params),
    queryFn: () => knowledgeBaseApi.listDocuments(params),
  })
}

export function useKnowledgeDocument(id: string | null) {
  return useQuery({
    queryKey: id ? knowledgeBaseQueryKeys.detail(id) : [...knowledgeBaseQueryKeys.all, 'empty'],
    queryFn: () => knowledgeBaseApi.getDocument(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useCreateKnowledgeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveKnowledgeDocumentRequest) =>
      knowledgeBaseApi.createDocument(payload),
    onSuccess: (document) => {
      queryClient.setQueryData(knowledgeBaseQueryKeys.detail(document.id), document)
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
      toast.success('지식 문서가 등록되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '지식 문서 등록에 실패했습니다.')),
  })
}

export function useUpdateKnowledgeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateKnowledgeDocumentRequest
    }) => knowledgeBaseApi.updateDocument(id, payload),
    onSuccess: (document) => {
      queryClient.setQueryData(knowledgeBaseQueryKeys.detail(document.id), document)
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
      toast.success('지식 문서가 수정되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '지식 문서 수정에 실패했습니다.')),
  })
}

export function useDeleteKnowledgeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKeys.all })
      toast.success('지식 문서가 삭제되었습니다.')
    },
    onError: (error) =>
      toast.error(messageFromError(error, '지식 문서 삭제에 실패했습니다.')),
  })
}
