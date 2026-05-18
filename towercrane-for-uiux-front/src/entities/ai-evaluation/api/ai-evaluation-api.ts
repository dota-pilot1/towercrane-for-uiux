import { apiRequest } from '../../../shared/api/http'
import type { EvalCategory, EvalSummary, Evaluatee } from '../model/types'

export const aiEvaluationApi = {
  listEvaluatees: () =>
    apiRequest<Evaluatee[]>('/ai-evaluation/evaluatees'),

  createEvaluatee: (body: { name: string; role?: string; description?: string }) =>
    apiRequest<Evaluatee>('/ai-evaluation/evaluatees', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteEvaluatee: (id: string) =>
    apiRequest<{ ok: boolean }>(`/ai-evaluation/evaluatees/${id}`, { method: 'DELETE' }),

  getItems: (evaluateeId: string) =>
    apiRequest<EvalCategory[]>(`/ai-evaluation/evaluatees/${evaluateeId}/items`),

  createItem: (
    evaluateeId: string,
    body: { categoryId: string; title: string; description?: string },
  ) =>
    apiRequest(`/ai-evaluation/evaluatees/${evaluateeId}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteItem: (itemId: string) =>
    apiRequest<{ ok: boolean }>(`/ai-evaluation/items/${itemId}`, { method: 'DELETE' }),

  upsertScore: (itemId: string, body: { score: number; note?: string }) =>
    apiRequest(`/ai-evaluation/items/${itemId}/score`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getSummary: (evaluateeId: string) =>
    apiRequest<EvalSummary>(`/ai-evaluation/evaluatees/${evaluateeId}/summary`),
}
