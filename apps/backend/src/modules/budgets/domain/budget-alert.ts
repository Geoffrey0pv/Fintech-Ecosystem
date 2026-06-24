import { Money } from '../../../shared/domain/value-objects/money.vo';

export type BudgetAlertCode = 'WARNING_80' | 'CRITICAL_100';

export interface BudgetEvaluation {
  budget: string;
  spent: string;
  remaining: string;
  usagePercent: number;
  alert: BudgetAlertCode | null;
}

/**
 * Critical business rule (Module 3):
 *   - spent >= 100% of budget -> CRITICAL_100
 *   - spent >=  80% of budget -> WARNING_80
 *   - otherwise               -> null
 * Thresholds are evaluated on exact decimals (no rounding). `usagePercent` is a
 * 2-decimal value for display only.
 */
export function evaluateBudget(spent: Money, budget: Money): BudgetEvaluation {
  let alert: BudgetAlertCode | null = null;
  if (spent.reachesPercentOf(100, budget)) {
    alert = 'CRITICAL_100';
  } else if (spent.reachesPercentOf(80, budget)) {
    alert = 'WARNING_80';
  }

  return {
    budget: budget.toString(),
    spent: spent.toString(),
    remaining: budget.subtract(spent).toString(),
    usagePercent: spent.percentageOf(budget),
    alert,
  };
}
