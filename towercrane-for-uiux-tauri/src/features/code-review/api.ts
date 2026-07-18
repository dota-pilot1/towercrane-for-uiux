import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../shared/ui/Toast";
import { apiRequest } from "../api-doc/http";
import type {
  AnalyzeCodeReviewPayload,
  CodeReviewDocument,
  CodeReviewDetail,
  CodeReviewListParams,
  CodeReviewListResponse,
  CreateManualCodeReviewPayload,
} from "./types";

export const codeReviewQueryKeys = {
  all: ["code-reviews"] as const,
  lists: () => ["code-reviews", "list"] as const,
  list: (params: CodeReviewListParams) =>
    ["code-reviews", "list", params] as const,
  detail: (reviewId: string | null) =>
    ["code-reviews", "detail", reviewId ?? "none"] as const,
};

function buildListQuery(params: CodeReviewListParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set("q", params.q);
  if (params.repository) search.set("repository", params.repository);
  if (params.riskLevel) search.set("riskLevel", params.riskLevel);
  return search.toString();
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useCodeReviewList(params: CodeReviewListParams) {
  return useQuery({
    queryKey: codeReviewQueryKeys.list(params),
    queryFn: () =>
      apiRequest<CodeReviewListResponse>(
        `/code-reviews?${buildListQuery(params)}`,
      ),
  });
}

export function useCodeReviewDetail(reviewId: string | null) {
  return useQuery({
    queryKey: codeReviewQueryKeys.detail(reviewId),
    queryFn: () => apiRequest<CodeReviewDetail>(`/code-reviews/${reviewId}`),
    enabled: Boolean(reviewId),
  });
}

export function useAnalyzeCodeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnalyzeCodeReviewPayload) =>
      apiRequest<CodeReviewDetail>("/code-reviews/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewQueryKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: codeReviewQueryKeys.lists() });
      toast.success(
        detail.duplicate
          ? "이미 저장된 코드 리뷰를 열었습니다."
          : "코드 리뷰를 저장했습니다.",
      );
    },
    onError: (error) =>
      toast.error(messageFromError(error, "코드 리뷰 분석에 실패했습니다.")),
  });
}

export function useCreateManualCodeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManualCodeReviewPayload) =>
      apiRequest<CodeReviewDetail>("/code-reviews/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewQueryKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: codeReviewQueryKeys.lists() });
      toast.success("코드 리뷰 문서를 만들었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "코드 리뷰 문서 생성에 실패했습니다.")),
  });
}

export function useReplaceCodeReviewDocuments(reviewId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documents: CodeReviewDocument[]) => {
      if (!reviewId) throw new Error("reviewId required");
      return apiRequest<CodeReviewDetail>(`/code-reviews/${reviewId}/documents`, {
        method: "PUT",
        body: JSON.stringify({ documents }),
      });
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(codeReviewQueryKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: codeReviewQueryKeys.lists() });
      toast.success("리뷰 문서를 저장했습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "리뷰 문서 저장에 실패했습니다.")),
  });
}

export function useDeleteCodeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiRequest<{ success: boolean; id: string }>(`/code-reviews/${reviewId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeReviewQueryKeys.all });
      toast.success("코드 리뷰를 삭제했습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "코드 리뷰 삭제에 실패했습니다.")),
  });
}
