import { MovementType } from '@prisma/client';
import { MovementSortField } from '../dto/query-movements.dto';

export const MOVEMENT_REPOSITORY = Symbol('MOVEMENT_REPOSITORY');

export interface MovementEntity {
  id: string;
  userId: string;
  type: MovementType;
  amount: string; // exact decimal serialized as string
  description: string;
  categoryId: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface CreateMovementData {
  userId: string;
  type: MovementType;
  amount: string;
  description: string;
  categoryId: string | null;
  occurredAt: Date;
}

export interface UpdateMovementData {
  type?: MovementType;
  amount?: string;
  description?: string;
  categoryId?: string | null;
  occurredAt?: Date;
}

export interface MovementFilters {
  type?: MovementType;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface FindManyParams {
  userId: string;
  filters: MovementFilters;
  page: number;
  limit: number;
  sort: MovementSortField;
  order: 'asc' | 'desc';
}

export interface PaginatedMovements {
  items: MovementEntity[];
  total: number;
}

export interface BalanceTotals {
  totalIncome: string;
  totalExpense: string;
}

export interface MovementRepositoryPort {
  create(data: CreateMovementData): Promise<MovementEntity>;
  findByIdForUser(id: string, userId: string): Promise<MovementEntity | null>;
  findMany(params: FindManyParams): Promise<PaginatedMovements>;
  /** Returns the updated entity, or null if it does not belong to the user. */
  updateForUser(
    id: string,
    userId: string,
    data: UpdateMovementData,
  ): Promise<MovementEntity | null>;
  /** Returns true if a row was deleted (i.e. it belonged to the user). */
  deleteForUser(id: string, userId: string): Promise<boolean>;
  balance(userId: string, startDate?: Date, endDate?: Date): Promise<BalanceTotals>;
  /** Tenant-safe check that a category exists and belongs to the user. */
  categoryExistsForUser(categoryId: string, userId: string): Promise<boolean>;
}
