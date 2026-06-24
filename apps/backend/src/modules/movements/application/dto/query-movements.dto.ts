import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const MOVEMENT_SORT_FIELDS = ['occurredAt', 'amount', 'createdAt'] as const;
export type MovementSortField = (typeof MOVEMENT_SORT_FIELDS)[number];

export class QueryMovementsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @IsIn(MOVEMENT_SORT_FIELDS)
  @IsOptional()
  sort: MovementSortField = 'occurredAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
