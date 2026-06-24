export type MovementType = 'INCOME' | 'EXPENSE';
export type BudgetAlertCode = 'WARNING_80' | 'CRITICAL_100';

export interface PublicUser {
  id: string;
  email: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  amount: string;
  description: string;
  categoryId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  budget: string;
  spent: string;
  usagePercent: number;
  alert: BudgetAlertCode;
}

export interface Balance {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  currency: string;
  period: { startDate: string | null; endDate: string | null };
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  budget: string;
  spent: string;
  remaining: string;
  usagePercent: number;
  alert: BudgetAlertCode | null;
}

export interface MovementFilters {
  type?: MovementType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: 'occurredAt' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
}
