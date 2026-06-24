import { IsDateString, IsOptional } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
