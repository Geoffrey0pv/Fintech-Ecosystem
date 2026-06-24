import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * year/month are optional; the service defaults to the current month when absent.
 */
export class BudgetStatusQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2999)
  @IsOptional()
  year?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;
}
