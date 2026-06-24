export const BUDGET_REPOSITORY = Symbol('BUDGET_REPOSITORY');

export interface BudgetStatusRow {
  categoryId: string;
  categoryName: string;
  budget: string | null; // null when no budget is set for the month
  spent: string; // sum of EXPENSE movements in the month (exact decimal string)
}

export interface BudgetRepositoryPort {
  upsert(data: {
    userId: string;
    categoryId: string;
    amount: string;
    year: number;
    month: number;
  }): Promise<void>;

  /** Status (budget + spent) for every category of the user in a month. */
  monthlyStatus(userId: string, year: number, month: number): Promise<BudgetStatusRow[]>;

  /** Status for a single category, or null if the category is not the user's. */
  categoryStatus(
    userId: string,
    categoryId: string,
    year: number,
    month: number,
  ): Promise<BudgetStatusRow | null>;
}
