import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../shared/api/http';
import type { MenuRecord } from '../model/types';

export function useMenus() {
  return useQuery({
    queryKey: ['menus'],
    queryFn: () => apiRequest<MenuRecord[]>('/menus'),
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MenuRecord>) => 
      apiRequest<MenuRecord>('/menus', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<MenuRecord>) => 
      apiRequest<MenuRecord>(`/menus/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiRequest<{ success: boolean }>(`/menus/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}
