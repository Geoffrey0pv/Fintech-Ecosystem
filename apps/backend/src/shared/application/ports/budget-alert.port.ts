import { BudgetAlertCode } from '../../../modules/budgets/domain/budget-alert';

export const BUDGET_ALERT_PROVIDER = Symbol('BUDGET_ALERT_PROVIDER');

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  budget: string;
  spent: string;
  usagePercent: number;
  alert: BudgetAlertCode;
}

/**
 * Lets the movements module request the budget alert for a category/month after
 * an expense is recorded, without depending on the budgets module internals.
 */
export interface BudgetAlertProvider {
  /** Returns an alert only when the threshold (>=80%) is crossed; otherwise null. */
  getAlertForExpense(
    userId: string,
    categoryId: string,
    occurredAt: Date,
  ): Promise<BudgetAlert | null>;
}
