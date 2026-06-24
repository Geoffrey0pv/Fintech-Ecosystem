'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { Category } from '../lib/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiFetch<Category[]>('/categories')).data,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }))
        .data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
