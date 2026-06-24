import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../../shared/domain/value-objects/money.vo';
import {
  BudgetAlert,
  BudgetAlertProvider,
} from '../../../shared/application/ports/budget-alert.port';
import { CategoriesService } from '../../categories/application/categories.service';
import { BudgetAlertCode, evaluateBudget } from '../domain/budget-alert';
import { BudgetStatusQueryDto } from './dto/budget-status-query.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import {
  BUDGET_REPOSITORY,
  BudgetRepositoryPort,
  BudgetStatusRow,
} from './ports/budget.repository.port';

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  budget: string;
  spent: string;
  remaining: string;
  usagePercent: number;
  alert: BudgetAlertCode | null;
}

@Injectable()
export class BudgetsService implements BudgetAlertProvider {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly repo: BudgetRepositoryPort,
    private readonly categories: CategoriesService,
  ) {}

  async upsert(userId: string, categoryId: string, dto: UpsertBudgetDto): Promise<BudgetStatus> {
    await this.categories.assertOwnership(userId, categoryId);
    await this.repo.upsert({
      userId,
      categoryId,
      amount: Money.fromString(dto.amount).toString(),
      year: dto.year,
      month: dto.month,
    });
    const row = await this.repo.categoryStatus(userId, categoryId, dto.year, dto.month);
    // Row is guaranteed to exist since ownership was asserted and budget upserted.
    return this.toStatus(row as BudgetStatusRow);
  }

  async getCategoryStatus(
    userId: string,
    categoryId: string,
    query: BudgetStatusQueryDto,
  ): Promise<BudgetStatus> {
    await this.categories.assertOwnership(userId, categoryId);
    const { year, month } = this.resolvePeriod(query);
    const row = await this.repo.categoryStatus(userId, categoryId, year, month);
    return this.toStatus(row as BudgetStatusRow);
  }

  async getMonthlyStatus(userId: string, query: BudgetStatusQueryDto): Promise<BudgetStatus[]> {
    const { year, month } = this.resolvePeriod(query);
    const rows = await this.repo.monthlyStatus(userId, year, month);
    return rows.map((r) => this.toStatus(r));
  }

  /** BudgetAlertProvider: used by the movements module after an expense. */
  async getAlertForExpense(
    userId: string,
    categoryId: string,
    occurredAt: Date,
  ): Promise<BudgetAlert | null> {
    const year = occurredAt.getUTCFullYear();
    const month = occurredAt.getUTCMonth() + 1;
    const row = await this.repo.categoryStatus(userId, categoryId, year, month);
    if (!row || row.budget === null) {
      return null;
    }
    const status = this.toStatus(row);
    if (status.alert === null) {
      return null;
    }
    return {
      categoryId: status.categoryId,
      categoryName: status.categoryName,
      budget: status.budget,
      spent: status.spent,
      usagePercent: status.usagePercent,
      alert: status.alert,
    };
  }

  private resolvePeriod(query: BudgetStatusQueryDto): { year: number; month: number } {
    const now = new Date();
    return {
      year: query.year ?? now.getUTCFullYear(),
      month: query.month ?? now.getUTCMonth() + 1,
    };
  }

  private toStatus(row: BudgetStatusRow): BudgetStatus {
    const budget = Money.fromString(row.budget ?? '0');
    const spent = Money.fromString(row.spent);
    const evaluation = evaluateBudget(spent, budget);
    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      budget: evaluation.budget,
      spent: evaluation.spent,
      remaining: evaluation.remaining,
      usagePercent: evaluation.usagePercent,
      alert: evaluation.alert,
    };
  }
}
