import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  BalanceTotals,
  CreateMovementData,
  FindManyParams,
  MovementEntity,
  MovementRepositoryPort,
  PaginatedMovements,
  UpdateMovementData,
} from '../../application/ports/movement.repository.port';

type MovementRow = {
  id: string;
  userId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: Prisma.Decimal;
  description: string;
  categoryId: string | null;
  occurredAt: Date;
  createdAt: Date;
};

@Injectable()
export class PrismaMovementRepository implements MovementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMovementData): Promise<MovementEntity> {
    const row = await this.prisma.financialMovement.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        description: data.description,
        categoryId: data.categoryId,
        occurredAt: data.occurredAt,
      },
    });
    return this.toEntity(row);
  }

  async findByIdForUser(id: string, userId: string): Promise<MovementEntity | null> {
    const row = await this.prisma.financialMovement.findFirst({ where: { id, userId } });
    return row ? this.toEntity(row) : null;
  }

  async findMany(params: FindManyParams): Promise<PaginatedMovements> {
    const where = this.buildWhere(params);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.financialMovement.findMany({
        where,
        orderBy: { [params.sort]: params.order },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.financialMovement.count({ where }),
    ]);
    return { items: rows.map((r) => this.toEntity(r)), total };
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateMovementData,
  ): Promise<MovementEntity | null> {
    // updateMany scopes by userId so a foreign id can never be touched.
    const { count } = await this.prisma.financialMovement.updateMany({
      where: { id, userId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.amount !== undefined ? { amount: new Prisma.Decimal(data.amount) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.occurredAt !== undefined ? { occurredAt: data.occurredAt } : {}),
      },
    });
    if (count === 0) {
      return null;
    }
    return this.findByIdForUser(id, userId);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.financialMovement.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async balance(userId: string, startDate?: Date, endDate?: Date): Promise<BalanceTotals> {
    const grouped = await this.prisma.financialMovement.groupBy({
      by: ['type'],
      where: { userId, occurredAt: this.dateFilter(startDate, endDate) },
      _sum: { amount: true },
    });
    const sumFor = (type: 'INCOME' | 'EXPENSE'): string => {
      const found = grouped.find((g) => g.type === type);
      return (found?._sum.amount ?? new Prisma.Decimal(0)).toFixed(2);
    };
    return { totalIncome: sumFor('INCOME'), totalExpense: sumFor('EXPENSE') };
  }

  async categoryExistsForUser(categoryId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.category.count({ where: { id: categoryId, userId } });
    return count > 0;
  }

  private buildWhere(params: FindManyParams): Prisma.FinancialMovementWhereInput {
    const { filters } = params;
    return {
      userId: params.userId, // mandatory tenant isolation
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.startDate || filters.endDate
        ? { occurredAt: this.dateFilter(filters.startDate, filters.endDate) }
        : {}),
    };
  }

  private dateFilter(startDate?: Date, endDate?: Date): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }
    return {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  private toEntity(row: MovementRow): MovementEntity {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      amount: row.amount.toFixed(2),
      description: row.description,
      categoryId: row.categoryId,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    };
  }
}
