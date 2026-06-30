import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamDocsApi } from '../../../entities/team-docs/api/team-docs-api'
import type {
  CreateTeamDocFileRequest,
  UpdateTeamDocNodeRequest,
} from '../../../entities/team-docs/model/types'

export const teamDocsKeys = {
  all: ['team-docs'] as const,
  tree: ['team-docs', 'tree'] as const,
  detail: (id: string | null) => ['team-docs', 'detail', id] as const,
}

export function useTeamDocTree() {
  return useQuery({
    queryKey: teamDocsKeys.tree,
    queryFn: () => teamDocsApi.tree(),
  })
}

export function useTeamDocNode(id: string | null) {
  return useQuery({
    queryKey: teamDocsKeys.detail(id),
    queryFn: () => teamDocsApi.detail(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateTeamDocFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, title }: { parentId: string | null; title: string }) =>
      teamDocsApi.createFolder(parentId, title),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree }),
  })
}

export function useCreateTeamDocDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, title }: { parentId: string | null; title: string }) =>
      teamDocsApi.createDocument(parentId, title),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree }),
  })
}

export function useCreateTeamDocFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTeamDocFileRequest) => teamDocsApi.createFile(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree }),
  })
}

export function useUpdateTeamDocNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTeamDocNodeRequest }) =>
      teamDocsApi.update(id, body),
    onSuccess: (node) => {
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree })
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.detail(node.id) })
    },
  })
}

export function useDeleteTeamDocNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamDocsApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree }),
  })
}

export function useReorderTeamDocNodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      parentId,
      items,
    }: {
      parentId: string | null
      items: { id: string; orderIdx: number }[]
    }) => teamDocsApi.reorder(parentId, items),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamDocsKeys.tree }),
  })
}
