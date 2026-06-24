'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { BudgetStatus } from '../lib/types';

function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function useBudgetStatus() {
  const period = currentPeriod();
  return useQuery({
    queryKey: ['budgets', 'status', period],
    queryFn: async () =>
      (await apiFetch<BudgetStatus[]>('/budgets/status', { query: period })).data,
  });
}

export interface UpsertBudgetInput {
  categoryId: string;
  amount: string;
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, amount }: UpsertBudgetInput) => {
      const period = currentPeriod();
      return (
        await apiFetch<BudgetStatus>(`/categories/${categoryId}/budget`, {
          method: 'PUT',
          body: JSON.stringify({ amount, ...period }),
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
