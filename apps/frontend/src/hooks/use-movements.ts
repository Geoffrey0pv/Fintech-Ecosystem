'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { Balance, BudgetAlert, Movement, MovementFilters, Pagination } from '../lib/types';

interface MovementListResult {
  items: Movement[];
  pagination: Pagination;
}

export function useMovements(filters: MovementFilters) {
  return useQuery({
    queryKey: ['movements', filters],
    queryFn: async (): Promise<MovementListResult> => {
      const res = await apiFetch<Movement[]>('/movements', {
        query: filters as Record<string, unknown>,
      });
      const pagination = (res.meta as { pagination: Pagination } | null)?.pagination;
      return {
        items: res.data,
        pagination: pagination ?? { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      };
    },
  });
}

export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async () => (await apiFetch<Balance>('/movements/balance')).data,
  });
}

export interface CreateMovementInput {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  categoryId?: string;
  occurredAt: string;
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      const res = await apiFetch<Movement>('/movements', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const alerts = (res.meta as { budgetAlerts: BudgetAlert[] } | null)?.budgetAlerts ?? [];
      return { movement: res.data, alerts };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['movements'] });
      void qc.invalidateQueries({ queryKey: ['balance'] });
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/movements/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['movements'] });
      void qc.invalidateQueries({ queryKey: ['balance'] });
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
