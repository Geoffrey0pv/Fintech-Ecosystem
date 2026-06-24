import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { Money } from '../../../shared/domain/value-objects/money.vo';
import { MetaEnvelope } from '../../../shared/application/meta-envelope';
import {
  BUDGET_ALERT_PROVIDER,
  BudgetAlert,
  BudgetAlertProvider,
} from '../../../shared/application/ports/budget-alert.port';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { BalanceQueryDto } from './dto/balance-query.dto';
import {
  MOVEMENT_REPOSITORY,
  MovementEntity,
  MovementRepositoryPort,
} from './ports/movement.repository.port';

export interface MovementResponse {
  id: string;
  type: MovementType;
  amount: string;
  description: string;
  categoryId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface BalanceResponse {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  currency: 'COP';
  period: { startDate: string | null; endDate: string | null };
}

@Injectable()
export class MovementsService {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly repo: MovementRepositoryPort,
    @Inject(BUDGET_ALERT_PROVIDER) private readonly alerts: BudgetAlertProvider,
  ) {}

  async create(userId: string, dto: CreateMovementDto): Promise<MetaEnvelope<MovementResponse>> {
    await this.assertCategory(userId, dto.categoryId);
    const entity = await this.repo.create({
      userId,
      type: dto.type,
      amount: Money.fromString(dto.amount).toString(),
      description: dto.description,
      categoryId: dto.categoryId ?? null,
      occurredAt: this.parseDate(dto.occurredAt),
    });
    return this.withAlerts(userId, entity);
  }

  async list(userId: string, query: QueryMovementsDto): Promise<MetaEnvelope<MovementResponse[]>> {
    const { startDate, endDate } = this.parseRange(query.startDate, query.endDate);
    const { items, total } = await this.repo.findMany({
      userId,
      filters: { type: query.type, categoryId: query.categoryId, startDate, endDate },
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    });
    return new MetaEnvelope(
      items.map((m) => this.toResponse(m)),
      {
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    );
  }

  async getById(userId: string, id: string): Promise<MovementResponse> {
    const entity = await this.repo.findByIdForUser(id, userId);
    if (!entity) {
      throw new NotFoundException('Movement not found');
    }
    return this.toResponse(entity);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMovementDto,
  ): Promise<MetaEnvelope<MovementResponse>> {
    if (dto.categoryId !== undefined) {
      await this.assertCategory(userId, dto.categoryId);
    }
    const entity = await this.repo.updateForUser(id, userId, {
      type: dto.type,
      amount: dto.amount !== undefined ? Money.fromString(dto.amount).toString() : undefined,
      description: dto.description,
      categoryId: dto.categoryId,
      occurredAt: dto.occurredAt !== undefined ? this.parseDate(dto.occurredAt) : undefined,
    });
    if (!entity) {
      throw new NotFoundException('Movement not found');
    }
    return this.withAlerts(userId, entity);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.deleteForUser(id, userId);
    if (!deleted) {
      throw new NotFoundException('Movement not found');
    }
  }

  async balance(userId: string, query: BalanceQueryDto): Promise<BalanceResponse> {
    const { startDate, endDate } = this.parseRange(query.startDate, query.endDate);
    const totals = await this.repo.balance(userId, startDate, endDate);
    const income = Money.fromString(totals.totalIncome);
    const expense = Money.fromString(totals.totalExpense);
    return {
      totalIncome: income.toString(),
      totalExpense: expense.toString(),
      balance: income.subtract(expense).toString(),
      currency: 'COP',
      period: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  /**
   * Wraps a movement in the envelope and, for expenses on a budgeted category,
   * injects the budget alert (WARNING_80 / CRITICAL_100) into meta (SPEC 4.3).
   */
  private async withAlerts(
    userId: string,
    entity: MovementEntity,
  ): Promise<MetaEnvelope<MovementResponse>> {
    const budgetAlerts: BudgetAlert[] = [];
    if (entity.type === 'EXPENSE' && entity.categoryId) {
      const alert = await this.alerts.getAlertForExpense(
        userId,
        entity.categoryId,
        entity.occurredAt,
      );
      if (alert) {
        budgetAlerts.push(alert);
      }
    }
    return new MetaEnvelope(this.toResponse(entity), { budgetAlerts });
  }

  private async assertCategory(userId: string, categoryId?: string): Promise<void> {
    if (!categoryId) {
      return;
    }
    const exists = await this.repo.categoryExistsForUser(categoryId, userId);
    if (!exists) {
      // 404 (not 403) so we never reveal another user's category ids.
      throw new NotFoundException('Category not found');
    }
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return date;
  }

  private parseRange(start?: string, end?: string): { startDate?: Date; endDate?: Date } {
    const startDate = start ? this.parseDate(start) : undefined;
    const endDate = end ? this.parseDate(end) : undefined;
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
    return { startDate, endDate };
  }

  private toResponse(entity: MovementEntity): MovementResponse {
    return {
      id: entity.id,
      type: entity.type,
      amount: entity.amount,
      description: entity.description,
      categoryId: entity.categoryId,
      occurredAt: entity.occurredAt.toISOString().slice(0, 10),
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
