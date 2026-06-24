import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  BudgetRepositoryPort,
  BudgetStatusRow,
} from '../../application/ports/budget.repository.port';

@Injectable()
export class PrismaBudgetRepository implements BudgetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    userId: string;
    categoryId: string;
    amount: string;
    year: number;
    month: number;
  }): Promise<void> {
    await this.prisma.budget.upsert({
      where: {
        categoryId_year_month: {
          categoryId: data.categoryId,
          year: data.year,
          month: data.month,
        },
      },
      create: {
        userId: data.userId,
        categoryId: data.categoryId,
        amount: new Prisma.Decimal(data.amount),
        year: data.year,
        month: data.month,
      },
      update: { amount: new Prisma.Decimal(data.amount) },
    });
  }

  async monthlyStatus(userId: string, year: number, month: number): Promise<BudgetStatusRow[]> {
    const [categories, budgets, spentByCategory] = await Promise.all([
      this.prisma.category.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.budget.findMany({
        where: { userId, year, month },
        select: { categoryId: true, amount: true },
      }),
      this.spentByCategory(userId, year, month),
    ]);

    const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b.amount.toFixed(2)]));

    return categories.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      budget: budgetByCat.get(c.id) ?? null,
      spent: spentByCategory.get(c.id) ?? '0.00',
    }));
  }

  async categoryStatus(
    userId: string,
    categoryId: string,
    year: number,
    month: number,
  ): Promise<BudgetStatusRow | null> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true, name: true },
    });
    if (!category) {
      return null;
    }

    const [budget, spentByCategory] = await Promise.all([
      this.prisma.budget.findUnique({
        where: { categoryId_year_month: { categoryId, year, month } },
        select: { amount: true },
      }),
      this.spentByCategory(userId, year, month, categoryId),
    ]);

    return {
      categoryId: category.id,
      categoryName: category.name,
      budget: budget ? budget.amount.toFixed(2) : null,
      spent: spentByCategory.get(categoryId) ?? '0.00',
    };
  }

  /** Sum of EXPENSE movements per category within the calendar month. */
  private async spentByCategory(
    userId: string,
    year: number,
    month: number,
    categoryId?: string,
  ): Promise<Map<string, string>> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // exclusive
    const grouped = await this.prisma.financialMovement.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: categoryId ? categoryId : { not: null },
        occurredAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });

    const map = new Map<string, string>();
    for (const g of grouped) {
      if (g.categoryId) {
        map.set(g.categoryId, (g._sum.amount ?? new Prisma.Decimal(0)).toFixed(2));
      }
    }
    return map;
  }
}
