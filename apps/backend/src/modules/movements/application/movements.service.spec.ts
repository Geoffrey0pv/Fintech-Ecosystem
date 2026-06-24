import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { MovementsService } from './movements.service';
import {
  CreateMovementData,
  FindManyParams,
  MovementEntity,
  MovementRepositoryPort,
  UpdateMovementData,
} from './ports/movement.repository.port';

class InMemoryMovementRepo implements MovementRepositoryPort {
  rows: MovementEntity[] = [];
  ownedCategories = new Set<string>();

  async create(data: CreateMovementData): Promise<MovementEntity> {
    const row: MovementEntity = {
      id: randomUUID(),
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      ...data,
    };
    this.rows.push(row);
    return row;
  }
  async findByIdForUser(id: string, userId: string): Promise<MovementEntity | null> {
    return this.rows.find((r) => r.id === id && r.userId === userId) ?? null;
  }
  async findMany(params: FindManyParams): Promise<{ items: MovementEntity[]; total: number }> {
    const all = this.rows.filter((r) => r.userId === params.userId);
    const start = (params.page - 1) * params.limit;
    return { items: all.slice(start, start + params.limit), total: all.length };
  }
  async updateForUser(
    id: string,
    userId: string,
    data: UpdateMovementData,
  ): Promise<MovementEntity | null> {
    const row = await this.findByIdForUser(id, userId);
    if (!row) return null;
    Object.assign(row, data);
    return row;
  }
  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.id === id && r.userId === userId);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
  async balance(userId: string): Promise<{ totalIncome: string; totalExpense: string }> {
    const mine = this.rows.filter((r) => r.userId === userId);
    const sum = (t: string) =>
      mine
        .filter((r) => r.type === t)
        .reduce((acc, r) => acc + Number(r.amount), 0)
        .toFixed(2);
    return { totalIncome: sum('INCOME'), totalExpense: sum('EXPENSE') };
  }
  async categoryExistsForUser(categoryId: string): Promise<boolean> {
    return this.ownedCategories.has(categoryId);
  }
}

describe('MovementsService', () => {
  let repo: InMemoryMovementRepo;
  let service: MovementsService;
  const userId = 'user-1';

  beforeEach(() => {
    repo = new InMemoryMovementRepo();
    service = new MovementsService(repo);
  });

  describe('create', () => {
    it('creates an income without a category', async () => {
      const res = await service.create(userId, {
        type: 'INCOME',
        amount: '3200000',
        description: 'Salario',
        occurredAt: '2026-06-01',
      });
      expect(res.amount).toBe('3200000.00');
      expect(res.occurredAt).toBe('2026-06-01');
      expect(res.categoryId).toBeNull();
    });

    it('rejects a movement on a category the user does not own', async () => {
      await expect(
        service.create(userId, {
          type: 'EXPENSE',
          amount: '1000',
          description: 'x',
          categoryId: randomUUID(),
          occurredAt: '2026-06-01',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts a movement on an owned category', async () => {
      const categoryId = randomUUID();
      repo.ownedCategories.add(categoryId);
      const res = await service.create(userId, {
        type: 'EXPENSE',
        amount: '1000.50',
        description: 'x',
        categoryId,
        occurredAt: '2026-06-01',
      });
      expect(res.categoryId).toBe(categoryId);
    });

    it('rejects an invalid amount at the domain boundary', async () => {
      await expect(
        service.create(userId, {
          type: 'EXPENSE',
          amount: '1.999',
          description: 'x',
          occurredAt: '2026-06-01',
        }),
      ).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe('list', () => {
    it('returns pagination metadata', async () => {
      for (let i = 0; i < 25; i++) {
        await service.create(userId, {
          type: 'EXPENSE',
          amount: '10',
          description: `m${i}`,
          occurredAt: '2026-06-01',
        });
      }
      const result = await service.list(userId, {
        page: 2,
        limit: 20,
        sort: 'occurredAt',
        order: 'desc',
      });
      expect(result.data).toHaveLength(5);
      expect(result.meta).toEqual({
        pagination: { page: 2, limit: 20, totalItems: 25, totalPages: 2 },
      });
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.list(userId, {
          page: 1,
          limit: 20,
          sort: 'occurredAt',
          order: 'desc',
          startDate: '2026-06-30',
          endDate: '2026-06-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getById / update / remove isolation', () => {
    it("throws NotFound for another user's movement", async () => {
      const other = await service.create('user-2', {
        type: 'INCOME',
        amount: '5',
        description: 'x',
        occurredAt: '2026-06-01',
      });
      await expect(service.getById(userId, other.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.update(userId, other.id, { description: 'hacked' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(userId, other.id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('balance', () => {
    it('computes net balance as income minus expense', async () => {
      await service.create(userId, {
        type: 'INCOME',
        amount: '3200000',
        description: 'in',
        occurredAt: '2026-06-01',
      });
      await service.create(userId, {
        type: 'EXPENSE',
        amount: '1850000',
        description: 'out',
        occurredAt: '2026-06-02',
      });
      const balance = await service.balance(userId, {});
      expect(balance.totalIncome).toBe('3200000.00');
      expect(balance.totalExpense).toBe('1850000.00');
      expect(balance.balance).toBe('1350000.00');
      expect(balance.currency).toBe('COP');
    });
  });
});
