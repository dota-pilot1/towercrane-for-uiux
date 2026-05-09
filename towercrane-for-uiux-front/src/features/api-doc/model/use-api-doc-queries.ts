import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiDocApi } from '../../../entities/api-doc/api/api-doc-api'
import type {
  ApiBlockContent,
  CreateApiDocCategoryRequest,
  CreateApiDocEndpointRequest,
  UpdateApiDocCategoryRequest,
  UpdateApiDocEndpointRequest,
} from '../../../entities/api-doc/model/types'

export const apiDocQueryKeys = {
  all: ['api-doc'] as const,
  categories: ['api-doc', 'categories'] as const,
  endpoints: (categoryId: string | null) => ['api-doc', 'endpoints', categoryId] as const,
  blocks: (endpointId: string | null) => ['api-doc', 'blocks', endpointId] as const,
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useApiDocCategories() {
  return useQuery({
    queryKey: apiDocQueryKeys.categories,
    queryFn: apiDocApi.listCategories,
  })
}

export function useApiDocEndpoints(categoryId: string | null) {
  return useQuery({
    queryKey: apiDocQueryKeys.endpoints(categoryId),
    queryFn: () => apiDocApi.listEndpoints(categoryId as string),
    enabled: Boolean(categoryId),
  })
}

export function useApiDocBlocks(endpointId: string | null) {
  return useQuery({
    queryKey: apiDocQueryKeys.blocks(endpointId),
    queryFn: () => apiDocApi.listBlocks(endpointId as string),
    enabled: Boolean(endpointId),
  })
}

export function useCreateApiDocCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApiDocCategoryRequest) => apiDocApi.createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories })
      toast.success('카테고리가 추가되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '카테고리 추가에 실패했습니다.')),
  })
}

export function useUpdateApiDocCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateApiDocCategoryRequest }) =>
      apiDocApi.updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories })
      toast.success('카테고리가 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '카테고리 수정에 실패했습니다.')),
  })
}

export function useDeleteApiDocCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDocApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.all })
      toast.success('카테고리가 삭제되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '카테고리 삭제에 실패했습니다.')),
  })
}

export function useReorderApiDocCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      apiDocApi.reorderCategories(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories }),
    onError: (error) => toast.error(messageFromError(error, '순서 변경에 실패했습니다.')),
  })
}

export function useCreateApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApiDocEndpointRequest) => apiDocApi.createEndpoint(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.endpoints(categoryId) })
      toast.success('엔드포인트가 추가되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '엔드포인트 추가에 실패했습니다.')),
  })
}

export function useUpdateApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateApiDocEndpointRequest }) =>
      apiDocApi.updateEndpoint(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.endpoints(categoryId) })
      toast.success('엔드포인트가 수정되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '엔드포인트 수정에 실패했습니다.')),
  })
}

export function useDeleteApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDocApi.deleteEndpoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.endpoints(categoryId) })
      toast.success('엔드포인트가 삭제되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '엔드포인트 삭제에 실패했습니다.')),
  })
}

export function useReorderApiDocEndpoints(categoryId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      apiDocApi.reorderEndpoints(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.endpoints(categoryId) }),
    onError: (error) => toast.error(messageFromError(error, '순서 변경에 실패했습니다.')),
  })
}

export function useReplaceApiDocBlocks(endpointId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: ApiBlockContent) => {
      if (!endpointId) throw new Error('endpointId required')
      return apiDocApi.replaceBlocks(endpointId, [
        {
          blockType: 'API',
          content: JSON.stringify({
            ...content,
            lastResponse: null,
          }),
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.blocks(endpointId) })
      toast.success('요청 설정이 저장되었습니다.')
    },
    onError: (error) => toast.error(messageFromError(error, '요청 설정 저장에 실패했습니다.')),
  })
}

