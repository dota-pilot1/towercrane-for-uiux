import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest } from './http'
import { useSessionStore } from '../store/session-store'

export type DocBlockType =
  | 'NOTE'
  | 'MMD'
  | 'FIGMA'
  | 'FILE'
  | 'DBTABLE'
  | 'GITHUB'

export type DocDocumentSummary = {
  id: string
  sectionId: string
  title: string
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type DocSection = {
  id: string
  prototypeId: string
  title: string
  orderIdx: number
  createdAt: string
  updatedAt: string
  documents: DocDocumentSummary[]
}

export type DocBlock = {
  id: string
  documentId: string
  blockType: DocBlockType
  blockTitle: string | null
  content: string
  orderIdx: number
}

export type DocDocumentDetail = {
  id: string
  sectionId: string
  prototypeId: string
  title: string
  orderIdx: number
  createdAt: string
  updatedAt: string
  blocks: DocBlock[]
}

export type ReorderPayload = {
  items: { id: string; orderIdx: number }[]
}

const treeKey = (prototypeId: string) => ['docu', 'tree', prototypeId] as const
const docKey = (documentId: string) => ['docu', 'document', documentId] as const

export function useDocuTree(prototypeId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: prototypeId ? treeKey(prototypeId) : ['docu', 'tree', 'none'],
    queryFn: () =>
      apiRequest<DocSection[]>(`/docu/prototypes/${prototypeId}/tree`),
    enabled: isAuthenticated && Boolean(prototypeId),
  })
}

export function useDocuDocument(documentId: string | null) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: documentId ? docKey(documentId) : ['docu', 'document', 'none'],
    queryFn: () =>
      apiRequest<DocDocumentDetail>(`/docu/documents/${documentId}`),
    enabled: isAuthenticated && Boolean(documentId),
  })
}

export function useCreateSection(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string }) =>
      apiRequest<DocSection[]>(
        `/docu/prototypes/${prototypeId}/sections`,
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useUpdateSection(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      apiRequest<DocSection[]>(`/docu/sections/${sectionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useDeleteSection(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sectionId: string) =>
      apiRequest<DocSection[]>(`/docu/sections/${sectionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useReorderSections(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReorderPayload) =>
      apiRequest<DocSection[]>(
        `/docu/prototypes/${prototypeId}/sections/reorder`,
        { method: 'PATCH', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useCreateDocument(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      apiRequest<DocSection[]>(
        `/docu/sections/${sectionId}/documents`,
        { method: 'POST', body: JSON.stringify({ title }) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useUpdateDocument(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ documentId, title }: { documentId: string; title: string }) =>
      apiRequest<DocSection[]>(`/docu/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
      void queryClient.invalidateQueries({
        queryKey: docKey(variables.documentId),
      })
    },
  })
}

export function useDeleteDocument(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      apiRequest<DocSection[]>(`/docu/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useReorderDocuments(prototypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sectionId,
      items,
    }: {
      sectionId: string
      items: ReorderPayload['items']
    }) =>
      apiRequest<DocSection[]>(
        `/docu/sections/${sectionId}/documents/reorder`,
        { method: 'PATCH', body: JSON.stringify({ items }) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treeKey(prototypeId) })
    },
  })
}

export function useReplaceBlocks(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (blocks: {
      blockType: DocBlockType
      blockTitle?: string | null
      content: string
    }[]) =>
      apiRequest<DocDocumentDetail>(`/docu/documents/${documentId}/blocks`, {
        method: 'PUT',
        body: JSON.stringify({ blocks }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docKey(documentId) })
    },
  })
}
