import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../categories/application/categories.service';
import { BudgetsService } from './budgets.service';
import { BudgetRepositoryPort, BudgetStatusRow } from './ports/budget.repository.port';

class InMemoryBudgetRepo implements BudgetRepositoryPort {
  budgets = new Map<string, string>(); // key: categoryId|year|month -> amount
  spent = new Map<string, string>(); // key: categoryId -> spent
  names = new Map<string, string>(); // categoryId -> name

  async upsert(data: {
    categoryId: string;
    amount: string;
    year: number;
    month: number;
  }): Promise<void> {
    this.budgets.set(`${data.categoryId}|${data.year}|${data.month}`, data.amount);
  }
  async monthlyStatus(_userId: string, year: number, month: number): Promise<BudgetStatusRow[]> {
    return [...this.names.entries()].map(([categoryId, categoryName]) => ({
      categoryId,
      categoryName,
      budget: this.budgets.get(`${categoryId}|${year}|${month}`) ?? null,
      spent: this.spent.get(categoryId) ?? '0.00',
    }));
  }
  async categoryStatus(
    _userId: string,
    categoryId: string,
    year: number,
    month: number,
  ): Promise<BudgetStatusRow | null> {
    if (!this.names.has(categoryId)) return null;
    return {
      categoryId,
      categoryName: this.names.get(categoryId) as string,
      budget: this.budgets.get(`${categoryId}|${year}|${month}`) ?? null,
      spent: this.spent.get(categoryId) ?? '0.00',
    };
  }
}

// Minimal CategoriesService stub: only assertOwnership is used by BudgetsService.
function categoriesStub(ownedIds: Set<string>): CategoriesService {
  return {
    assertOwnership: async (_userId: string, id: string) => {
      if (!ownedIds.has(id)) throw new NotFoundException('Category not found');
      return { id, name: 'stub', createdAt: new Date().toISOString() };
    },
  } as unknown as CategoriesService;
}

describe('BudgetsService', () => {
  let repo: InMemoryBudgetRepo;
  const userId = 'user-1';
  const categoryId = 'cat-1';

  beforeEach(() => {
    repo = new InMemoryBudgetRepo();
    repo.names.set(categoryId, 'Alimentación');
  });

  it('upserts a budget after asserting category ownership and returns status', async () => {
    repo.spent.set(categoryId, '640000.00');
    const service = new BudgetsService(repo, categoriesStub(new Set([categoryId])));

    const status = await service.upsert(userId, categoryId, {
      amount: '800000',
      year: 2026,
      month: 6,
    });

    expect(status).toMatchObject({
      budget: '800000.00',
      spent: '640000.00',
      remaining: '160000.00',
      usagePercent: 80,
      alert: 'WARNING_80',
    });
  });

  it('rejects upsert on a non-owned category', async () => {
    const service = new BudgetsService(repo, categoriesStub(new Set()));
    await expect(
      service.upsert(userId, categoryId, { amount: '1000', year: 2026, month: 6 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns monthly status for all categories', async () => {
    repo.budgets.set(`${categoryId}|2026|6`, '800000.00');
    repo.spent.set(categoryId, '900000.00');
    const service = new BudgetsService(repo, categoriesStub(new Set([categoryId])));

    const list = await service.getMonthlyStatus(userId, { year: 2026, month: 6 });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ alert: 'CRITICAL_100', usagePercent: 112.5 });
  });

  describe('getAlertForExpense', () => {
    it('returns the alert when over threshold', async () => {
      repo.budgets.set(`${categoryId}|2026|6`, '800000.00');
      repo.spent.set(categoryId, '820000.00');
      const service = new BudgetsService(repo, categoriesStub(new Set([categoryId])));

      const alert = await service.getAlertForExpense(
        userId,
        categoryId,
        new Date(Date.UTC(2026, 5, 15)),
      );
      expect(alert).toMatchObject({ alert: 'CRITICAL_100', categoryName: 'Alimentación' });
    });

    it('returns null when there is no budget for the month', async () => {
      repo.spent.set(categoryId, '999999.00');
      const service = new BudgetsService(repo, categoriesStub(new Set([categoryId])));
      const alert = await service.getAlertForExpense(
        userId,
        categoryId,
        new Date(Date.UTC(2026, 5, 15)),
      );
      expect(alert).toBeNull();
    });

    it('returns null when usage is below 80%', async () => {
      repo.budgets.set(`${categoryId}|2026|6`, '800000.00');
      repo.spent.set(categoryId, '100000.00');
      const service = new BudgetsService(repo, categoriesStub(new Set([categoryId])));
      const alert = await service.getAlertForExpense(
        userId,
        categoryId,
        new Date(Date.UTC(2026, 5, 15)),
      );
      expect(alert).toBeNull();
    });
  });
});
