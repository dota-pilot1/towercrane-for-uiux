import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDocApi } from "../../../entities/api-doc/api/api-doc-api";
import type {
  ApiBlockContent,
  CreateApiDocCategoryRequest,
  CreateApiDocEndpointRequest,
  CreateApiDocTeamRequest,
  UpdateApiDocCategoryRequest,
  UpdateApiDocEndpointRequest,
  UpdateApiDocTeamRequest,
} from "../../../entities/api-doc/model/types";
import type { ApiDocImportExportFile } from "../../../entities/api-doc/model/import-export-types";

export const apiDocQueryKeys = {
  all: ["api-doc"] as const,
  teams: ["api-doc", "teams"] as const,
  categories: ["api-doc", "categories"] as const,
  teamCategories: (teamId: string | null) =>
    ["api-doc", "teams", teamId, "categories"] as const,
  endpoints: (categoryId: string | null) =>
    ["api-doc", "endpoints", categoryId] as const,
  blocks: (endpointId: string | null) =>
    ["api-doc", "blocks", endpointId] as const,
};

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useApiDocTeams() {
  return useQuery({
    queryKey: apiDocQueryKeys.teams,
    queryFn: apiDocApi.listTeams,
  });
}

export function useApiDocCategories(teamId?: string | null) {
  return useQuery({
    queryKey: teamId
      ? apiDocQueryKeys.teamCategories(teamId)
      : apiDocQueryKeys.categories,
    queryFn: () =>
      teamId
        ? apiDocApi.listTeamCategories(teamId)
        : apiDocApi.listCategories(),
    enabled: teamId !== null,
  });
}

export function useApiDocEndpoints(categoryId: string | null) {
  return useQuery({
    queryKey: apiDocQueryKeys.endpoints(categoryId),
    queryFn: () => apiDocApi.listEndpoints(categoryId as string),
    enabled: Boolean(categoryId),
  });
}

export function useApiDocBlocks(endpointId: string | null) {
  return useQuery({
    queryKey: apiDocQueryKeys.blocks(endpointId),
    queryFn: () => apiDocApi.listBlocks(endpointId as string),
    enabled: Boolean(endpointId),
  });
}

export function useExportApiDoc() {
  return useMutation({
    mutationFn: apiDocApi.exportAll,
    onError: (error) =>
      toast.error(messageFromError(error, "내보내기에 실패했습니다.")),
  });
}

export function useImportApiDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiDocImportExportFile) => apiDocApi.importAll(body),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.all });
      const workspaceText =
        result.importedWorkspaces > 0
          ? `${result.importedWorkspaces}개 워크스페이스, `
          : "";
      toast.success(
        `${workspaceText}${result.importedCollections}개 컬렉션, ${result.importedEndpoints}개 API를 가져왔습니다.`,
      );
    },
    onError: (error) =>
      toast.error(messageFromError(error, "가져오기에 실패했습니다.")),
  });
}

export function useCreateApiDocTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiDocTeamRequest) => apiDocApi.createTeam(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      toast.success("워크스페이스가 추가되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "워크스페이스 추가에 실패했습니다.")),
  });
}

export function useUpdateApiDocTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateApiDocTeamRequest }) =>
      apiDocApi.updateTeam(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      toast.success("워크스페이스가 수정되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "워크스페이스 수정에 실패했습니다.")),
  });
}

export function useDeleteApiDocTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDocApi.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.all });
      toast.success("워크스페이스가 삭제되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "워크스페이스 삭제에 실패했습니다.")),
  });
}

export function useReorderApiDocTeams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      apiDocApi.reorderTeams(items),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams }),
    onError: (error) =>
      toast.error(messageFromError(error, "순서 변경에 실패했습니다.")),
  });
}

export function useCreateApiDocCategory(teamId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiDocCategoryRequest) =>
      apiDocApi.createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: apiDocQueryKeys.teamCategories(teamId),
        });
        queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      }
      toast.success("카테고리가 추가되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "카테고리 추가에 실패했습니다.")),
  });
}

export function useUpdateApiDocCategory(teamId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateApiDocCategoryRequest;
    }) => apiDocApi.updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: apiDocQueryKeys.teamCategories(teamId),
        });
        queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      }
      toast.success("카테고리가 수정되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "카테고리 수정에 실패했습니다.")),
  });
}

export function useDeleteApiDocCategory(teamId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDocApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.all });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: apiDocQueryKeys.teamCategories(teamId),
        });
      }
      toast.success("카테고리가 삭제되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "카테고리 삭제에 실패했습니다.")),
  });
}

export function useReorderApiDocCategories(teamId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      apiDocApi.reorderCategories(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.categories });
      if (teamId) {
        queryClient.invalidateQueries({
          queryKey: apiDocQueryKeys.teamCategories(teamId),
        });
      }
    },
    onError: (error) =>
      toast.error(messageFromError(error, "순서 변경에 실패했습니다.")),
  });
}

export function useCreateApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiDocEndpointRequest) =>
      apiDocApi.createEndpoint(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiDocQueryKeys.endpoints(categoryId),
      });
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      toast.success("엔드포인트가 추가되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "엔드포인트 추가에 실패했습니다.")),
  });
}

export function useUpdateApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateApiDocEndpointRequest;
    }) => apiDocApi.updateEndpoint(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiDocQueryKeys.endpoints(categoryId),
      });
      toast.success("엔드포인트가 수정되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "엔드포인트 수정에 실패했습니다.")),
  });
}

export function useDeleteApiDocEndpoint(categoryId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDocApi.deleteEndpoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiDocQueryKeys.endpoints(categoryId),
      });
      queryClient.invalidateQueries({ queryKey: apiDocQueryKeys.teams });
      toast.success("엔드포인트가 삭제되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "엔드포인트 삭제에 실패했습니다.")),
  });
}

export function useReorderApiDocEndpoints(categoryId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; orderIdx: number }>) =>
      apiDocApi.reorderEndpoints(items),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: apiDocQueryKeys.endpoints(categoryId),
      }),
    onError: (error) =>
      toast.error(messageFromError(error, "순서 변경에 실패했습니다.")),
  });
}

export function useReplaceApiDocBlocks(endpointId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: ApiBlockContent) => {
      if (!endpointId) throw new Error("endpointId required");
      return apiDocApi.replaceBlocks(endpointId, [
        {
          blockType: "API",
          content: JSON.stringify({
            ...content,
            lastResponse: null,
          }),
        },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiDocQueryKeys.blocks(endpointId),
      });
      toast.success("요청 설정이 저장되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "요청 설정 저장에 실패했습니다.")),
  });
}
