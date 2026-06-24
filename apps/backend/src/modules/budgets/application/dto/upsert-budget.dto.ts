import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { MONEY_MESSAGE, POSITIVE_MONEY_REGEX } from '../../../../shared/application/validation';

export class UpsertBudgetDto {
  @IsString()
  @Matches(POSITIVE_MONEY_REGEX, { message: MONEY_MESSAGE })
  amount!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2999)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
