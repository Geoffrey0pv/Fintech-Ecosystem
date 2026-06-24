import { MovementType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MONEY_MESSAGE, POSITIVE_MONEY_REGEX } from '../../../../shared/application/validation';

export class CreateMovementDto {
  @IsEnum(MovementType, { message: 'type must be INCOME or EXPENSE' })
  type!: MovementType;

  // Money as string to preserve precision over the wire.
  @IsString()
  @Matches(POSITIVE_MONEY_REGEX, { message: MONEY_MESSAGE })
  amount!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  // ISO date (e.g. "2026-06-23").
  @IsDateString({}, { message: 'occurredAt must be an ISO date' })
  occurredAt!: string;
}
